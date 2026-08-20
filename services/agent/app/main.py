import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings

app = FastAPI(title="Kreda underwriter agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/config")
async def health_config() -> dict[str, bool | str | int]:
    """Whether required config is present, never the values themselves —
    for verifying a deploy's environment without exposing secrets. Cheap
    to leave in: booleans and non-sensitive settings only."""
    return {
        "data_provider": settings.data_provider,
        "llm_provider": settings.llm_provider,
        "chain_id": settings.chain_id,
        "agent_private_key_set": bool(settings.agent_private_key),
        "attestation_contract_address_set": bool(settings.attestation_contract_address),
        "agent_registry_contract_address_set": bool(settings.agent_registry_contract_address),
        "anthropic_api_key_set": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "venice_api_key_set": bool(settings.venice_api_key),
        "cors_allowed_origins": ",".join(settings.cors_allowed_origins),
    }
