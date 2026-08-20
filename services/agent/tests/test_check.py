from __future__ import annotations

from datetime import timedelta

from app.core.thresholds import CheckStatus
from app.stages.check import run_checks
from tests.conftest import (
    WINDOW_END,
    declining_snapshot,
    healthy_snapshot,
    make_order,
    make_snapshot,
)


def _by_name(checks, name):
    return next(c for c in checks if c.name == name)


def test_run_checks_returns_all_six():
    checks = run_checks(healthy_snapshot())
    names = {c.name for c in checks}
    assert names == {
        "fulfilment_coverage",
        "sales_velocity",
        "chargeback_rate",
        "return_rate",
        "address_clustering",
        "synthetic_order_patterns",
    }


def test_healthy_snapshot_passes_every_check():
    checks = run_checks(healthy_snapshot())
    assert all(c.status is CheckStatus.PASS for c in checks), checks


def test_declining_snapshot_produces_a_fail():
    """This is the fixture that must produce a DECLINE end to end."""
    checks = run_checks(declining_snapshot())
    assert any(c.status is CheckStatus.FAIL for c in checks)
    coverage = _by_name(checks, "fulfilment_coverage")
    assert coverage.status is CheckStatus.FAIL


class TestFulfilmentCoverage:
    def test_full_coverage_passes(self):
        orders = [make_order(i, has_delivery_scan=True) for i in range(10)]
        result = _by_name(run_checks(make_snapshot(orders)), "fulfilment_coverage")
        assert result.status is CheckStatus.PASS
        assert result.value == 1.0

    def test_low_coverage_fails(self):
        orders = [make_order(i, has_delivery_scan=(i < 5)) for i in range(10)]
        result = _by_name(run_checks(make_snapshot(orders)), "fulfilment_coverage")
        assert result.status is CheckStatus.FAIL
        assert result.value == 0.5

    def test_borderline_flags(self):
        # 96/100 = 0.96, below the 0.98 FLAG line but above the 0.90 FAIL line
        orders = [make_order(i, has_delivery_scan=(i < 96)) for i in range(100)]
        result = _by_name(run_checks(make_snapshot(orders)), "fulfilment_coverage")
        assert result.status is CheckStatus.FLAG

    def test_no_orders_fails(self):
        result = _by_name(run_checks(make_snapshot([])), "fulfilment_coverage")
        assert result.status is CheckStatus.FAIL


class TestSalesVelocity:
    def test_steady_volume_passes(self):
        # 10 orders/month for 3 months — flat velocity
        orders = []
        for month in range(3):
            for i in range(10):
                orders.append(
                    make_order(
                        month * 10 + i, placed_at=WINDOW_END - timedelta(days=month * 30 + i)
                    )
                )
        result = _by_name(run_checks(make_snapshot(orders)), "sales_velocity")
        assert result.status is CheckStatus.PASS

    def test_spike_on_established_store_fails(self):
        # 2 orders/30-day-bucket historically (median 1), then 30 orders in
        # the most recent 30 days — a 30x spike, well past the 6x FAIL line.
        historical = [
            make_order(i, placed_at=WINDOW_END - timedelta(days=40 + i)) for i in range(2)
        ]
        recent = [make_order(100 + i, placed_at=WINDOW_END - timedelta(days=i)) for i in range(30)]
        result = _by_name(run_checks(make_snapshot(historical + recent)), "sales_velocity")
        assert result.status is CheckStatus.FAIL

    def test_young_store_with_no_history_is_not_penalized(self):
        orders = [make_order(i, placed_at=WINDOW_END - timedelta(days=i)) for i in range(20)]
        snapshot = make_snapshot(orders, window_start=WINDOW_END - timedelta(days=20))
        result = _by_name(run_checks(snapshot), "sales_velocity")
        assert result.status is CheckStatus.PASS
        assert result.value == 1.0


class TestChargebackAndReturnRate:
    def test_high_chargeback_rate_fails(self):
        orders = [make_order(i, disputed=(i < 3)) for i in range(100)]  # 3%
        result = _by_name(run_checks(make_snapshot(orders)), "chargeback_rate")
        assert result.status is CheckStatus.FAIL

    def test_high_return_rate_fails(self):
        orders = [make_order(i, refunded=(i < 15)) for i in range(100)]  # 15%
        result = _by_name(run_checks(make_snapshot(orders)), "return_rate")
        assert result.status is CheckStatus.FAIL

    def test_zero_orders_pass_trivially(self):
        checks = run_checks(make_snapshot([]))
        assert _by_name(checks, "chargeback_rate").status is CheckStatus.PASS
        assert _by_name(checks, "return_rate").status is CheckStatus.PASS


class TestAddressClustering:
    def test_dispersed_addresses_pass(self):
        orders = [make_order(i, shipping_address_hash=f"0xaddr{i}") for i in range(50)]
        result = _by_name(run_checks(make_snapshot(orders)), "address_clustering")
        assert result.status is CheckStatus.PASS

    def test_concentrated_addresses_fail(self):
        # 40 of 50 orders to the same single address
        orders = [make_order(i, shipping_address_hash="0xsame") for i in range(40)]
        orders += [make_order(40 + i, shipping_address_hash=f"0xaddr{i}") for i in range(10)]
        result = _by_name(run_checks(make_snapshot(orders)), "address_clustering")
        assert result.status is CheckStatus.FAIL


class TestSyntheticOrderPatterns:
    def test_organic_pattern_passes(self):
        checks = run_checks(healthy_snapshot())
        result = _by_name(checks, "synthetic_order_patterns")
        assert result.status is CheckStatus.PASS

    def test_metronomic_identical_orders_fail(self):
        # Same total, same customer, exactly 24h apart — the textbook
        # synthetic pattern the check exists to catch.
        orders = [
            make_order(
                i,
                placed_at=WINDOW_END - timedelta(days=i),
                total_amount=199.99,
                customer_ref="0xsamecustomer",
                shipping_address_hash=f"0xaddr{i}",
            )
            for i in range(20)
        ]
        result = _by_name(run_checks(make_snapshot(orders)), "synthetic_order_patterns")
        assert result.status is CheckStatus.FAIL
