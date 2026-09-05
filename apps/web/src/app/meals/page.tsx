"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchDropdown } from "@/components/ui/SearchDropdown";
import type { Food, Meal, PhotoAnalysisResponse } from "@jarvis/types";

type MealType = Meal["meal_type"];

interface DraftItem {
  foodId: string;
  foodName: string;
  servingId: string;
  servingDescription?: string;
  quantity: number;
}

interface UnresolvedPhotoItem {
  foodName: string;
  quantity: number;
}

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

async function compressImage(file: File, maxDim = 1024, quality = 0.7): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image"))),
      "image/jpeg",
      quality,
    );
  });
}

export default function MealsPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [unresolvedPhotoItems, setUnresolvedPhotoItems] = useState<UnresolvedPhotoItem[]>([]);
  const [mealSource, setMealSource] = useState<"manual" | "photo">("manual");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [estimatingFood, setEstimatingFood] = useState(false);
  const [foodSearchFocused, setFoodSearchFocused] = useState(false);

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
    setDraft((prev) => [
      ...prev,
      {
        foodId: food.id,
        foodName: food.name,
        servingId: serving.id,
        servingDescription: serving.serving_description,
        quantity: 1,
      },
    ]);
    setQuery("");
    setResults([]);
  }

  async function estimateNewFood(name: string) {
    if (!accessToken) return;
    setEstimatingFood(true);
    setError(null);
    try {
      const food = await apiFetch<Food>("/api/v1/foods/estimate", accessToken, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      addToDraft(food);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to estimate that food");
    } finally {
      setEstimatingFood(false);
    }
  }

  function updateQuantity(index: number, quantity: number) {
    setDraft((prev) => prev.map((item, i) => (i === index ? { ...item, quantity } : item)));
  }

  function removeDraftItem(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;

    setAnalyzingPhoto(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("photo", compressed, "meal.jpg");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/meals/analyze-photo`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Failed to analyze photo");
      }
      const data: PhotoAnalysisResponse = await res.json();

      setMealSource("photo");
      const resolved: DraftItem[] = [];
      const unresolved: UnresolvedPhotoItem[] = [];
      for (const item of data.items) {
        if (item.resolved) {
          resolved.push({
            foodId: item.resolved.food_id,
            foodName: item.resolved.food_name,
            servingId: item.resolved.serving_id,
            servingDescription: item.resolved.serving_description,
            quantity: item.quantity,
          });
        } else {
          unresolved.push({ foodName: item.food_name, quantity: item.quantity });
        }
      }
      if (resolved.length === 0 && unresolved.length === 0) {
        setError("Couldn't identify any food in that photo -- try a clearer shot, or log it manually.");
      }
      setDraft((prev) => [...prev, ...resolved]);
      setUnresolvedPhotoItems((prev) => [...prev, ...unresolved]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze photo");
    } finally {
      setAnalyzingPhoto(false);
    }
  }

  function searchForUnresolved(foodName: string) {
    setQuery(foodName);
  }

  function dismissUnresolved(index: number) {
    setUnresolvedPhotoItems((prev) => prev.filter((_, i) => i !== index));
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
          input_source: mealSource,
          items: draft.map((item) => ({
            food_id: item.foodId,
            serving_id: item.servingId,
            quantity: item.quantity,
          })),
        }),
      });
      setDraft([]);
      setUnresolvedPhotoItems([]);
      setMealSource("manual");
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

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              autoComplete="off"
              placeholder="Search foods (e.g. idli, egg, rice)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFoodSearchFocused(true)}
              onBlur={() => setTimeout(() => setFoodSearchFocused(false), 150)}
            />
            <SearchDropdown
              items={results}
              getKey={(food) => food.id}
              onSelect={addToDraft}
              renderItem={(food) => (
                <>
                  {food.name}
                  <span className="ml-2 text-xs text-text-muted">
                    {food.food_servings?.[0]?.serving_description}
                  </span>
                </>
              )}
              open={foodSearchFocused}
              query={query}
              onEstimate={estimateNewFood}
              estimating={estimatingFood}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelected}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzingPhoto}
          >
            {analyzingPhoto ? "..." : "📷"}
          </Button>
        </div>

        {unresolvedPhotoItems.length > 0 && (
          <ul className="mt-4 space-y-2">
            {unresolvedPhotoItems.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm"
              >
                <span className="flex-1">
                  Couldn&apos;t find &quot;{item.foodName}&quot; ({item.quantity})
                </span>
                <button
                  type="button"
                  onClick={() => searchForUnresolved(item.foodName)}
                  className="text-xs text-primary"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => dismissUnresolved(i)}
                  className="text-xs text-danger"
                >
                  Dismiss
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
                  {item.foodName}
                  <span className="ml-1 text-xs text-text-muted">
                    ({item.servingDescription})
                  </span>
                  {mealSource === "photo" && (
                    <span className="ml-1 text-xs text-text-muted">· estimated</span>
                  )}
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
                  {item.nutrition_confidence === "estimated" && (
                    <span className="ml-1 text-xs italic">(estimated)</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </ul>
    </AppShell>
  );
}
