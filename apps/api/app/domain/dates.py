from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIMEZONE = "UTC"


def day_bounds_utc(day: date) -> tuple[str, str]:
    """ISO start/end timestamps for a calendar day in UTC, for range filtering."""
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    end = datetime.combine(day, time.max, tzinfo=timezone.utc)
    return start.isoformat(), end.isoformat()


def resolve_timezone(tz_name: str | None) -> ZoneInfo:
    """A stored/user-supplied IANA name that's missing or invalid must never
    crash a request -- fall back to UTC rather than raising."""
    try:
        return ZoneInfo(tz_name or DEFAULT_TIMEZONE)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_TIMEZONE)


def today_in_timezone(tz_name: str | None) -> date:
    return datetime.now(resolve_timezone(tz_name)).date()


def to_local_date(iso_timestamp: str, tz_name: str | None) -> date:
    """Which calendar date an absolute UTC timestamp falls on, in the given
    timezone -- for bucketing stored timestamps by the user's day rather
    than by the UTC day they happen to be stored in."""
    dt = datetime.fromisoformat(iso_timestamp)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(resolve_timezone(tz_name)).date()


def local_day_bounds_utc(day: date, tz_name: str | None) -> tuple[str, str]:
    """UTC start/end timestamps for a calendar day *as it falls in the given
    timezone* -- e.g. for a user in Asia/Kolkata (UTC+5:30), day's local
    midnight is the previous UTC day's evening. Filtering by day_bounds_utc
    instead (a UTC-aligned day) silently mis-buckets roughly the first ~5.5
    hours of that user's actual calendar day into "yesterday"."""
    tz = resolve_timezone(tz_name)
    start_local = datetime.combine(day, time.min, tzinfo=tz)
    end_local = datetime.combine(day, time.max, tzinfo=tz)
    return start_local.astimezone(timezone.utc).isoformat(), end_local.astimezone(timezone.utc).isoformat()
