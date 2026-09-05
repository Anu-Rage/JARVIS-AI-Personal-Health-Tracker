from app.domain.text import name_variants


def test_plural_gets_singular_variant() -> None:
    assert name_variants("pull-ups") == ["pull-ups", "pull-up"]


def test_singular_gets_plural_variant() -> None:
    assert name_variants("egg") == ["egg", "eggs"]


def test_strips_whitespace() -> None:
    assert name_variants("  squats  ") == ["squats", "squat"]


def test_single_char_s_not_stripped() -> None:
    assert name_variants("s") == ["s", "ss"]
