from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


DEFAULT_WEIGHTS = {
    "mobility": 0.4,
    "band_gap": 0.3,
    "dielectric_constant": 0.2,
    "temperature": 0.1,
}


def rank_materials(
    rows: List[Dict[str, Any]],
    *,
    mapping: Dict[str, str],
    weights: Dict[str, float] | None = None,
    name_field_candidates: List[str] | None = None,
    top_k: int = 3,
) -> Dict[str, Any]:
    """
    Rank materials for transistor applications using a weighted scoring function:

      score = 0.4 * mobility + 0.3 * band_gap + 0.2 * dielectric_constant + 0.1 * temperature

    Inputs:
      - rows: list of dict rows from CSV (header->value)
      - mapping: {source_column: canonical_feature} ideally contains mobility/band_gap/etc
    """
    weights = weights or DEFAULT_WEIGHTS
    name_field_candidates = name_field_candidates or [
        "material_name",
        "name",
        "material",
        "mof",
        "id",
    ]

    # Create a reverse lookup canonical -> source column
    canonical_to_source: Dict[str, str] = {}
    for src, canon in mapping.items():
        canonical_to_source[canon] = src

    def get_val(row: Dict[str, Any], canonical: str) -> float:
        src = canonical_to_source.get(canonical)
        if not src:
            return 0.0
        try:
            return float(row.get(src, 0) or 0)
        except Exception:
            return 0.0

    def get_name(row: Dict[str, Any], idx: int) -> str:
        # If the mapping found a material_name column, prefer it.
        if "material_name" in canonical_to_source:
            src = canonical_to_source["material_name"]
            v = row.get(src)
            if v is not None and str(v).strip():
                return str(v)
        # Otherwise try common candidates from raw columns.
        for c in name_field_candidates:
            if c in row and str(row.get(c, "")).strip():
                return str(row.get(c))
        return f"Material_{idx+1}"

    scored: List[Dict[str, Any]] = []
    for idx, row in enumerate(rows):
        score = 0.0
        for feat, w in weights.items():
            score += w * get_val(row, feat)
        scored.append(
            {
                "name": get_name(row, idx),
                "score": float(score),
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[: max(1, int(top_k))]
    top_materials = [
        {"rank": i + 1, "name": m["name"], "score": m["score"]} for i, m in enumerate(top)
    ]
    return {"top_materials": top_materials}

