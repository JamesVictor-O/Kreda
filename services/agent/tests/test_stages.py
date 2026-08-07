from app.core.models import Outcome, StoreData
from app.stages.check import run_checks
from app.stages.decide import decide


def _store_data(fulfilled_ratio: float, total: int = 10) -> StoreData:
    orders = [{"id": i} for i in range(total)]
    fulfilled_count = round(total * fulfilled_ratio)
    fulfilled = [{"id": i, "fulfillment_status": "fulfilled"} for i in range(fulfilled_count)]
    return StoreData(
        seller_address="0xSeller",
        shop_domain="test-shop.myshopify.com",
        orders_90d=orders,
        fulfilled_orders_90d=fulfilled,
    )


def test_checks_pass_with_good_fulfilment() -> None:
    checks = run_checks(_store_data(fulfilled_ratio=0.9))
    assert all(c.passed for c in checks)


def test_checks_fail_with_low_fulfilment() -> None:
    checks = run_checks(_store_data(fulfilled_ratio=0.3))
    fulfilment_check = next(c for c in checks if c.name == "fulfilment_rate")
    assert not fulfilment_check.passed


def test_decide_approves_when_all_checks_pass() -> None:
    store_data = _store_data(fulfilled_ratio=1.0)
    checks = run_checks(store_data)
    decision = decide("receivable-1", store_data, checks)
    assert decision.outcome is Outcome.APPROVED
    assert decision.confidence_bps == 10_000
    assert decision.advance_rate_bps == 8_000


def test_decide_declines_is_first_class_output() -> None:
    store_data = _store_data(fulfilled_ratio=0.0)
    checks = run_checks(store_data)
    decision = decide("receivable-2", store_data, checks)
    assert decision.outcome is Outcome.DECLINED
    assert decision.advance_rate_bps is None
    assert decision.evidence_hash.startswith("0x")
