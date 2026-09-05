from datetime import date, datetime, timezone

from supabase import Client

from app.domain.dates import local_day_bounds_utc
from app.domain.workout import SetVolume, calculate_total_volume
from app.schemas.workout import WorkoutSessionCreate

_SESSION_SELECT = "*, workout_exercises(*, exercises(name), workout_sets(*))"


class ExerciseNotFoundError(ValueError):
    """Raised when a workout references an exercise that doesn't exist."""


def _with_computed_volume(session: dict) -> dict:
    session_sets: list[SetVolume] = []
    for we in session.get("workout_exercises", []):
        exercise = we.pop("exercises", None)
        we["exercise_name"] = exercise["name"] if exercise else None

        exercise_sets = [
            SetVolume(reps=s["reps"] or 0, weight_kg=s["weight_kg"] or 0)
            for s in we.get("workout_sets", [])
        ]
        we["volume_kg"] = calculate_total_volume(exercise_sets)
        session_sets.extend(exercise_sets)

    session["workout_exercises"].sort(key=lambda we: we["order_index"])
    session["total_volume_kg"] = calculate_total_volume(session_sets)
    return session


def create_session(client: Client, user_id: str, data: WorkoutSessionCreate) -> dict:
    exercise_ids = [ex.exercise_id for ex in data.exercises]
    found = client.table("exercises").select("id").in_("id", exercise_ids).execute()
    found_ids = {row["id"] for row in found.data}
    missing = set(exercise_ids) - found_ids
    if missing:
        raise ExerciseNotFoundError(f"Unknown exercise id(s): {', '.join(missing)}")

    session_result = (
        client.table("workout_sessions")
        .insert(
            {
                "user_id": user_id,
                "started_at": data.started_at.isoformat(),
                "ended_at": data.ended_at.isoformat() if data.ended_at else None,
                "notes": data.notes,
            }
        )
        .execute()
    )
    session = session_result.data[0]

    for order_index, exercise in enumerate(data.exercises):
        we_result = (
            client.table("workout_exercises")
            .insert(
                {
                    "session_id": session["id"],
                    "exercise_id": exercise.exercise_id,
                    "order_index": order_index,
                }
            )
            .execute()
        )
        workout_exercise = we_result.data[0]

        sets_payload = [
            {
                "workout_exercise_id": workout_exercise["id"],
                "set_number": set_index + 1,
                "reps": s.reps,
                "weight_kg": s.weight_kg,
                "duration_seconds": s.duration_seconds,
            }
            for set_index, s in enumerate(exercise.sets)
        ]
        client.table("workout_sets").insert(sets_payload).execute()

    return get_session(client, user_id, session["id"])


def get_session(client: Client, user_id: str, session_id: str) -> dict | None:
    result = (
        client.table("workout_sessions")
        .select(_SESSION_SELECT)
        .eq("id", session_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if result is None or result.data is None:
        return None
    return _with_computed_volume(result.data)


def list_sessions(
    client: Client, user_id: str, for_date: date | None = None, tz_name: str | None = None
) -> list[dict]:
    request = (
        client.table("workout_sessions")
        .select(_SESSION_SELECT)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .order("started_at", desc=True)
    )
    if for_date is not None:
        start, end = local_day_bounds_utc(for_date, tz_name)
        request = request.gte("started_at", start).lte("started_at", end)
    return [_with_computed_volume(session) for session in request.execute().data]


def soft_delete_session(client: Client, user_id: str, session_id: str) -> bool:
    result = (
        client.table("workout_sessions")
        .update({"deleted_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", session_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    return len(result.data) > 0
