"""Seeded generator for StoreSnapshot fixtures.

Same seed -> byte-identical StoreSnapshot (see test_fixture_generator.py's
determinism assertion). Used two ways:

  1. Directly in tests that want a specific, realistic snapshot without
     hand-authoring one order at a time.
  2. Via regenerate.py, which writes the committed JSON under
     tests/fixtures/generated/ that FixtureProvider actually reads at
     runtime — the generator itself is never imported by app/ code.

DESIGN NOTE ON THE THREE SALES-VELOCITY BUCKETS

app/stages/check.py's sales_velocity check compares a recent 30-day order
count against the median of up to two prior 30-day buckets — three buckets,
exactly covering the 90-day ingestion window. Rather than shaping a
probabilistic order-arrival process and hoping it lands the ratio in the
right band, each ScenarioParams specifies bucket_counts=(oldest, middle,
recent) directly. This makes every scenario's check outcome exact by
construction: within each bucket, order *timing* is still randomized
(seasonality, jitter) for texture, but the *count* is deliberate.
"""

from __future__ import annotations

import hashlib
import math
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from random import Random

from app.core.models import NormalizedOrder, ShopMetadata, StoreSnapshot

# Fixed anchor so regeneration is byte-identical regardless of when or where
# it runs — this is what window_end resolves to for every fixture.
WINDOW_END = datetime(2026, 8, 17, tzinfo=UTC)
BUCKET_DAYS = 30
WINDOW_DAYS = 3 * BUCKET_DAYS
WINDOW_START = WINDOW_END - timedelta(days=WINDOW_DAYS)

_CURRENCY = "USD"

# A small, plausible SKU catalog — real per-item price points, not round
# numbers. Order totals are built by summing 1-3 of these, the way an actual
# cart total would look, rather than drawn straight from a distribution.
_SKU_PRICES = (14.00, 18.50, 24.00, 29.99, 34.00, 45.00, 59.99, 74.00, 89.99, 129.00)


class Scenario(StrEnum):
    HEALTHY_ESTABLISHED = "healthy_established"
    HEALTHY_YOUNG = "healthy_young"
    FRAUDULENT = "fraudulent"
    MARGINAL = "marginal"
    DEMO_APPROVED = "demo_approved"
    DEMO_DECLINED = "demo_declined"


@dataclass(frozen=True)
class ScenarioParams:
    tenure_days: int
    bucket_counts: tuple[int, int, int]  # (61-90d ago, 31-60d ago, last 30d)

    # Fulfilment / delivery scan
    fulfilment_coverage: float  # target fraction with a delivery scan
    fulfilment_lag_mean_days: float  # days between placed and fulfilled
    scan_lag_mean_days: float  # days between fulfilled and delivery scan

    # Disputes / refunds
    chargeback_rate: float
    return_rate: float

    # Customer / address concentration (organic path — see also
    # fraud_address_* below for the clustered-fraud path)
    unique_customer_fraction: float  # distinct customers / total orders
    zipf_alpha: float  # repeat-customer power-law strength
    multi_address_customer_fraction: float

    # Order value texture
    outlier_probability: float = 0.03
    outlier_multiplier_range: tuple[float, float] = (4.0, 9.0)

    # Timing texture
    weekend_lift: float = 1.35
    monday_dip: float = 0.75
    metronomic: bool = False  # True -> fixed-interval arrivals (fraud only)
    metronomic_jitter_fraction: float = 0.12

    # Synthetic-order camouflage (fraud only) — see _fraud_value_clustering
    value_clustering_share: float = 0.0
    fraud_address_cluster_count: int = 0
    fraud_address_cluster_share: float = 0.0
    fraud_address_variant_rate: float = 0.0


