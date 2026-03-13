from __future__ import annotations

from typing import Any, Dict, List, Tuple


DEFAULT_REQUIRED_FEATURES = [
    "band_gap",
    "mobility",
    "dielectric_constant",
    "temperature",
]


def validate_dataset(
    analysis: Dict[str, Any],
    detected_mapping: Dict[str, str] | None,
    *,
    minimum_rows: int = 50,
    max_missing_ratio: float = 0.1,
    required_features: List[str] | None = None,
) -> Dict[str, Any]:
    """
    Compute dataset quality score and suitability for training.

    Inputs:
      - analysis: output of data_analyzer.analyze_dataset_csv()
      - detected_mapping: {source_column: canonical_or_model_feature}
    """
    required = required_features or DEFAULT_REQUIRED_FEATURES
    reasons: List[str] = []

    row_count = int(analysis.get("row_count") or 0)
    if row_count < minimum_rows:
        reasons.append(f"Too few rows: {row_count} < {minimum_rows}")

    missing_values = analysis.get("missing_values") or {}
    total_missing = 0
    total_cells = max(1, row_count * max(1, len(analysis.get("columns") or [])))
    for v in missing_values.values():
        try:
            total_missing += int(v)
        except Exception:
            pass
    missing_ratio = total_missing / total_cells
    if missing_ratio > max_missing_ratio:
        reasons.append(f"Too many missing values: {missing_ratio:.2%} > {max_missing_ratio:.2%}")

    # Determine which canonical features are present based on mapping
    mapped_targets = set((detected_mapping or {}).values())
    missing_required = [f for f in required if f not in mapped_targets]
    if missing_required:
        reasons.append(f"Missing required features: {', '.join(missing_required)}")

    # Scoring (simple heuristic 0-100)
    score = 100.0
    if row_count < minimum_rows:
        score -= min(40.0, (minimum_rows - row_count) * 0.8)
    score -= min(40.0, missing_ratio * 200.0)  # 0.1 -> -20
    score -= min(30.0, len(missing_required) * 10.0)
    score = max(0.0, min(100.0, score))

    status = "suitable" if score >= 70.0 and not reasons else "not_suitable"

    return {
        "quality_score": int(round(score)),
        "status": status,
        "reasons": reasons,
        "missing_ratio": missing_ratio,
        "required_features": required,
    }

