from datetime import date, datetime, time, timezone


def day_bounds_utc(day: date) -> tuple[str, str]:
    """ISO start/end timestamps for a calendar day in UTC, for range filtering."""
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    end = datetime.combine(day, time.max, tzinfo=timezone.utc)
    return start.isoformat(), end.isoformat()
