"""Stage 2: six pure, deterministic checks over a StoreSnapshot.

Each check is a pure function: same snapshot in, same CheckResult out,
every time. No check calls out to anything — all the data they need is
already on the snapshot. Thresholds live in app/core/thresholds.py, not
here, because they'll be tuned.
"""

from __future__ import annotations

import statistics
from collections import Counter
from datetime import timedelta

from app.core.models import CheckResult, NormalizedOrder, StoreSnapshot
from app.core.thresholds import (
    ADDRESS_CLUSTERING,
    ADDRESS_CLUSTERING_TOP_N,
    CHARGEBACK_RATE,
    FULFILMENT_COVERAGE,
    RETURN_RATE,
    SALES_VELOCITY_BUCKET_DAYS,
    SALES_VELOCITY_MAX_HISTORICAL_BUCKETS,
    SALES_VELOCITY_RATIO,
    SYNTHETIC_ORDER_SCORE,
)

# Comfortably above SALES_VELOCITY_RATIO.fail (6.0) so it always reads as
# FAIL, without being float("inf") — see _sales_velocity.
_NO_BASELINE_RATIO_SENTINEL = 999.0


def run_checks(snapshot: StoreSnapshot) -> list[CheckResult]:
    return [
        _fulfilment_coverage(snapshot),
        _sales_velocity(snapshot),
        _chargeback_rate(snapshot),
        _return_rate(snapshot),
        _address_clustering(snapshot),
        _synthetic_order_patterns(snapshot),
    ]


def _fulfilment_coverage(snapshot: StoreSnapshot) -> CheckResult:
    orders = snapshot.orders
    total = len(orders)
    scanned = sum(1 for o in orders if o.has_delivery_scan)
    value = scanned / total if total else 0.0
    status = FULFILMENT_COVERAGE.status_for(value)
    return CheckResult(
        name="fulfilment_coverage",
        status=status,
        value=value,
        detail=(
            f"{scanned}/{total} orders show a delivery scan ({value:.0%})"
            if total
            else "No orders in the 90-day window to assess fulfilment coverage"
        ),
        threshold=FULFILMENT_COVERAGE.boundary_for(status),
    )


def _sales_velocity(snapshot: StoreSnapshot) -> CheckResult:
    """Recent 30-day order volume against the trailing median of prior
    30-day buckets within the ingestion window (days 31-60 and 61-90
    before window_end). A store younger than 60 days has fewer prior
    buckets — with zero buckets there's no baseline to spike against, so
    the ratio is neutral (1.0) rather than flagged; the check exists to
    catch a spike relative to a store's own history, not to penalize
    having little history.
    """
    window_end = snapshot.window_end
    recent_cutoff = window_end - timedelta(days=SALES_VELOCITY_BUCKET_DAYS)
    recent_count = sum(1 for o in snapshot.orders if o.placed_at >= recent_cutoff)

    historical_buckets: list[int] = []
    bucket_end = recent_cutoff
    for _ in range(SALES_VELOCITY_MAX_HISTORICAL_BUCKETS):
        bucket_days = timedelta(days=SALES_VELOCITY_BUCKET_DAYS)
        bucket_start = max(snapshot.window_start, bucket_end - bucket_days)
        if bucket_start >= bucket_end:
            break
        count = sum(1 for o in snapshot.orders if bucket_start <= o.placed_at < bucket_end)
        historical_buckets.append(count)
        bucket_end = bucket_start

    if not historical_buckets:
        ratio = 1.0
        baseline_detail = "insufficient history to establish a baseline"
    else:
        median = statistics.median(historical_buckets)
        if median > 0:
            ratio = recent_count / median
        elif recent_count > 0:
            # No historical baseline but real recent activity — maximal risk,
            # but a *finite* sentinel: float("inf") survives model_dump(mode="json")
            # as the non-standard "Infinity" token, and model_dump_json() (what
            # the evidence/decision stores actually use) silently collapses it to
            # null, corrupting the committed value instead of erroring.
            ratio = _NO_BASELINE_RATIO_SENTINEL
        else:
            ratio = 1.0
        baseline_detail = (
            f"trailing median of {median:g} over {len(historical_buckets)} prior 30-day period(s)"
        )

    status = SALES_VELOCITY_RATIO.status_for(ratio)
    return CheckResult(
        name="sales_velocity",
        status=status,
        value=ratio,
        detail=f"{recent_count} orders in the last 30 days vs a {baseline_detail}",
        threshold=SALES_VELOCITY_RATIO.boundary_for(status),
    )


def _chargeback_rate(snapshot: StoreSnapshot) -> CheckResult:
    orders = snapshot.orders
    total = len(orders)
    disputed = sum(1 for o in orders if o.disputed)
    value = disputed / total if total else 0.0
    status = CHARGEBACK_RATE.status_for(value)
    return CheckResult(
        name="chargeback_rate",
        status=status,
        value=value,
        detail=(
            f"{disputed}/{total} orders disputed ({value:.1%})" if total else "No orders to assess"
        ),
        threshold=CHARGEBACK_RATE.boundary_for(status),
    )


