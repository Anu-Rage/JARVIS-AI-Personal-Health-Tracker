"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Food, Meal } from "@jarvis/types";

type MealType = Meal["meal_type"];

interface DraftItem {
  food: Food;
  servingId: string;
  quantity: number;
}

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function MealsPage() {
  const supabase = createClient();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
    });
  }, [supabase]);

  useEffect(() => {
    if (accessToken) refreshMeals(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<Food[]>(
          `/api/v1/foods${query ? `?query=${encodeURIComponent(query)}` : ""}`,
          accessToken,
        );
        setResults(data);
      } catch {
        // search errors aren't critical enough to surface as a page-level error
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, accessToken]);

  async function refreshMeals(token: string) {
    try {
      const data = await apiFetch<Meal[]>("/api/v1/meals", token);
      setMeals(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load meals");
    }
  }

  function addToDraft(food: Food) {
    const serving = food.food_servings?.[0];
    if (!serving) return;
    setDraft((prev) => [...prev, { food, servingId: serving.id, quantity: 1 }]);
    setQuery("");
    setResults([]);
  }

  function updateQuantity(index: number, quantity: number) {
    setDraft((prev) => prev.map((item, i) => (i === index ? { ...item, quantity } : item)));
  }

  function removeDraftItem(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitMeal() {
    if (!accessToken || draft.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/v1/meals", accessToken, {
        method: "POST",
        body: JSON.stringify({
          logged_at: new Date().toISOString(),
          meal_type: mealType,
          items: draft.map((item) => ({
            food_id: item.food.id,
            serving_id: item.servingId,
            quantity: item.quantity,
          })),
        }),
      });
      setDraft([]);
      await refreshMeals(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log meal");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteMeal(id: string) {
    if (!accessToken) return;
    try {
      await apiFetch(`/api/v1/meals/${id}`, accessToken, { method: "DELETE" });
      await refreshMeals(accessToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete meal");
    }
  }

  return (
    <AppShell>
      <h1 className="mb-5 text-xl font-semibold">Log a meal</h1>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5 text-sm text-danger">{error}</Card>
      )}

      <Card className="mb-4">
        <div className="mb-3 flex gap-1.5">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${
                mealType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-bg text-text-muted"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <Input
          type="text"
          autoComplete="off"
          placeholder="Search foods (e.g. idli, egg, rice)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {results.length > 0 && (
          <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
            {results.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => addToDraft(food)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-bg"
                >
                  {food.name}
                  <span className="ml-2 text-xs text-text-muted">
                    {food.food_servings?.[0]?.serving_description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {draft.length > 0 && (
          <ul className="mt-4 space-y-2">
            {draft.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
              >
                <span className="flex-1 text-sm">
                  {item.food.name}
                  <span className="ml-1 text-xs text-text-muted">
                    (
                    {
                      item.food.food_servings?.find((s) => s.id === item.servingId)
                        ?.serving_description
                    }
                    )
                  </span>
                </span>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(i, Number(e.target.value))}
                  className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeDraftItem(i)}
                  className="text-xs text-danger"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {draft.length > 0 && (
          <Button onClick={submitMeal} disabled={submitting} className="mt-4 w-full">
            {submitting ? "Logging..." : "Log meal"}
          </Button>
        )}
      </Card>

      <h2 className="mb-2 text-sm font-medium text-text-muted">Today&apos;s meals</h2>
      {meals.length === 0 && <p className="text-sm text-text-muted">Nothing logged yet.</p>}
      <ul className="space-y-3">
        {meals.map((meal) => (
          <Card key={meal.id}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">{meal.meal_type}</span>
              <button
                type="button"
                onClick={() => deleteMeal(meal.id)}
                className="text-xs text-danger"
              >
                Delete
              </button>
            </div>
            <ul className="mt-1 text-sm text-text-muted">
              {meal.meal_items?.map((item) => (
                <li key={item.id}>
                  {item.quantity}x {item.food_name} — {Math.round(item.calories)} kcal
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </ul>
    </AppShell>
  );
}
