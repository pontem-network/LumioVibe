import hashlib
import secrets
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey
from pydantic import BaseModel

from openhands.core.logger import openhands_logger as logger
from openhands.server.dependencies import get_dependencies
from openhands.server.services.lumio_service import LumioService
from openhands.server.shared import balance_manager, server_config
from openhands.server.user_auth import get_user_settings_store
from openhands.server.user_auth.default_user_auth import DefaultUserAuth
from openhands.storage.data_models.settings import AuthWallet, Settings
from openhands.storage.session import (
    delete_session_file,
    get_session_id_from_usid_token,
)
from openhands.storage.settings.settings_store import SettingsStore

app = APIRouter(prefix='/api/token', dependencies=get_dependencies())


def get_lumio_service() -> LumioService:
    """Get configured LumioService instance."""
    return LumioService(
        rpc_url=server_config.lumio_rpc_url,
        contract_address=server_config.vibe_balance_contract,
        admin_private_key=server_config.vibe_admin_private_key or None,
    )


class SignToken(BaseModel):
    address: str | None = None
    application: str | None = None
    chainId: int | str | None = None
    fullMessage: str | None = None
    nonce: str | None = None
    prefix: str | None = None
    message: str | None = None
    signature: list[int] | None = None
    publicKey: str | None = None


def verify_public_key_matches_address(public_key_hex: str, address_hex: str) -> bool:
    """Verify that public key corresponds to the given address.

    In Aptos/Lumio, the address is derived from the public key using:
    address = sha3_256(public_key | 0x00) where 0x00 is the single-key scheme identifier.

    Args:
        public_key_hex: The public key in hex format (with or without 0x prefix)
        address_hex: The address in hex format (with or without 0x prefix)

    Returns:
        True if public key matches address, False otherwise
    """
    try:
        # Normalize hex strings
        if public_key_hex.startswith('0x'):
            public_key_hex = public_key_hex[2:]
        if address_hex.startswith('0x'):
            address_hex = address_hex[2:]

        public_key_bytes = bytes.fromhex(public_key_hex)

        # Aptos single-key scheme: sha3_256(public_key || 0x00)
        hasher = hashlib.sha3_256()
        hasher.update(public_key_bytes)
        hasher.update(b'\x00')  # Single-key scheme identifier
        derived_address = hasher.hexdigest()

        return derived_address.lower() == address_hex.lower()
    except Exception as e:
        logger.error(f'Error verifying public key matches address: {e}')
        return False


def verify_ed25519_signature(
    message: str,
    signature: list[int],
    public_key_hex: str,
) -> bool:
    """Verify ed25519 signature from Pontem wallet.

    Args:
        message: The full message that was signed
        signature: The signature as list of bytes
        public_key_hex: The public key in hex format (with or without 0x prefix)

    Returns:
        True if signature is valid, False otherwise
    """
    try:
        # Convert signature list to bytes
        signature_bytes = bytes(signature)

        # Remove 0x prefix if present and convert to bytes
        if public_key_hex.startswith('0x'):
            public_key_hex = public_key_hex[2:]
        public_key_bytes = bytes.fromhex(public_key_hex)

        # Create verify key and verify
        verify_key = VerifyKey(public_key_bytes)
        verify_key.verify(message.encode('utf-8'), signature_bytes)
        return True
    except BadSignatureError:
        logger.warning('Invalid signature')
        return False
    except Exception as e:
        logger.error(f'Error verifying signature: {e}')
        return False


@app.post('/new')
async def new_token(
    request: Request,
    token: AuthWallet,
) -> AuthWallet:
    if not token.account:
        raise HTTPException(status_code=400, detail='Account address is required')

    # Check whitelist
    lumio_service = get_lumio_service()
    is_whitelisted = await lumio_service.is_whitelisted(token.account)
    if not is_whitelisted:
        raise HTTPException(status_code=403, detail='Account is not whitelisted')

    session = await request.state.session.get_session()
    session['user_id'] = token.account
    await request.state.session.save_session()

    user_auth = DefaultUserAuth(user_id=token.account)
    user_settings_store: SettingsStore = await user_auth.get_user_settings_store()
    user_setting: Settings = (await user_settings_store.load()) or Settings()

    """Create a new authentication token for wallet."""
    user_setting.wallet = AuthWallet()
    user_setting.wallet.account = token.account
    user_setting.wallet.token = str(uuid.uuid4())
    user_setting.wallet.created_at = time.time()
    user_setting.wallet.nonce = secrets.token_hex(16)  # 32 character hex string
    await user_settings_store.store(user_setting)

    return user_setting.wallet


