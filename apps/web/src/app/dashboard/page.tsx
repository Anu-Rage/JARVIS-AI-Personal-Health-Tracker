import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface UserProfile {
  id: string;
  display_name: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  let profile: UserProfile | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(`${apiUrl}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      error = `Backend returned ${res.status}`;
    } else {
      profile = await res.json();
    }
  } catch {
    error = "Could not reach the JARVIS API. Is it running?";
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {profile && (
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Display name</dt>
            <dd>{profile.display_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Timezone</dt>
            <dd>{profile.timezone}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Member since</dt>
            <dd>{new Date(profile.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>
      )}
    </main>
  );
}