SCENARIOS: dict[Scenario, ScenarioParams] = {
    Scenario.HEALTHY_ESTABLISHED: ScenarioParams(
        tenure_days=420,
        bucket_counts=(45, 48, 50),
        fulfilment_coverage=0.99,
        fulfilment_lag_mean_days=1.5,
        scan_lag_mean_days=3.5,
        chargeback_rate=0.003,
        return_rate=0.012,
        unique_customer_fraction=0.78,
        zipf_alpha=1.1,
        multi_address_customer_fraction=0.06,
    ),
    Scenario.HEALTHY_YOUNG: ScenarioParams(
        tenure_days=120,
        bucket_counts=(8, 10, 30),
        fulfilment_coverage=0.95,
        fulfilment_lag_mean_days=2.0,
        scan_lag_mean_days=4.0,
        chargeback_rate=0.005,
        return_rate=0.03,
        unique_customer_fraction=0.85,
        zipf_alpha=0.9,
        multi_address_customer_fraction=0.04,
    ),
    Scenario.FRAUDULENT: ScenarioParams(
        tenure_days=21,
        bucket_counts=(0, 0, 150),
        fulfilment_coverage=0.93,
        fulfilment_lag_mean_days=1.0,
        scan_lag_mean_days=3.0,
        chargeback_rate=0.007,
        return_rate=0.04,
        unique_customer_fraction=0.17,  # ~25 distinct customers / 150 orders
        zipf_alpha=0.6,
        multi_address_customer_fraction=0.0,
        outlier_probability=0.01,
        metronomic=True,
        metronomic_jitter_fraction=0.15,
        value_clustering_share=0.78,
        fraud_address_cluster_count=6,
        fraud_address_cluster_share=0.45,
        fraud_address_variant_rate=0.12,
    ),
    Scenario.MARGINAL: ScenarioParams(
        tenure_days=300,
        bucket_counts=(15, 17, 64),
        fulfilment_coverage=0.94,
        fulfilment_lag_mean_days=2.5,
        scan_lag_mean_days=5.0,
        chargeback_rate=0.015,
        return_rate=0.08,
        unique_customer_fraction=0.25,
        zipf_alpha=1.1,
        multi_address_customer_fraction=0.85,
        value_clustering_share=0.82,
    ),
    Scenario.DEMO_APPROVED: ScenarioParams(
        tenure_days=500,
        bucket_counts=(40, 43, 45),
        fulfilment_coverage=0.985,
        fulfilment_lag_mean_days=1.2,
        scan_lag_mean_days=3.0,
        chargeback_rate=0.002,
        return_rate=0.015,
        unique_customer_fraction=0.75,
        zipf_alpha=1.1,
        multi_address_customer_fraction=0.07,
    ),
    Scenario.DEMO_DECLINED: ScenarioParams(
        tenure_days=260,
        bucket_counts=(38, 40, 42),
        fulfilment_coverage=0.78,
        fulfilment_lag_mean_days=6.0,
        scan_lag_mean_days=9.0,
        chargeback_rate=0.028,
        return_rate=0.16,
        unique_customer_fraction=0.80,
        zipf_alpha=1.0,
        multi_address_customer_fraction=0.05,
    ),
}

# tests/fixtures/regenerate.py — store_id, display name, scenario, seed.
# Seeds are arbitrary but fixed: changing one changes that store's fixture.
FIXTURE_STORES: dict[str, tuple[Scenario, int, str]] = {
    "northfield-outfitters.myshopify.com": (
        Scenario.HEALTHY_ESTABLISHED,
        100_001,
        "Northfield Outfitters",
    ),
    "birchmount-supply.myshopify.com": (Scenario.HEALTHY_YOUNG, 100_002, "Birchmount Supply Co."),
    "crestpeak-imports.myshopify.com": (Scenario.FRAUDULENT, 100_003, "CrestPeak Imports"),
    "lumen-home-goods.myshopify.com": (Scenario.MARGINAL, 100_004, "Lumen Home Goods"),
    "harlow-and-finch.myshopify.com": (Scenario.DEMO_APPROVED, 100_005, "Harlow & Finch"),
    "westmere-outdoor.myshopify.com": (Scenario.DEMO_DECLINED, 100_006, "Westmere Outdoor Co."),
}


def _hash(*parts: str) -> str:
    return "0x" + hashlib.sha256("|".join(parts).encode()).hexdigest()


def _zipf_weights(n: int, alpha: float) -> list[float]:
    return [1.0 / ((i + 1) ** alpha) for i in range(n)]


