/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLET_MODE: string
  readonly VITE_BASE_URL: string
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_PRIVATE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
