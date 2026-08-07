from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    testnet_rpc_url: str = "https://rpc.bohr.life"
    mainnet_rpc_url: str = "https://rpc.botchain.ai"
    chain_id: int = 968

    agent_private_key: str = ""
    attestation_contract_address: str = ""
    agent_registry_contract_address: str = ""

    shopify_store_domain: str = ""
    shopify_admin_access_token: str = ""


settings = Settings()
