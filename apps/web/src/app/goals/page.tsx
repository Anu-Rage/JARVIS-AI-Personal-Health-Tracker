"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Goal } from "@jarvis/types";

interface FormState {
  calorie_target: string;
  protein_target_g: string;
  carb_target_g: string;
  fat_target_g: string;
  weight_goal_kg: string;
}

const EMPTY: FormState = {
  calorie_target: "",
  protein_target_g: "",
  carb_target_g: "",
  fat_target_g: "",
  weight_goal_kg: "",
};

function goalToForm(goal: Goal): FormState {
  return {
    calorie_target: goal.calorie_target?.toString() ?? "",
    protein_target_g: goal.protein_target_g?.toString() ?? "",
    carb_target_g: goal.carb_target_g?.toString() ?? "",
    fat_target_g: goal.fat_target_g?.toString() ?? "",
    weight_goal_kg: goal.weight_goal_kg?.toString() ?? "",
  };
}

const FIELDS: { key: keyof FormState; label: string; unit: string }[] = [
  { key: "calorie_target", label: "Daily calories", unit: "kcal" },
  { key: "protein_target_g", label: "Daily protein", unit: "g" },
  { key: "carb_target_g", label: "Daily carbs", unit: "g" },
  { key: "fat_target_g", label: "Daily fat", unit: "g" },
  { key: "weight_goal_kg", label: "Target weight", unit: "kg" },
];

export default function GoalsPage() {
  const supabase = createClient();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
    });
  }, [supabase]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Goal | null>("/api/v1/goals", accessToken)
      .then((goal) => {
        if (goal) setForm(goalToForm(goal));
      })
      .catch(() => {
        // no active goal yet is a normal state, not an error
      });
  }, [accessToken]);

  async function save() {
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/api/v1/goals", accessToken, {
        method: "POST",
        body: JSON.stringify({
          calorie_target: form.calorie_target ? Number(form.calorie_target) : null,
          protein_target_g: form.protein_target_g ? Number(form.protein_target_g) : null,
          carb_target_g: form.carb_target_g ? Number(form.carb_target_g) : null,
          fat_target_g: form.fat_target_g ? Number(form.fat_target_g) : null,
          weight_goal_kg: form.weight_goal_kg ? Number(form.weight_goal_kg) : null,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save goals");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <h1 className="mb-5 text-xl font-semibold">Goals</h1>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5 text-sm text-danger">{error}</Card>
      )}
      {saved && (
        <Card className="mb-4 border-primary/30 bg-primary/5 text-sm text-primary">
          Goals saved.
        </Card>
      )}

      <Card>
        <div className="space-y-3">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-text-muted">
                {field.label} ({field.unit})
              </label>
              <input
                type="number"
                min={0}
                value={form[field.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder="Not set"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <Button onClick={save} disabled={saving} className="mt-4 w-full">
          {saving ? "Saving..." : "Save goals"}
        </Button>
      </Card>
    </AppShell>
  );
}