def _weighted_indices_without_replacement(
    rng: Random, weights: Sequence[float], k: int
) -> list[int]:
    """Efficient enough for our order counts (never more than a few hundred)."""
    pool = list(enumerate(weights))
    chosen: list[int] = []
    k = min(k, len(pool))
    for _ in range(k):
        total = sum(w for _, w in pool)
        r = rng.random() * total
        acc = 0.0
        for i, (idx, w) in enumerate(pool):
            acc += w
            if acc >= r:
                chosen.append(idx)
                pool.pop(i)
                break
    return chosen


def _poisson(rng: Random, lam: float) -> int:
    if lam <= 0:
        return 0
    limit = math.exp(-lam)
    k = 0
    p = 1.0
    while True:
        k += 1
        p *= rng.random()
        if p <= limit:
            return k - 1


def _scatter_organic(
    rng: Random,
    bucket_start: datetime,
    bucket_end: datetime,
    count: int,
    *,
    weekend_lift: float,
    monday_dip: float,
) -> list[datetime]:
    """count timestamps within [bucket_start, bucket_end), weighted by
    weekday (weekend lift, Monday dip) and scattered at irregular times of
    day — not evenly spaced."""
    days = (bucket_end - bucket_start).days
    day_weights = []
    for d in range(days):
        weekday = (bucket_start + timedelta(days=d)).weekday()
        if weekday in (5, 6):
            day_weights.append(weekend_lift)
        elif weekday == 0:
            day_weights.append(monday_dip)
        else:
            day_weights.append(1.0)

    timestamps = []
    for _ in range(count):
        day_offset = rng.choices(range(days), weights=day_weights, k=1)[0]
        # Order-placement hours skew toward daytime/evening, not literally
        # uniform, via a triangular distribution peaking mid-afternoon.
        hour = rng.triangular(0, 23.999, 15)
        timestamps.append(
            bucket_start + timedelta(days=day_offset, hours=hour, minutes=rng.uniform(0, 59))
        )
    return sorted(timestamps)


def _scatter_metronomic(
    rng: Random, start: datetime, end: datetime, count: int, *, jitter_fraction: float
) -> list[datetime]:
    """Near-fixed inter-arrival gaps — the textbook synthetic pattern.
    Real customers don't have a coefficient of variation this low."""
    if count == 0:
        return []
    span_seconds = (end - start).total_seconds()
    mean_gap = span_seconds / count
    timestamps = []
    cursor = start
    for _ in range(count):
        jitter = rng.gauss(0, mean_gap * jitter_fraction)
        cursor = cursor + timedelta(seconds=max(60.0, mean_gap + jitter))
        timestamps.append(min(cursor, end - timedelta(seconds=1)))
    return sorted(timestamps)


_CANDIDATE_CLUSTER_PRICES = (69.99, 89.99, 119.00, 149.99)


def _build_totals(rng: Random, count: int, params: ScenarioParams) -> list[float]:
    totals = []
    clustered_count = round(count * params.value_clustering_share)
    # One plausible, non-round repeated price point per store — camouflaged
    # as a real SKU price ("this item is having a moment"), not an obviously
    # synthetic round number like "$100.00". A *single* value, not several,
    # because the check measures the single most common total's share —
    # splitting the clustered mass across multiple values dilutes the
    # signal without changing how anomalous the underlying pattern is.
    clustered_value = rng.choice(_CANDIDATE_CLUSTER_PRICES)

    for i in range(count):
        if i < clustered_count:
            totals.append(clustered_value)
            continue
        n_items = rng.choices([1, 2, 3], weights=[0.55, 0.32, 0.13], k=1)[0]
        total = sum(rng.choice(_SKU_PRICES) * rng.choice([1, 1, 1, 2]) for _ in range(n_items))
        if rng.random() < params.outlier_probability:
            total *= rng.uniform(*params.outlier_multiplier_range)
        totals.append(round(total, 2))

    rng.shuffle(totals)
    return totals


