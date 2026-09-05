"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import type { WeeklyReport } from "@jarvis/types";

export function WeeklyReportButton() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const result = await apiFetch<WeeklyReport>(
        "/api/v1/reports/weekly",
        session.access_token,
      );
      setReport(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      {report ? (
        <p className="text-sm text-text-muted">{report.narrative}</p>
      ) : (
        <Button variant="secondary" onClick={generate} disabled={loading} className="w-full">
          {loading ? "Generating..." : "Generate weekly report"}
        </Button>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
