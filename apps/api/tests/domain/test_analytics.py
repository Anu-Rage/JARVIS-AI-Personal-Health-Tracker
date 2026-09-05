from datetime import date

from app.domain.analytics import calorie_adherence_rate, current_streak, mean


def test_mean_of_values() -> None:
    assert mean([100, 200, 300]) == 200


def test_mean_empty_is_none() -> None:
    assert mean([]) is None


def test_calorie_adherence_within_tolerance() -> None:
    # target 2000, tolerance 10% -> band is 1800-2200
    assert calorie_adherence_rate([1900, 2100, 2500], 2000) == 2 / 3


def test_calorie_adherence_no_target_is_none() -> None:
    assert calorie_adherence_rate([2000], 0) is None


def test_calorie_adherence_no_days_is_none() -> None:
    assert calorie_adherence_rate([], 2000) is None


def test_current_streak_counts_consecutive_days_ending_today() -> None:
    today = date(2026, 9, 5)
    active = {date(2026, 9, 5), date(2026, 9, 4), date(2026, 9, 3), date(2026, 9, 1)}
    assert current_streak(active, today) == 3


def test_current_streak_zero_if_today_missing() -> None:
    today = date(2026, 9, 5)
    active = {date(2026, 9, 4), date(2026, 9, 3)}
    assert current_streak(active, today) == 0


def test_current_streak_empty_set() -> None:
    assert current_streak(set(), date(2026, 9, 5)) == 0
