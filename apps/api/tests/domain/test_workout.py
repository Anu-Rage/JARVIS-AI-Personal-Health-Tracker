from app.domain.workout import SetVolume, calculate_total_volume


def test_set_volume_multiplies_reps_by_weight() -> None:
    assert SetVolume(reps=10, weight_kg=20).volume_kg == 200


def test_set_volume_zero_weight_is_zero() -> None:
    assert SetVolume(reps=10, weight_kg=0).volume_kg == 0


def test_calculate_total_volume_sums_sets() -> None:
    sets = [SetVolume(reps=10, weight_kg=20), SetVolume(reps=8, weight_kg=25)]
    assert calculate_total_volume(sets) == 400


def test_calculate_total_volume_empty_is_zero() -> None:
    assert calculate_total_volume([]) == 0
