"""Every threshold the check stage judges against, in one place, because
they will be tuned as real settlement outcomes come in. Nothing in
app/stages/check.py should hardcode a number that belongs here.
"""

from dataclasses import dataclass
from enum import StrEnum


class CheckStatus(StrEnum):
    PASS = "PASS"
    FLAG = "FLAG"
    FAIL = "FAIL"


@dataclass(frozen=True)
class Threshold:
    """A two-tier boundary. `direction` says which side of the boundary is
    bad: "below" for coverage-style checks (low value = bad), "above" for
    rate-style checks (high value = bad).
    """

    flag: float
    fail: float
    direction: str  # "below" | "above"

    def status_for(self, value: float) -> CheckStatus:
        if self.direction == "below":
            if value < self.fail:
                return CheckStatus.FAIL
            if value < self.flag:
                return CheckStatus.FLAG
            return CheckStatus.PASS
        if value > self.fail:
            return CheckStatus.FAIL
        if value > self.flag:
            return CheckStatus.FLAG
        return CheckStatus.PASS

    def boundary_for(self, status: CheckStatus) -> float:
        """The specific boundary that produced `status` — FAIL reports the
        fail line, FLAG and PASS both report the flag line (the boundary a
        PASS cleared, or the one a FLAG sits inside of)."""
        return self.fail if status is CheckStatus.FAIL else self.flag


FULFILMENT_COVERAGE = Threshold(flag=0.98, fail=0.90, direction="below")
SALES_VELOCITY_RATIO = Threshold(flag=3.0, fail=6.0, direction="above")
CHARGEBACK_RATE = Threshold(flag=0.01, fail=0.02, direction="above")
RETURN_RATE = Threshold(flag=0.07, fail=0.12, direction="above")
ADDRESS_CLUSTERING = Threshold(flag=0.20, fail=0.35, direction="above")
SYNTHETIC_ORDER_SCORE = Threshold(flag=0.5, fail=0.75, direction="above")

ADDRESS_CLUSTERING_TOP_N = 10
SALES_VELOCITY_BUCKET_DAYS = 30
SALES_VELOCITY_MAX_HISTORICAL_BUCKETS = 2  # days 31-60 and 61-90 before the recent window
