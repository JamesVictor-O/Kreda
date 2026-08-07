from fastapi import APIRouter
from pydantic import BaseModel

from app.core.models import SignedDecision
from app.stages.check import run_checks
from app.stages.commit import sign_decision
from app.stages.decide import decide
from app.stages.ingest import ingest

router = APIRouter()


class UnderwriteRequest(BaseModel):
    receivable_id: str
    seller_address: str


@router.post("/underwrite", response_model=SignedDecision)
async def underwrite(request: UnderwriteRequest) -> SignedDecision:
    store_data = await ingest(request.seller_address)
    checks = run_checks(store_data)
    decision = decide(request.receivable_id, store_data, checks)
    return sign_decision(decision)
