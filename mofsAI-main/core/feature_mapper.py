from __future__ import annotations

from dataclasses import dataclass
from difflib import get_close_matches, SequenceMatcher
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple


def normalize_name(name: str) -> str:
    """
    Normalize column/feature names to improve matching.
    - lowercase
    - remove spaces, underscores, hyphens
    - remove punctuation
    """
    s = str(name).strip().lower()
    s = re.sub(r"[\s_\-\/]+", "", s)
    s = re.sub(r"[\(\)\[\]\{\}\.,:;]", "", s)
    return s


@dataclass(frozen=True)
class MappingResult:
    mapped: Dict[str, str]          # dataset_col -> model_feature
    missing: List[str]             # model features not found in dataset
    used_dataset_cols: List[str]


def _best_match(
    dataset_cols: List[str],
    model_feature: str,
    *,
    cutoff: float = 0.78,
) -> Optional[str]:
    """
    Find the closest dataset column for a given model feature using difflib.get_close_matches.
    Matching happens on normalized strings.
    """
    norm_to_raw = {normalize_name(c): c for c in dataset_cols}
    norm_dataset = list(norm_to_raw.keys())
    target = normalize_name(model_feature)
    if not target:
        return None

    # Exact normalized match
    if target in norm_to_raw:
        return norm_to_raw[target]

    # Fuzzy candidate list
    matches = get_close_matches(target, norm_dataset, n=1, cutoff=cutoff)
    if matches:
        return norm_to_raw[matches[0]]

    # Fallback: best ratio
    best = None
    best_score = 0.0
    for n in norm_dataset:
        score = SequenceMatcher(None, target, n).ratio()
        if score > best_score:
            best_score = score
            best = n
    if best and best_score >= max(0.70, cutoff - 0.05):
        return norm_to_raw[best]
    return None


def map_dataset_columns_to_model_features(
    dataset_columns: List[str],
    model_features: List[str],
    *,
    cutoff: float = 0.78,
) -> MappingResult:
    mapped: Dict[str, str] = {}
    used: set[str] = set()
    missing: List[str] = []

    for mf in model_features:
        src = _best_match(dataset_columns, mf, cutoff=cutoff)
        if src is None:
            missing.append(mf)
            continue
        if src in used:
            # if already used, still allow but prefer uniqueness; treat as missing
            missing.append(mf)
            continue
        used.add(src)
        mapped[src] = mf

    return MappingResult(mapped=mapped, missing=missing, used_dataset_cols=sorted(list(used)))


def get_model_feature_schema(
    *,
    project_root: str,
    features_pkl_path: str = "features.pkl",
    schema_json_path: str = os.path.join("core", "model_features.json"),
) -> List[str]:
    """
    Load required model features from features.pkl, and keep a JSON copy in core/model_features.json.
    """
    import joblib

    pkl = os.path.join(project_root, features_pkl_path)
    features = joblib.load(pkl)
    features_list = [str(f) for f in list(features)]

    # Best-effort write/update schema file for visibility.
    try:
        out_path = os.path.join(project_root, schema_json_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"features": features_list}, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

    return features_list


def get_feature_defaults_from_trained_scaler(
    *,
    project_root: str,
    model_path: str = "material_model.pkl",
    model_features: Optional[List[str]] = None,
) -> Dict[str, float]:
    """
    Use the trained StandardScaler.mean_ (if present) as statistical defaults.
    This is the best available "mean defaults" without requiring the raw training data.
    """
    import joblib

    model = joblib.load(os.path.join(project_root, model_path))
    scaler = None
    try:
        scaler = model.named_steps.get("scaler")
    except Exception:
        scaler = None

    if scaler is None or not hasattr(scaler, "mean_"):
        return {}

    means = list(getattr(scaler, "mean_"))
    if model_features is None:
        model_features = get_model_feature_schema(project_root=project_root)

    defaults: Dict[str, float] = {}
    for i, f in enumerate(model_features):
        if i < len(means):
            try:
                defaults[str(f)] = float(means[i])
            except Exception:
                defaults[str(f)] = 0.0
        else:
            defaults[str(f)] = 0.0
    return defaults


def map_row_to_model_input(
    row: Dict[str, Any],
    *,
    model_features: List[str],
    defaults: Dict[str, float],
    cutoff: float = 0.78,
) -> Tuple[List[float], Dict[str, str], List[str]]:
    """
    Map an arbitrary dataset row to the model's required feature vector order.

    Returns:
      vector: List[float] in model_features order
      detected_mapping: dataset_col -> model_feature
      missing_features: model features not found in row
    """
    dataset_cols = list(row.keys())
    mapping = map_dataset_columns_to_model_features(dataset_cols, model_features, cutoff=cutoff)

    # Reverse mapping: model_feature -> dataset_col
    inv = {mf: src for src, mf in mapping.mapped.items()}
    vector: List[float] = []
    for mf in model_features:
        src = inv.get(mf)
        if src is None:
            vector.append(float(defaults.get(mf, 0.0)))
            continue
        try:
            vector.append(float(row.get(src, defaults.get(mf, 0.0)) or defaults.get(mf, 0.0)))
        except Exception:
            vector.append(float(defaults.get(mf, 0.0)))

    return vector, mapping.mapped, mapping.missing

