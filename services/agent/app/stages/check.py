"""Stage 2: cross-check ingested sales data against fulfilment records."""

from app.core.models import CheckResult, StoreData


def run_checks(store_data: StoreData) -> list[CheckResult]:
    return [
        _check_has_order_history(store_data),
        _check_fulfilment_rate(store_data),
    ]


def _check_has_order_history(store_data: StoreData) -> CheckResult:
    passed = len(store_data.orders_90d) > 0
    return CheckResult(
        name="order_history",
        passed=passed,
        detail=f"{len(store_data.orders_90d)} orders in the last 90 days",
    )


def _check_fulfilment_rate(store_data: StoreData) -> CheckResult:
    total = len(store_data.orders_90d)
    fulfilled = len(store_data.fulfilled_orders_90d)
    rate = fulfilled / total if total else 0.0
    return CheckResult(
        name="fulfilment_rate",
        passed=rate >= 0.8,
        detail=f"{fulfilled}/{total} orders fulfilled ({rate:.0%})",
    )
