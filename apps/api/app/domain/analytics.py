from datetime import date, timedelta


def mean(values: list[float]) -> float | None:
    """Simple average; None (not 0) when there's nothing to average, so a
    day with no data is never silently presented as "zero"."""
    if not values:
        return None
    return sum(values) / len(values)


def calorie_adherence_rate(
    daily_calories: list[float], target: float, tolerance_pct: float = 0.10
) -> float | None:
    """Fraction of logged days within `tolerance_pct` of the calorie target.
    None if there's no target or no logged days -- adherence to a target
    that doesn't exist, or on days nothing was logged, isn't a real number.
    """
    if not daily_calories or target <= 0:
        return None
    band = target * tolerance_pct
    within = sum(1 for c in daily_calories if abs(c - target) <= band)
    return within / len(daily_calories)


def current_streak(active_dates: set[date], as_of: date) -> int:
    """Consecutive days with activity, counting backward from `as_of`.
    Stops at the first gap (including today itself, if nothing logged yet)."""
    streak = 0
    day = as_of
    while day in active_dates:
        streak += 1
        day -= timedelta(days=1)
    return streak
