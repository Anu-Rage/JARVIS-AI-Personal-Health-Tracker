"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchDropdown } from "@/components/ui/SearchDropdown";
import { DateNav, dayLabel, todayLocal } from "@/components/ui/DateNav";
import type { Exercise, WorkoutSession } from "@jarvis/types";

interface DraftSet {
  reps: number;
  weight_kg: number;
}

interface DraftExercise {
  exercise: Exercise;
  sets: DraftSet[];
}

export default function WorkoutsPage() {
  const supabase = createClient();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [estimatingExercise, setEstimatingExercise] = useState(false);
  const [exerciseSearchFocused, setExerciseSearchFocused] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
    });
  }, [supabase]);

  useEffect(() => {
    if (accessToken) refreshSessions(accessToken, selectedDate);
  }, [accessToken, selectedDate]);

  useEffect(() => {
    if (!accessToken) return;
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<Exercise[]>(
          `/api/v1/exercises${query ? `?query=${encodeURIComponent(query)}` : ""}`,
          accessToken,
        );
        setResults(data);
      } catch {
        // search errors aren't critical enough to surface as a page-level error
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, accessToken]);

  async function refreshSessions(token: string, forDate: string) {
    try {
      const data = await apiFetch<WorkoutSession[]>(
        `/api/v1/workouts?for_date=${forDate}`,
        token,
      );
      setSessions(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load workouts");
    }
  }

  function addExercise(exercise: Exercise) {
    setDraft((prev) => [...prev, { exercise, sets: [{ reps: 8, weight_kg: 0 }] }]);
    setQuery("");
    setResults([]);
  }

  async function estimateNewExercise(name: string) {
    if (!accessToken) return;
    setEstimatingExercise(true);
    setError(null);
    try {
      const exercise = await apiFetch<Exercise>("/api/v1/exercises/estimate", accessToken, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      addExercise(exercise);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add that exercise");
    } finally {
      setEstimatingExercise(false);
    }
  }

  function addSet(exerciseIndex: number) {
    setDraft((prev) =>
      prev.map((item, i) => {
        if (i !== exerciseIndex) return item;
        const last = item.sets[item.sets.length - 1];
        return { ...item, sets: [...item.sets, { ...last }] };
      }),
    );
  }

  function updateSet(exerciseIndex: number, setIndex: number, field: keyof DraftSet, value: number) {
    setDraft((prev) =>
      prev.map((item, i) => {
        if (i !== exerciseIndex) return item;
        return {
          ...item,
          sets: item.sets.map((s, j) => (j === setIndex ? { ...s, [field]: value } : s)),
        };
      }),
    );
  }

  function removeExercise(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitWorkout() {
    if (!accessToken || draft.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/v1/workouts", accessToken, {
        method: "POST",
        body: JSON.stringify({
          started_at: new Date().toISOString(),
          exercises: draft.map((item) => ({
            exercise_id: item.exercise.id,
            sets: item.sets,
          })),
        }),
      });
      setDraft([]);
      // A new session is always logged for right now, so jump the view back
      // to today if you'd been browsing a past day.
      const today = todayLocal();
      if (selectedDate !== today) {
        setSelectedDate(today);
      } else {
        await refreshSessions(accessToken, today);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log workout");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSession(id: string) {
    if (!accessToken) return;
    try {
      await apiFetch(`/api/v1/workouts/${id}`, accessToken, { method: "DELETE" });
      await refreshSessions(accessToken, selectedDate);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete workout");
    }
  }

  return (
    <AppShell>
      <h1 className="mb-5 text-xl font-semibold">Log a workout</h1>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5 text-sm text-danger">{error}</Card>
      )}

      <Card className="mb-4">
        <div className="relative">
          <Input
            type="text"
            autoComplete="off"
            placeholder="Search exercises (e.g. squat, pull-up)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setExerciseSearchFocused(true)}
            onBlur={() => setTimeout(() => setExerciseSearchFocused(false), 150)}
          />
          <SearchDropdown
            items={results}
            getKey={(exercise) => exercise.id}
            onSelect={addExercise}
            renderItem={(exercise) => (
              <>
                {exercise.name}
                <span className="ml-2 text-xs capitalize text-text-muted">
                  {exercise.category}
                </span>
              </>
            )}
            open={exerciseSearchFocused}
            query={query}
            onEstimate={estimateNewExercise}
            estimating={estimatingExercise}
          />
        </div>

        {draft.length > 0 && (
          <ul className="mt-4 space-y-3">
            {draft.map((item, exerciseIndex) => (
              <li key={exerciseIndex} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{item.exercise.name}</span>
                  <button
                    type="button"
                    onClick={() => removeExercise(exerciseIndex)}
                    className="text-xs text-danger"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-1.5">
                  {item.sets.map((set, setIndex) => (
                    <div key={setIndex} className="flex items-center gap-2 text-sm">
                      <span className="w-4 text-xs text-text-muted">{setIndex + 1}</span>
                      <input
                        type="number"
                        min={0}
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(exerciseIndex, setIndex, "reps", Number(e.target.value))
                        }
                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1"
                      />
                      <span className="text-xs text-text-muted">reps @</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={set.weight_kg}
                        onChange={(e) =>
                          updateSet(exerciseIndex, setIndex, "weight_kg", Number(e.target.value))
                        }
                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1"
                      />
                      <span className="text-xs text-text-muted">kg</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addSet(exerciseIndex)}
                  className="mt-2 text-xs text-primary"
                >
                  + Add set
                </button>
              </li>
            ))}
          </ul>
        )}

        {draft.length > 0 && (
          <Button onClick={submitWorkout} disabled={submitting} className="mt-4 w-full">
            {submitting ? "Logging..." : "Log workout"}
          </Button>
        )}
      </Card>

      <DateNav date={selectedDate} onChange={setSelectedDate} />

      <h2 className="mb-2 text-sm font-medium text-text-muted">Workouts — {dayLabel(selectedDate)}</h2>
      {sessions.length === 0 && <p className="text-sm text-text-muted">Nothing logged yet.</p>}
      <ul className="space-y-3">
        {sessions.map((session) => (
          <Card key={session.id}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {new Date(session.started_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">
                  {Math.round(session.total_volume_kg)} kg total
                </span>
                <button
                  type="button"
                  onClick={() => deleteSession(session.id)}
                  className="text-xs text-danger"
                >
                  Delete
                </button>
              </div>
            </div>
            <ul className="mt-1 text-sm text-text-muted">
              {session.workout_exercises?.map((we) => (
                <li key={we.id}>
                  {we.exercise_name} —{" "}
                  {we.workout_sets
                    ?.map((s) => `${s.reps ?? 0}x${s.weight_kg ?? 0}kg`)
                    .join(", ")}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </ul>
    </AppShell>
  );
}
