def name_variants(name: str) -> list[str]:
    """A name and its simple singular/plural counterpart, for exact-match
    lookups where a model might say "pull-ups" but the reference data has
    "Pull-up". Deliberately simple (no stemming library) -- this only
    covers the common trailing-s case, and is used for exact matching
    only, never to broaden a fuzzy/ambiguous search.
    """
    name = name.strip()
    if name.endswith("s") and len(name) > 1:
        return [name, name[:-1]]
    return [name, f"{name}s"]
