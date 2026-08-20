from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    testnet_rpc_url: str = "https://rpc.bohr.life"
    mainnet_rpc_url: str = "https://rpc.botchain.ai"
    chain_id: int = 968

    # "fixture" (default) or "shopify" — see app/data_provider. Fixture is
    # what the demo and tests run against; Shopify's custom-app token flow
    # is unverified against a live store, see app/shopify/client.py.
    data_provider: str = Field(default="fixture", validation_alias="KREDA_DATA_PROVIDER")
    fixture_data_dir: str = "tests/fixtures/generated"

    # Comma-separated origins the browser is allowed to call this API from —
    # set to the deployed frontend's actual origin(s) in production, not "*":
    # the underwrite endpoint isn't cookie-authenticated, but a wide-open
    # CORS policy still lets any site drive it from a visitor's browser.
    cors_allowed_origins_raw: str = Field(
        default="http://localhost:3000", validation_alias="CORS_ALLOWED_ORIGINS"
    )

    @property
    def cors_allowed_origins(self) -> list[str]:
        origins = self.cors_allowed_origins_raw.split(",")
        return [origin.strip() for origin in origins if origin.strip()]

    agent_private_key: str = ""
    attestation_contract_address: str = ""
    agent_registry_contract_address: str = ""

    shopify_store_domain: str = ""
    shopify_admin_access_token: str = ""
    shopify_api_version: str = "2025-01"

    # Stage 3 — decide. "anthropic" (default) or "venice" — see
    # app/llm/client.py. Only the selected provider's key needs to be set;
    # the SDK/httpx call also picks up ANTHROPIC_API_KEY directly for
    # anthropic rather than routing it through settings.
    llm_provider: str = "anthropic"
    anthropic_model: str = "claude-opus-5"
    venice_api_key: str = ""
    # "llama-3-3-70b" per Venice's docs (a "suggested migration target");
    # verify against Venice's own /models listing before relying on it.
    venice_model: str = "llama-3-3-70b"

    # Stage 4 — commit. "calldata_hash_tree" is the default because whether
    # chain 677 accepts user-submitted blob transactions is an open question
    # per CLAUDE.md — see app/chain/blob.py.
    evidence_commitment_method: str = "calldata_hash_tree"

    # Durable mirror + ingestion snapshot cache. Filesystem by default —
    # good enough for a single-instance deploy; swap the store/cache
    # implementations behind their interfaces for anything bigger.
    evidence_store_dir: str = "./data/evidence"
    snapshot_cache_dir: str = "./data/snapshots"
    snapshot_cache_max_age_seconds: int = 3_600

    ingest_window_days: int = 90

    # Attestation.Record.faceValue is a raw uint256 in the settlement
    # stablecoin's smallest unit, not human dollars — scale by this before
    # signing. Defaults to USDC's 6 decimals; override per deployed asset.
    stablecoin_decimals: int = 6


settings = Settings()
