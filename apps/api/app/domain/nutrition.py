from dataclasses import dataclass


@dataclass(frozen=True)
class NutritionValues:
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float


def scale_serving(serving: NutritionValues, quantity: float) -> NutritionValues:
    """Scale a food serving's nutrition by how many servings were logged."""
    return NutritionValues(
        calories=serving.calories * quantity,
        protein_g=serving.protein_g * quantity,
        carbs_g=serving.carbs_g * quantity,
        fat_g=serving.fat_g * quantity,
        fiber_g=serving.fiber_g * quantity,
    )


def sum_nutrition(values: list[NutritionValues]) -> NutritionValues:
    """Sum nutrition values, e.g. meal items into a meal, or meals into a day total."""
    return NutritionValues(
        calories=sum(v.calories for v in values),
        protein_g=sum(v.protein_g for v in values),
        carbs_g=sum(v.carbs_g for v in values),
        fat_g=sum(v.fat_g for v in values),
        fiber_g=sum(v.fiber_g for v in values),
    )
