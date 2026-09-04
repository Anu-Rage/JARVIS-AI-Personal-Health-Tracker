from app.domain.nutrition import NutritionValues, scale_serving, sum_nutrition


def test_scale_serving_multiplies_by_quantity() -> None:
    serving = NutritionValues(calories=100, protein_g=10, carbs_g=20, fat_g=5, fiber_g=2)

    result = scale_serving(serving, 2.5)

    assert result == NutritionValues(calories=250, protein_g=25, carbs_g=50, fat_g=12.5, fiber_g=5)


def test_scale_serving_by_zero_quantity_is_zero() -> None:
    serving = NutritionValues(calories=100, protein_g=10, carbs_g=20, fat_g=5, fiber_g=2)

    result = scale_serving(serving, 0)

    assert result == NutritionValues(calories=0, protein_g=0, carbs_g=0, fat_g=0, fiber_g=0)


def test_sum_nutrition_adds_each_field() -> None:
    values = [
        NutritionValues(calories=100, protein_g=10, carbs_g=20, fat_g=5, fiber_g=2),
        NutritionValues(calories=50, protein_g=5, carbs_g=10, fat_g=2, fiber_g=1),
    ]

    result = sum_nutrition(values)

    assert result == NutritionValues(calories=150, protein_g=15, carbs_g=30, fat_g=7, fiber_g=3)


def test_sum_nutrition_empty_list_is_zero() -> None:
    result = sum_nutrition([])

    assert result == NutritionValues(calories=0, protein_g=0, carbs_g=0, fat_g=0, fiber_g=0)
