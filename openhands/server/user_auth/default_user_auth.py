from dataclasses import dataclass
from typing import Any,Optional

from fastapi import Request
from pydantic import SecretStr

from openhands.integrations.provider import PROVIDER_TOKEN_TYPE
from openhands.server import shared
from openhands.server.settings import Settings
from openhands.server.user_auth.user_auth import UserAuth
from openhands.storage.data_models.secrets import Secrets
from openhands.storage.secrets.secrets_store import SecretsStore
from openhands.storage.settings.settings_store import SettingsStore


@dataclass
class DefaultUserAuth(UserAuth):
    """Default user authentication mechanism"""
    user_id: str | None = None
    settings: Settings | None = None
    settings_store: SettingsStore | None = None
    _secrets_store: SecretsStore | None = None
    _secrets: Secrets | None = None

    async def get_user_id(self) -> str | None:
        return self.user_id

    async def get_user_email(self) -> str | None:
        """The default implementation does not support multi tenancy, so email is always None"""
        return None

    async def get_access_token(self) -> SecretStr | None:
        """The default implementation does not support multi tenancy, so access_token is always None"""
        return None

    async def get_user_settings_store(self) -> SettingsStore:
        settings_store = self.settings_store
        if settings_store:
            return settings_store
        user_id = await self.get_user_id()
        settings_store = await shared.SettingsStoreImpl.get_instance(
            shared.config, user_id
        )
        if settings_store is None:
            raise ValueError('Failed to get settings store instance')

        self.settings_store = settings_store
        return settings_store

    async def get_user_settings(self) -> Settings | None:
        if self.settings:
            return self.settings

        settings_store = await self.get_user_settings_store()
        settings: Settings = (await settings_store.load()) or Settings()


        # Merge config.toml settings with stored settings
        if settings:
            settings = settings.merge_with_config_settings()

        self.settings = settings
        return settings

    async def get_secrets_store(self) -> SecretsStore:
        secrets_store = self._secrets_store
        if secrets_store:
            return secrets_store
        user_id = await self.get_user_id()
        secret_store = await shared.SecretsStoreImpl.get_instance(
            shared.config, user_id
        )
        if secret_store is None:
            raise ValueError('Failed to get secrets store instance')
        self._secrets_store = secret_store
        return secret_store

    async def get_secrets(self) -> Secrets | None:
        user_secrets = self._secrets
        if user_secrets:
            return user_secrets
        secrets_store = await self.get_secrets_store()
        user_secrets = await secrets_store.load()
        self._secrets = user_secrets
        return user_secrets

    async def get_provider_tokens(self) -> PROVIDER_TOKEN_TYPE | None:
        user_secrets = await self.get_secrets()
        if user_secrets is None:
            return None
        return user_secrets.provider_tokens

    async def get_mcp_api_key(self) -> str | None:
        return None

    @classmethod
    async def get_instance(cls, request: Request) -> UserAuth:
        session = await request.state.session.get_session()

        return DefaultUserAuth(user_id=session.get('user_id'))

    @classmethod
    async def get_for_user(cls, user_id: str) -> UserAuth:
        assert user_id == 'root'
        return DefaultUserAuth(user_id=user_id)