@app.post('/verify')
async def verify_token(
    sign_token: SignToken,
    user_settings_store: SettingsStore = Depends(get_user_settings_store),
) -> AuthWallet:
    """Verify the signed token from wallet."""

    if sign_token.message is None:
        raise HTTPException(status_code=400, detail='Message is required')

    if sign_token.signature is None:
        raise HTTPException(status_code=400, detail='Signature is required')

    if sign_token.address is None:
        raise HTTPException(status_code=400, detail='Address is required')

    if sign_token.publicKey is None:
        raise HTTPException(status_code=400, detail='Public key is required')

    # Verify that public key corresponds to the claimed address
    if not verify_public_key_matches_address(sign_token.publicKey, sign_token.address):
        logger.warning(
            f'Public key does not match address: pk={sign_token.publicKey}, addr={sign_token.address}'
        )
        raise HTTPException(status_code=400, detail='Public key does not match address')

    input_token = AuthWallet.model_validate_json(sign_token.message)
    user_setting: Settings | None = await user_settings_store.load()
    if user_setting is None:
        raise HTTPException(status_code=500, detail='Settings not found')

    # Verify token matches stored token
    if user_setting.wallet.token is None or user_setting.wallet != input_token:
        raise HTTPException(status_code=500, detail='Invalid token')

    # Verify nonce matches server-generated nonce
    if (
        user_setting.wallet.nonce is None
        or sign_token.nonce != user_setting.wallet.nonce
    ):
        logger.warning(
            f'Nonce mismatch: expected {user_setting.wallet.nonce}, got {sign_token.nonce}'
        )
        input_token.verified_token = False
        return input_token

    # Verify signature using public key
    full_message = sign_token.fullMessage or sign_token.message
    if not verify_ed25519_signature(
        message=full_message,
        signature=sign_token.signature,
        public_key_hex=sign_token.publicKey,
    ):
        raise HTTPException(status_code=500, detail='Signature verification failed')

    user_setting.wallet.verified_token = True
    await user_settings_store.store(user_setting)

    return user_setting.wallet


@app.post('/status')
async def status_token(
    request: Request,
    input_token: AuthWallet,
    user_settings_store: SettingsStore = Depends(get_user_settings_store),
) -> AuthWallet:
    """Check the status of an authentication token."""
    user_setting: Settings = await user_settings_store.load() or Settings()

    if user_setting.wallet != input_token:
        input_token.verified_token = False
        return input_token

    # Check if token has expired
    if user_setting.wallet.is_expired():
        logger.info(f'Token expired for account: {user_setting.wallet.account}')
        user_setting.wallet.verified_token = False
        await user_settings_store.store(user_setting)
        return user_setting.wallet

    # Re-check whitelist status
    if user_setting.wallet.account:
        lumio_service = get_lumio_service()
        is_whitelisted = await lumio_service.is_whitelisted(user_setting.wallet.account)
        if not is_whitelisted:
            logger.info(
                f'Account removed from whitelist: {user_setting.wallet.account}'
            )
            user_setting.wallet.verified_token = False
            await user_settings_store.store(user_setting)
            return user_setting.wallet

    return user_setting.wallet


@app.delete('')
async def delete_token(
    request: Request,
    user_settings_store: SettingsStore = Depends(get_user_settings_store),
) -> bool:
    """Delete the current authentication token."""
    user_setting: Settings | None = await user_settings_store.load()

    if user_setting is None:
        raise HTTPException(status_code=500, detail='Settings not found')

    user_setting.wallet = AuthWallet()
    await user_settings_store.store(user_setting)

    usid = request.cookies.get('usid')
    session_id = get_session_id_from_usid_token(usid)

    if session_id is not None:
        delete_session_file(session_id)

    await request.state.session.clear_session()

    return True


class BalanceResponse(BaseModel):
    on_chain_balance: int
    on_chain_balance_coins: float
    accumulated_tokens: int
    pending_deduction_octas: int
    pending_deduction_coins: float
    virtual_balance: int
    virtual_balance_coins: float
    token_price_per_million: int


@app.get('/balance')
async def get_balance(
    user_settings_store: SettingsStore = Depends(get_user_settings_store),
) -> BalanceResponse:
    """Get user's current balance and usage stats."""
    user_setting: Settings | None = await user_settings_store.load()

    if user_setting is None or not user_setting.wallet.account:
        raise HTTPException(status_code=401, detail='Not authenticated')

    user_address = user_setting.wallet.account

    await balance_manager.initialize()

    if balance_manager.get_cached_balance(user_address) is None:
        await balance_manager.refresh_balance(user_address)

    stats = balance_manager.get_stats(user_address)
    return BalanceResponse(**stats)


@app.get('/balance/refresh')
async def refresh_balance(
    user_settings_store: SettingsStore = Depends(get_user_settings_store),
) -> BalanceResponse:
    """Refresh user's balance from blockchain."""
    user_setting: Settings | None = await user_settings_store.load()

    if user_setting is None or not user_setting.wallet.account:
        raise HTTPException(status_code=401, detail='Not authenticated')

    user_address = user_setting.wallet.account

    await balance_manager.initialize()
    await balance_manager.refresh_balance(user_address)

    stats = balance_manager.get_stats(user_address)
    return BalanceResponse(**stats)