def _assign_customers(rng: Random, count: int, params: ScenarioParams, salt: str) -> list[str]:
    """Each order either creates a new customer or repeats one seen
    recently, weighted toward the most recent — a bounded, dynamically
    growing pool. A fixed small pool sampled by Zipf weight (the first
    version of this) massively over-concentrates: with realistic alphas a
    single top-ranked customer can absorb 15-20% of all orders, which is
    not what "20-30% repeat rate" means and cascades into false positives
    on address_clustering and synthetic_order_patterns for every scenario,
    healthy ones included. Recency-bounded weighting keeps any one customer
    from running away with the store."""
    repeat_probability = 1.0 - params.unique_customer_fraction
    # A pool that starts too small produces a visible bootstrap artifact —
    # the first several orders all repeating the one customer seen so far,
    # which is a generation artifact, not "customer reuse" texture, and
    # exactly the kind of thing that's obvious scrolling the raw order list.
    min_new_before_repeat = min(5, count)
    seen: list[str] = []
    next_id = 0
    refs: list[str] = []
    for _ in range(count):
        can_repeat = len(seen) >= min_new_before_repeat and rng.random() < repeat_probability
        if can_repeat:
            window = seen[-30:][::-1]  # most-recent-first
            # Real repeat purchases aren't placed back-to-back — exclude an
            # immediate repeat of the previous order's customer.
            if len(window) > 1 and refs and window[0] == refs[-1]:
                window = window[1:]
            weights = _zipf_weights(len(window), params.zipf_alpha)
            ref = rng.choices(window, weights=weights, k=1)[0]
        else:
            ref = _hash(salt, "customer", str(next_id))
            next_id += 1
            seen.append(ref)
        refs.append(ref)
    return refs


def _assign_addresses_organic(
    rng: Random, customer_refs: list[str], params: ScenarioParams, salt: str
) -> list[str]:
    """Most customers ship every order to the same primary address. A
    repeat order has a `multi_address_customer_fraction` chance of going to
    a genuinely fresh address instead — order-indexed, so it disperses
    rather than concentrating onto some fixed second point (an earlier
    version used one fixed "secondary" address per customer, which just
    relocated the concentration instead of spreading it)."""
    primary_address: dict[str, str] = {}
    addresses = []
    for i, ref in enumerate(customer_refs):
        if ref not in primary_address:
            primary_address[ref] = _hash(salt, "address", ref, "primary")
            addresses.append(primary_address[ref])
        elif rng.random() < params.multi_address_customer_fraction:
            addresses.append(_hash(salt, "address", ref, "extra", str(i)))
        else:
            addresses.append(primary_address[ref])
    return addresses


def _assign_addresses_fraud(
    rng: Random, count: int, params: ScenarioParams, salt: str
) -> list[str]:
    """A handful of canonical addresses absorb a large minority share of
    orders (a reshipping/mule pattern); a fraction of those get a distinct
    "variant" hash to simulate the same physical address entered with
    different formatting — subtle at the individual-order level, still
    visible in aggregate to the clustering check."""
    n_clustered = round(count * params.fraud_address_cluster_share)
    clusters = [
        _hash(salt, "fraud-address", str(i)) for i in range(params.fraud_address_cluster_count)
    ]
    addresses = []
    for i in range(count):
        if i < n_clustered:
            cluster = rng.choice(clusters)
            if rng.random() < params.fraud_address_variant_rate:
                cluster = _hash(cluster, "variant", str(rng.randint(0, 999)))
            addresses.append(cluster)
        else:
            addresses.append(_hash(salt, "address", "dispersed", str(i)))
    rng.shuffle(addresses)
    return addresses


def _select_biased_toward_value(
    rng: Random, totals: list[float], target_count: int, bias: float
) -> set[int]:
    """target_count indices, biased toward higher total_amount by `bias` in
    [0, 1]: 0 = uniform random, 1 = strictly highest-value first."""
    order = sorted(range(len(totals)), key=lambda i: totals[i], reverse=True)
    n = len(totals)
    weights = [
        (1.0 - bias) + bias * (2.0 * (n - rank) / n) for rank, _ in enumerate(order)
    ]
    chosen_positions = _weighted_indices_without_replacement(rng, weights, target_count)
    return {order[p] for p in chosen_positions}


