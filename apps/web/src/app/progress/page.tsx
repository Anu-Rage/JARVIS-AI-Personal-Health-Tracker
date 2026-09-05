"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { BodyMetric } from "@jarvis/types";

const METRIC_TYPES = [
  { value: "weight", label: "Weight", unit: "kg" },
  { value: "waist", label: "Waist", unit: "cm" },
  { value: "chest", label: "Chest", unit: "cm" },
  { value: "hips", label: "Hips", unit: "cm" },
  { value: "arm", label: "Arm", unit: "cm" },
  { value: "thigh", label: "Thigh", unit: "cm" },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const supabase = createClient();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [metricType, setMetricType] = useState(METRIC_TYPES[0].value);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeType = METRIC_TYPES.find((t) => t.value === metricType)!;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
    });
  }, [supabase]);

  useEffect(() => {
    if (accessToken) refreshMetrics(accessToken, metricType);
  }, [accessToken, metricType]);

  async function refreshMetrics(token: string, type: string) {
    try {
      const data = await apiFetch<BodyMetric[]>(
        `/api/v1/body-metrics?metric_type=${encodeURIComponent(type)}`,
        token,
      );
      setMetrics(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load progress data");
    }
  }

  async function submitMetric() {
    if (!accessToken || !value) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/v1/body-metrics", accessToken, {
        method: "POST",
        body: JSON.stringify({
          recorded_at: new Date(date).toISOString(),
          metric_type: metricType,
          value: Number(value),
          unit: activeType.unit,
        }),
      });
      setValue("");
      await refreshMetrics(accessToken, metricType);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to log entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteMetric(id: string) {
    if (!accessToken) return;
    try {
      await apiFetch(`/api/v1/body-metrics/${id}`, accessToken, { method: "DELETE" });
      await refreshMetrics(accessToken, metricType);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete entry");
    }
  }

  return (
    <AppShell>
      <h1 className="mb-5 text-xl font-semibold">Progress</h1>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5 text-sm text-danger">{error}</Card>
      )}

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {METRIC_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setMetricType(type.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                metricType === type.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-bg text-text-muted"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-text-muted">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-text-muted">
              {activeType.label} ({activeType.unit})
            </label>
            <input
              type="number"
              step={0.1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        <Button onClick={submitMetric} disabled={submitting || !value} className="mt-4 w-full">
          {submitting ? "Saving..." : "Log entry"}
        </Button>
      </Card>

      <h2 className="mb-2 text-sm font-medium text-text-muted">{activeType.label} history</h2>
      {metrics.length === 0 && <p className="text-sm text-text-muted">No entries yet.</p>}
      <ul className="space-y-2">
        {metrics.map((metric) => (
          <Card key={metric.id} className="flex items-center justify-between py-2.5">
            <span className="text-sm">
              {new Date(metric.recorded_at).toLocaleDateString()}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tabular-nums">
                {metric.value} {metric.unit}
              </span>
              <button
                type="button"
                onClick={() => deleteMetric(metric.id)}
                className="text-xs text-danger"
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </ul>
    </AppShell>
  );
}