def _return_rate(snapshot: StoreSnapshot) -> CheckResult:
    orders = snapshot.orders
    total = len(orders)
    refunded = sum(1 for o in orders if o.refunded)
    value = refunded / total if total else 0.0
    status = RETURN_RATE.status_for(value)
    return CheckResult(
        name="return_rate",
        status=status,
        value=value,
        detail=(
            f"{refunded}/{total} orders refunded ({value:.1%})" if total else "No orders to assess"
        ),
        threshold=RETURN_RATE.boundary_for(status),
    )


def _address_clustering(snapshot: StoreSnapshot) -> CheckResult:
    orders = snapshot.orders
    total = len(orders)
    if not total:
        status = ADDRESS_CLUSTERING.status_for(0.0)
        return CheckResult(
            name="address_clustering",
            status=status,
            value=0.0,
            detail="No orders to assess",
            threshold=ADDRESS_CLUSTERING.boundary_for(status),
        )

    counts = Counter(o.shipping_address_hash for o in orders)
    top_n_total = sum(count for _, count in counts.most_common(ADDRESS_CLUSTERING_TOP_N))
    value = top_n_total / total
    status = ADDRESS_CLUSTERING.status_for(value)
    return CheckResult(
        name="address_clustering",
        status=status,
        value=value,
        detail=(
            f"Top {min(ADDRESS_CLUSTERING_TOP_N, len(counts))} shipping addresses account for "
            f"{top_n_total}/{total} orders ({value:.0%})"
        ),
        threshold=ADDRESS_CLUSTERING.boundary_for(status),
    )


def _synthetic_order_patterns(snapshot: StoreSnapshot) -> CheckResult:
    """Composite score in [0, 1], the average of three sub-signals:

    1. timing_regularity — inter-arrival variance between consecutively
       placed orders. Real customers order at irregular times (high
       coefficient of variation); scripted/synthetic order generation
       tends to be metronomic (low CV). signal = clamp(1 - CV, 0, 1), so a
       perfectly regular cadence scores 1.0 and CV >= 1 scores 0.0. Needs
       at least 3 orders to compute a variance at all; fewer than that
       scores 0.0 (not enough evidence to accuse).

    2. value_clustering — proportion of orders whose total exactly equals
       the single most common total in the window. Real catalogs produce a
       spread of order totals; a bot re-running the same cart produces a
       spike at one value.

    3. customer_reuse — 1 - (distinct customer refs / total orders). How
       concentrated order volume is among few pseudonymous customer
       identities.

    FLAG above 0.5, FAIL above 0.75.
    """
    orders = snapshot.orders
    total = len(orders)
    if not total:
        status = SYNTHETIC_ORDER_SCORE.status_for(0.0)
        return CheckResult(
            name="synthetic_order_patterns",
            status=status,
            value=0.0,
            detail="No orders to assess",
            threshold=SYNTHETIC_ORDER_SCORE.boundary_for(status),
        )

    timing_signal = _timing_regularity_signal(orders)
    value_signal = _value_clustering_signal(orders)
    customer_signal = _customer_reuse_signal(orders)
    score = (timing_signal + value_signal + customer_signal) / 3

    status = SYNTHETIC_ORDER_SCORE.status_for(score)
    return CheckResult(
        name="synthetic_order_patterns",
        status=status,
        value=score,
        detail=(
            f"Composite score {score:.2f} (timing regularity {timing_signal:.2f}, "
            f"value clustering {value_signal:.2f}, customer reuse {customer_signal:.2f})"
        ),
        threshold=SYNTHETIC_ORDER_SCORE.boundary_for(status),
    )


def _timing_regularity_signal(orders: list[NormalizedOrder]) -> float:
    if len(orders) < 3:
        return 0.0
    timestamps = sorted(o.placed_at for o in orders)
    gaps_hours = [
        (timestamps[i + 1] - timestamps[i]).total_seconds() / 3600
        for i in range(len(timestamps) - 1)
    ]
    mean_gap = statistics.fmean(gaps_hours)
    if mean_gap <= 0:
        return 1.0
    stdev_gap = statistics.pstdev(gaps_hours)
    coefficient_of_variation = stdev_gap / mean_gap
    return max(0.0, min(1.0, 1 - coefficient_of_variation))


def _value_clustering_signal(orders: list[NormalizedOrder]) -> float:
    totals = Counter(o.total_amount for o in orders)
    _, mode_count = totals.most_common(1)[0]
    return mode_count / len(orders)


def _customer_reuse_signal(orders: list[NormalizedOrder]) -> float:
    distinct_customers = len({o.customer_ref for o in orders})
    return 1 - (distinct_customers / len(orders))
