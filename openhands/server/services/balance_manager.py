import asyncio
from typing import TYPE_CHECKING

from openhands.core.logger import openhands_logger as logger

if TYPE_CHECKING:
    from openhands.server.services.lumio_service import LumioService

OCTAS_PER_COIN = 100_000_000
FLUSH_INTERVAL_SECONDS = 30


class BalanceManager:
    """Manages user balances with in-memory caching and batched deductions."""

    _instance: 'BalanceManager | None' = None

    def __init__(self, lumio_service: 'LumioService'):
        self.lumio_service = lumio_service
        self._balances: dict[str, int] = {}
        self._accumulated_tokens: dict[str, int] = {}
        self._token_price: int = 10_000
        self._initialized: bool = False
        self._lock = asyncio.Lock()
        self._flush_task: asyncio.Task | None = None
        self._running: bool = False

    @classmethod
    def get_instance(cls, lumio_service: 'LumioService') -> 'BalanceManager':
        """Get or create singleton instance."""
        if cls._instance is None:
            cls._instance = cls(lumio_service)
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset singleton (for testing)."""
        if cls._instance:
            cls._instance.stop()
        cls._instance = None

    async def initialize(self) -> None:
        """Initialize by fetching token price and starting flush task."""
        if self._initialized:
            return
        async with self._lock:
            if self._initialized:  # Double-check after acquiring lock
                return  # type: ignore[unreachable]
            self._token_price = await self.lumio_service.get_token_price()
            self._initialized = True
            self._start_flush_task()
            logger.info(f'BalanceManager initialized with price: {self._token_price}')

    def _start_flush_task(self) -> None:
        """Start background task for periodic batch deductions."""
        if self._flush_task is None or self._flush_task.done():
            self._running = True
            self._flush_task = asyncio.create_task(self._periodic_flush())
            logger.info('Started periodic flush task')

    def stop(self) -> None:
        """Stop the background flush task."""
        self._running = False
        if self._flush_task and not self._flush_task.done():
            self._flush_task.cancel()
            logger.info('Stopped periodic flush task')

    async def _periodic_flush(self) -> None:
        """Background task that flushes deductions every FLUSH_INTERVAL_SECONDS."""
        while self._running:
            try:
                await asyncio.sleep(FLUSH_INTERVAL_SECONDS)
                await self._flush_all_deductions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f'Error in periodic flush: {e}')

    def _normalize_address(self, address: str) -> str:
        """Normalize address to have 0x prefix."""
        if not address.startswith('0x'):
            return f'0x{address}'
        return address

    async def refresh_balance(self, user_address: str) -> int:
        """Fetch and cache balance from blockchain."""
        user_address = self._normalize_address(user_address)
        balance = await self.lumio_service.get_balance(user_address)
        self._balances[user_address] = balance
        logger.debug(f'Refreshed balance for {user_address}: {balance}')
        return balance

    def get_cached_balance(self, user_address: str) -> int | None:
        """Get cached on-chain balance (None if not cached)."""
        user_address = self._normalize_address(user_address)
        return self._balances.get(user_address)

    def get_accumulated_tokens(self, user_address: str) -> int:
        """Get accumulated tokens not yet deducted on-chain."""
        user_address = self._normalize_address(user_address)
        return self._accumulated_tokens.get(user_address, 0)

    def calculate_virtual_balance(self, user_address: str) -> int:
        """Calculate virtual balance = on_chain - pending_deduction."""
        user_address = self._normalize_address(user_address)
        on_chain = self._balances.get(user_address, 0)
        accumulated = self._accumulated_tokens.get(user_address, 0)
        pending_coins = (accumulated * self._token_price) // 1_000_000
        virtual = max(0, on_chain - pending_coins)
        return virtual

    async def get_balance(self, user_address: str) -> int:
        """Get virtual balance, refreshing from chain if not cached."""
        await self.initialize()
        user_address = self._normalize_address(user_address)

        if user_address not in self._balances:
            await self.refresh_balance(user_address)

        return self.calculate_virtual_balance(user_address)

    def check_balance(self, user_address: str) -> bool:
        """Check if user has positive virtual balance."""
        user_address = self._normalize_address(user_address)

        if user_address not in self._balances:
            return True

        virtual = self.calculate_virtual_balance(user_address)
        return virtual > 0

    def add_tokens(self, user_address: str, tokens: int) -> None:
        """Add tokens to accumulated usage (call after LLM completion)."""
        user_address = self._normalize_address(user_address)
        current = self._accumulated_tokens.get(user_address, 0)
        self._accumulated_tokens[user_address] = current + tokens
        logger.debug(
            f'Added {tokens} tokens for {user_address}, total: {current + tokens}'
        )

    async def _flush_all_deductions(self) -> None:
        """Flush all accumulated deductions in a single batch transaction."""
        async with self._lock:
            users_to_deduct: list[str] = []
            tokens_to_deduct: list[int] = []

            for user_address, tokens in list(self._accumulated_tokens.items()):
                if tokens <= 0:
                    continue
                coins = (tokens * self._token_price) // 1_000_000
                if coins > 0:
                    users_to_deduct.append(user_address)
                    tokens_to_deduct.append(tokens)

            if not users_to_deduct:
                return

            logger.info(
                f'Batch flushing {len(users_to_deduct)} users: '
                f'{sum(tokens_to_deduct)} total tokens'
            )

            success = await self.lumio_service.batch_deduct(
                users_to_deduct, tokens_to_deduct
            )

            if success:
                for user_address, tokens in zip(users_to_deduct, tokens_to_deduct):
                    self._accumulated_tokens[user_address] = 0
                    coins = (tokens * self._token_price) // 1_000_000
                    if user_address in self._balances:
                        self._balances[user_address] = max(
                            0, self._balances[user_address] - coins
                        )

    async def schedule_deduction(self, user_address: str, tokens: int) -> None:
        """Add tokens to pending deductions (will be flushed periodically)."""
        self.add_tokens(user_address, tokens)

    def get_token_price(self) -> int:
        """Get cached token price (octas per 1M tokens)."""
        return self._token_price

    def get_stats(self, user_address: str) -> dict:
        """Get balance stats for a user."""
        user_address = self._normalize_address(user_address)
        on_chain = self._balances.get(user_address, 0)
        accumulated = self._accumulated_tokens.get(user_address, 0)
        pending_coins = (accumulated * self._token_price) // 1_000_000
        virtual = max(0, on_chain - pending_coins)

        return {
            'on_chain_balance': on_chain,
            'on_chain_balance_coins': on_chain / OCTAS_PER_COIN,
            'accumulated_tokens': accumulated,
            'pending_deduction_octas': pending_coins,
            'pending_deduction_coins': pending_coins / OCTAS_PER_COIN,
            'virtual_balance': virtual,
            'virtual_balance_coins': virtual / OCTAS_PER_COIN,
            'token_price_per_million': self._token_price,
        }