def generate_store(
    scenario: Scenario, seed: int, store_domain: str, display_name: str
) -> StoreSnapshot:
    params = SCENARIOS[scenario]
    rng = Random(seed)
    salt = f"{store_domain}:{seed}"

    # ── timing ────────────────────────────────────────────────────────
    bucket_bounds = [
        (WINDOW_START, WINDOW_START + timedelta(days=BUCKET_DAYS)),
        (
            WINDOW_START + timedelta(days=BUCKET_DAYS),
            WINDOW_START + timedelta(days=2 * BUCKET_DAYS),
        ),
        (WINDOW_START + timedelta(days=2 * BUCKET_DAYS), WINDOW_END),
    ]
    shop_created_at = WINDOW_END - timedelta(days=params.tenure_days)

    timestamps: list[datetime] = []
    if params.metronomic:
        total = sum(params.bucket_counts)
        start = max(WINDOW_START, shop_created_at)
        timestamps = _scatter_metronomic(
            rng, start, WINDOW_END, total, jitter_fraction=params.metronomic_jitter_fraction
        )
    else:
        bucket_iter = zip(bucket_bounds, params.bucket_counts, strict=True)
        for (bucket_start, bucket_end), count in bucket_iter:
            effective_start = max(bucket_start, shop_created_at)
            if effective_start >= bucket_end or count == 0:
                continue
            timestamps.extend(
                _scatter_organic(
                    rng,
                    effective_start,
                    bucket_end,
                    count,
                    weekend_lift=params.weekend_lift,
                    monday_dip=params.monday_dip,
                )
            )
    timestamps.sort()
    count = len(timestamps)

    # ── order values ─────────────────────────────────────────────────
    totals = _build_totals(rng, count, params)

    # ── customers & addresses ───────────────────────────────────────
    customer_refs = _assign_customers(rng, count, params, salt)
    if params.fraud_address_cluster_count:
        addresses = _assign_addresses_fraud(rng, count, params, salt)
    else:
        addresses = _assign_addresses_organic(rng, customer_refs, params, salt)

    # ── fulfilment & delivery scan ──────────────────────────────────
    # Most recent orders haven't had time to fulfil/scan yet — that's
    # recency, not a quality problem, so they're excluded from the
    # "legitimately unfulfilled" quota and handled by the lag model instead.
    fulfilled_at = []
    scanned_at = []
    for ts in timestamps:
        lag = rng.gauss(params.fulfilment_lag_mean_days, params.fulfilment_lag_mean_days * 0.4)
        f_at = ts + timedelta(days=max(0.2, lag))
        fulfilled_at.append(f_at)
        scan_lag = rng.gauss(params.scan_lag_mean_days, params.scan_lag_mean_days * 0.35)
        scanned_at.append(f_at + timedelta(days=max(0.5, scan_lag)))

    # Orders that would have scanned by now under the lag model, vs orders
    # that are simply too recent — then trim/pad with genuine exceptions
    # (never-fulfilled orders unrelated to recency) to hit the target rate.
    would_have_scanned = {i for i, s_at in enumerate(scanned_at) if s_at <= WINDOW_END}
    target_scanned = round(count * params.fulfilment_coverage)
    has_scan = set(sorted(would_have_scanned, key=lambda i: scanned_at[i])[:target_scanned])
    if len(has_scan) < target_scanned:
        remaining = [i for i in range(count) if i not in has_scan]
        remaining.sort(key=lambda i: scanned_at[i])
        has_scan |= set(remaining[: target_scanned - len(has_scan)])
    fulfilled = {i for i in range(count) if fulfilled_at[i] <= WINDOW_END} | has_scan

    # ── refunds & disputes (biased toward higher-value orders) ──────
    refund_target = round(count * params.return_rate)
    dispute_target = round(count * params.chargeback_rate)
    refunded = _select_biased_toward_value(rng, totals, refund_target, bias=0.5)
    disputed = _select_biased_toward_value(rng, totals, dispute_target, bias=0.4)

    orders = [
        NormalizedOrder(
            id=f"order_{i:05d}",
            placed_at=timestamps[i],
            total_amount=totals[i],
            customer_ref=customer_refs[i],
            fulfilled=i in fulfilled,
            has_delivery_scan=i in has_scan,
            shipping_address_hash=addresses[i],
            refunded=i in refunded,
            disputed=i in disputed,
        )
        for i in range(count)
    ]

    return StoreSnapshot(
        store_id=store_domain,
        shop=ShopMetadata(domain=store_domain, created_at=shop_created_at, currency=_CURRENCY),
        window_start=WINDOW_START,
        window_end=WINDOW_END,
        orders=orders,
        ingested_at=WINDOW_END,
    )
