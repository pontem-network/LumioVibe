import hashlib
import time
from typing import Any

import httpx
from nacl.signing import SigningKey

from openhands.core.logger import openhands_logger as logger

OCTAS_PER_COIN = 100_000_000


class LumioService:
    """Service for interacting with Lumio blockchain API."""

    def __init__(
        self, rpc_url: str, contract_address: str, admin_private_key: str | None = None
    ):
        self.rpc_url = rpc_url.rstrip('/')
        self.contract_address = contract_address
        self.admin_private_key = admin_private_key
        self._admin_address: str | None = None
        self._admin_signing_key: SigningKey | None = None

        if admin_private_key:
            self._init_admin_key(admin_private_key)

    async def is_whitelisted(self, user_address: str) -> bool:
        """Check if a user address is whitelisted in the vibe-balance contract.

        Args:
            user_address: The user's wallet address (hex string with or without 0x prefix)

        Returns:
            True if the user is whitelisted, False otherwise
        """
        if not self.contract_address:
            logger.error(
                'VIBE_BALANCE_CONTRACT not configured - whitelist check failed (fail-closed)'
            )
            return False

        # Normalize address format
        if not user_address.startswith('0x'):
            user_address = f'0x{user_address}'

        url = f'{self.rpc_url}/v1/view'
        payload = {
            'function': f'{self.contract_address}::vibe_balance::is_whitelisted',
            'type_arguments': [],
            'arguments': [user_address],
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                response.raise_for_status()
                result = response.json()
                # The result should be [true] or [false]
                if isinstance(result, list) and len(result) > 0:
                    return bool(result[0])
                return False
        except httpx.HTTPStatusError as e:
            logger.error(
                f'Lumio API HTTP error: {e.response.status_code} - {e.response.text}'
            )
            return False
        except httpx.RequestError as e:
            logger.error(f'Lumio API request error: {e}')
            return False
        except Exception as e:
            logger.error(f'Unexpected error checking whitelist: {e}')
            return False

    async def get_balance(self, user_address: str) -> int:
        """Get user's balance from the vibe-balance contract.

        Args:
            user_address: The user's wallet address

        Returns:
            User's balance as integer, 0 if not found or error
        """
        if not self.contract_address:
            logger.warning('VIBE_BALANCE_CONTRACT not configured')
            return 0

        if not user_address.startswith('0x'):
            user_address = f'0x{user_address}'

        url = f'{self.rpc_url}/v1/view'
        payload = {
            'function': f'{self.contract_address}::vibe_balance::get_balance',
            'type_arguments': [],
            'arguments': [user_address],
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                response.raise_for_status()
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    return int(result[0])
                return 0
        except Exception as e:
            logger.error(f'Error getting balance: {e}')
            return 0

    async def get_token_price(self) -> int:
        """Get token price per million from the contract.

        Returns:
            Price in octas per 1M tokens, default 10_000 if error
        """
        if not self.contract_address:
            return 10_000

        url = f'{self.rpc_url}/v1/view'
        payload = {
            'function': f'{self.contract_address}::vibe_balance::get_token_price',
            'type_arguments': [],
            'arguments': [],
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                response.raise_for_status()
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    return int(result[0])
                return 10_000
        except Exception as e:
            logger.error(f'Error getting token price: {e}')
            return 10_000

    def _init_admin_key(self, private_key_hex: str) -> None:
        """Initialize admin signing key from hex private key."""
        try:
            if private_key_hex.startswith('0x'):
                private_key_hex = private_key_hex[2:]
            private_key_bytes = bytes.fromhex(private_key_hex)
            self._admin_signing_key = SigningKey(private_key_bytes)

            public_key_bytes = self._admin_signing_key.verify_key.encode()
            hasher = hashlib.sha3_256()
            hasher.update(public_key_bytes)
            hasher.update(b'\x00')
            self._admin_address = f'0x{hasher.hexdigest()}'
            logger.info(f'Admin address initialized: {self._admin_address}')
        except Exception as e:
            logger.error(f'Failed to initialize admin key: {e}')

    async def _get_sequence_number(self, address: str) -> int:
        """Get account sequence number for transaction."""
        url = f'{self.rpc_url}/v1/accounts/{address}'
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return int(data.get('sequence_number', 0))
        except Exception as e:
            logger.error(f'Error getting sequence number: {e}')
            return 0

    async def _submit_transaction(self, payload: dict[str, Any]) -> bool:
        """Submit a signed transaction to the blockchain."""
        if not self._admin_signing_key or not self._admin_address:
            logger.error('Admin key not configured')
            return False

        try:
            seq_num = await self._get_sequence_number(self._admin_address)

            raw_txn = {
                'sender': self._admin_address,
                'sequence_number': str(seq_num),
                'max_gas_amount': '100000',
                'gas_unit_price': '100',
                'expiration_timestamp_secs': str(int(time.time()) + 600),
                'payload': payload,
            }

            encode_url = f'{self.rpc_url}/v1/transactions/encode_submission'
            async with httpx.AsyncClient() as client:
                encode_resp = await client.post(
                    encode_url, json=raw_txn, timeout=10.0
                )
                encode_resp.raise_for_status()
                encoded_hex = encode_resp.json()

                if encoded_hex.startswith('0x'):
                    encoded_hex = encoded_hex[2:]
                message_bytes = bytes.fromhex(encoded_hex)
                signed = self._admin_signing_key.sign(message_bytes)
                signature_hex = f'0x{signed.signature.hex()}'

                signed_txn = {
                    **raw_txn,
                    'signature': {
                        'type': 'ed25519_signature',
                        'public_key': f'0x{self._admin_signing_key.verify_key.encode().hex()}',
                        'signature': signature_hex,
                    },
                }

                submit_url = f'{self.rpc_url}/v1/transactions'
                submit_resp = await client.post(
                    submit_url, json=signed_txn, timeout=30.0
                )
                submit_resp.raise_for_status()
                result = submit_resp.json()
                txn_hash = result.get('hash', 'unknown')
                logger.info(f'Transaction submitted: {txn_hash}')
                return True

        except Exception as e:
            logger.error(f'Error submitting transaction: {e}')
            return False

    async def batch_deduct(
        self, users: list[str], tokens_amounts: list[int]
    ) -> bool:
        """Deduct tokens from users' balances.

        Args:
            users: List of user addresses
            tokens_amounts: List of token amounts to deduct

        Returns:
            True if transaction was submitted successfully, False otherwise
        """
        if not users or not tokens_amounts:
            return True

        if len(users) != len(tokens_amounts):
            logger.error('Users and amounts length mismatch')
            return False

        normalized_users = [
            u if u.startswith('0x') else f'0x{u}' for u in users
        ]
        str_amounts = [str(a) for a in tokens_amounts]

        payload = {
            'type': 'entry_function_payload',
            'function': f'{self.contract_address}::vibe_balance::batch_deduct',
            'type_arguments': [],
            'arguments': [normalized_users, str_amounts],
        }

        return await self._submit_transaction(payload)
