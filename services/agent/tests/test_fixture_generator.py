from __future__ import annotations

from app.core.thresholds import CheckStatus
from app.stages.check import run_checks
from tests.fixtures.generator import FIXTURE_STORES, Scenario, generate_store


def _statuses(scenario: Scenario, store_id: str, seed: int, name: str) -> dict[str, CheckStatus]:
    snapshot = generate_store(scenario, seed, store_id, name)
    return {c.name: c.status for c in run_checks(snapshot)}


def test_same_seed_produces_byte_identical_snapshot():
    a = generate_store(Scenario.FRAUDULENT, 777, "seed-test.myshopify.com", "Seed Test Co.")
    b = generate_store(Scenario.FRAUDULENT, 777, "seed-test.myshopify.com", "Seed Test Co.")
    assert a.model_dump_json() == b.model_dump_json()


def test_different_seeds_produce_different_snapshots():
    a = generate_store(Scenario.FRAUDULENT, 1, "seed-test.myshopify.com", "Seed Test Co.")
    b = generate_store(Scenario.FRAUDULENT, 2, "seed-test.myshopify.com", "Seed Test Co.")
    assert a.model_dump_json() != b.model_dump_json()


def test_every_generated_snapshot_is_pii_free():
    for store_id, (scenario, seed, name) in FIXTURE_STORES.items():
        snapshot = generate_store(scenario, seed, store_id, name)
        dumped = snapshot.model_dump_json()
        # Every order-level identifier is a salted hash — nothing raw
        # (an address, a name, an email) ever appears.
        for order in snapshot.orders:
            assert order.customer_ref.startswith("0x")
            assert order.shipping_address_hash.startswith("0x")
        assert "@" not in dumped  # no email-shaped strings leaked in


def test_healthy_established_passes_every_check():
    statuses = _statuses(
        Scenario.HEALTHY_ESTABLISHED, "northfield-outfitters.myshopify.com", 100_001, "Northfield"
    )
    assert all(s is CheckStatus.PASS for s in statuses.values()), statuses


def test_marginal_flags_every_check_but_fails_none():
    statuses = _statuses(Scenario.MARGINAL, "lumen-home-goods.myshopify.com", 100_004, "Lumen")
    assert all(s is CheckStatus.FLAG for s in statuses.values()), statuses


def test_fraudulent_trips_address_clustering_and_synthetic_order_patterns_to_fail():
    statuses = _statuses(
        Scenario.FRAUDULENT, "crestpeak-imports.myshopify.com", 100_003, "CrestPeak"
    )
    assert statuses["address_clustering"] is CheckStatus.FAIL, statuses
    assert statuses["synthetic_order_patterns"] is CheckStatus.FAIL, statuses
    assert statuses["sales_velocity"] is CheckStatus.FAIL, statuses


def test_fraudulent_synthetic_score_is_not_the_unsafe_inf_sentinel():
    """Regression guard for the sales_velocity float('inf') bug (see
    app/stages/check.py) — a brand-new store with no historical baseline
    must still produce a finite, JSON-safe value."""
    snapshot = generate_store(
        Scenario.FRAUDULENT, 100_003, "crestpeak-imports.myshopify.com", "CrestPeak"
    )
    velocity = next(c for c in run_checks(snapshot) if c.name == "sales_velocity")
    assert velocity.value not in (float("inf"), float("-inf"))
    assert velocity.model_dump(mode="json")["value"] == velocity.value


def test_demo_declined_fails_on_operational_checks_not_fraud_checks():
    """A distinct decline narrative from the fraud scenario — genuine
    fulfilment/quality problems, not synthetic order patterns — so the two
    demo declines don't read as the same story twice."""
    statuses = _statuses(
        Scenario.DEMO_DECLINED, "westmere-outdoor.myshopify.com", 100_006, "Westmere"
    )
    assert statuses["fulfilment_coverage"] is CheckStatus.FAIL
    assert statuses["chargeback_rate"] is CheckStatus.FAIL
    assert statuses["return_rate"] is CheckStatus.FAIL
    assert statuses["address_clustering"] is CheckStatus.PASS
    assert statuses["synthetic_order_patterns"] is CheckStatus.PASS


def test_demo_approved_passes_every_check():
    statuses = _statuses(
        Scenario.DEMO_APPROVED, "harlow-and-finch.myshopify.com", 100_005, "Harlow & Finch"
    )
    assert all(s is CheckStatus.PASS for s in statuses.values()), statuses


def test_every_check_has_a_pass_a_flag_and_a_fail_fixture():
    """The generated fixture set as a whole must exercise every one of the
    six checks in all three CheckStatus states — not every scenario
    individually, but across the committed set."""
    all_statuses: dict[str, set[CheckStatus]] = {}
    for store_id, (scenario, seed, name) in FIXTURE_STORES.items():
        for check_name, status in _statuses(scenario, store_id, seed, name).items():
            all_statuses.setdefault(check_name, set()).add(status)

    expected = {CheckStatus.PASS, CheckStatus.FLAG, CheckStatus.FAIL}
    for check_name, seen in all_statuses.items():
        assert seen == expected, f"{check_name} only reached {seen}, missing {expected - seen}"
