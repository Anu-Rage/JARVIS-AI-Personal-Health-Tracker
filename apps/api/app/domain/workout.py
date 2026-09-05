from dataclasses import dataclass


@dataclass(frozen=True)
class SetVolume:
    reps: int
    weight_kg: float

    @property
    def volume_kg(self) -> float:
        return self.reps * self.weight_kg


def calculate_total_volume(sets: list[SetVolume]) -> float:
    """Total volume for a session/exercise: sum of reps x weight across sets."""
    return sum(s.volume_kg for s in sets)
