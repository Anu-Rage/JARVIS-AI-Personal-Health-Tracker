-- Starter food reference data (source='verified'). Household servings for
-- Indian staples per §22/§36 of the architecture doc, rather than forcing
-- gram-based entry. Values are standard per-serving approximations.

with new_foods (name, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g) as (
  values
    ('Egg (boiled)', '1 egg', 78, 6.3, 0.6, 5.3, 0),
    ('Banana', '1 medium banana', 105, 1.3, 27, 0.4, 3.1),
    ('Idli', '1 idli', 39, 2, 8, 0.1, 0.5),
    ('Dosa (plain)', '1 dosa', 133, 2.7, 20, 4.5, 1),
    ('Roti (whole wheat)', '1 roti', 71, 2.7, 15, 0.4, 2),
    ('Dal (cooked, mixed lentils)', '1 katori (150g)', 150, 9, 25, 1.5, 6),
    ('Rice, cooked (white)', '1 katori (150g)', 195, 4, 43, 0.4, 0.6),
    ('Chicken breast, cooked', '100g', 165, 31, 0, 3.6, 0),
    ('Milk, whole', '1 cup (240ml)', 149, 8, 12, 8, 0),
    ('Curd / yogurt, plain', '1 katori (150g)', 98, 5.5, 7.5, 4.8, 0),
    ('Apple', '1 medium apple', 95, 0.5, 25, 0.3, 4.4),
    ('Oats, cooked', '1 cup cooked (234g)', 166, 5.9, 28, 3.6, 4),
    ('Paneer', '100g', 265, 18, 3.6, 20, 0),
    ('Bread, whole wheat', '1 slice', 81, 4, 14, 1.1, 2),
    ('Peanut butter', '1 tbsp (16g)', 94, 4, 3, 8, 1),
    ('Almonds', '10 almonds', 70, 2.6, 2.5, 6, 1.5),
    ('Poha', '1 katori (150g)', 180, 3.6, 30, 5, 1.5),
    ('Upma', '1 katori (150g)', 200, 4.5, 30, 7, 2),
    ('Sambar', '1 katori (150g)', 120, 5, 18, 3, 3),
    ('Ghee', '1 tsp (5g)', 45, 0, 0, 5, 0),
    ('Tea with milk and sugar', '1 cup', 60, 1.5, 9, 2, 0),
    ('Coffee, black', '1 cup', 2, 0.3, 0, 0, 0),
    ('Peanuts, roasted', '1 handful (30g)', 170, 7, 5, 14, 2.5),
    ('Whey protein powder', '1 scoop (30g)', 120, 24, 3, 1.5, 0),
    ('Mixed vegetable salad', '1 bowl (100g)', 25, 1.5, 5, 0.2, 2)
),
inserted_foods as (
  insert into foods (name, source)
  select name, 'verified' from new_foods
  returning id, name
)
insert into food_servings (food_id, serving_description, calories, protein_g, carbs_g, fat_g, fiber_g)
select f.id, nf.serving_description, nf.calories, nf.protein_g, nf.carbs_g, nf.fat_g, nf.fiber_g
from new_foods nf
join inserted_foods f on f.name = nf.name;
