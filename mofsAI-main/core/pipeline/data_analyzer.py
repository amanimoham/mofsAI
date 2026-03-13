from __future__ import annotations

from dataclasses import asdict, dataclass
import io
import json
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class ColumnStats:
    mean: Optional[float]
    std: Optional[float]
    missing: int
    missing_ratio: float
    outliers_iqr: int


def _safe_float(x: Any) -> Optional[float]:
    try:
        if x is None:
            return None
        v = float(x)
        if v != v:  # NaN
            return None
        return v
    except Exception:
        return None


def read_csv_from_text(csv_text: str):
    """
    Read a CSV dataset from a string.
    Requires pandas; errors are raised to caller.
    """
    import pandas as pd

    return pd.read_csv(io.StringIO(csv_text))


def detect_column_types(df) -> Dict[str, str]:
    """
    Very lightweight type inference.
    Returns: {column: 'numeric'|'categorical'|'datetime'|'unknown'}
    """
    import pandas as pd

    types: Dict[str, str] = {}
    for c in df.columns:
        s = df[c]
        if pd.api.types.is_numeric_dtype(s):
            types[str(c)] = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(s):
            types[str(c)] = "datetime"
        elif pd.api.types.is_string_dtype(s) or pd.api.types.is_object_dtype(s):
            # heuristic: mostly numeric-like strings -> numeric
            sample = s.dropna().astype(str).head(50).tolist()
            numeric_like = 0
            for v in sample:
                try:
                    float(v)
                    numeric_like += 1
                except Exception:
                    pass
            if sample and numeric_like / max(1, len(sample)) >= 0.8:
                types[str(c)] = "numeric"
            else:
                types[str(c)] = "categorical"
        else:
            types[str(c)] = "unknown"
    return types


def compute_numeric_stats(df) -> Dict[str, ColumnStats]:
    """
    Compute mean/std/missing/outliers for numeric columns.
    Outliers use a simple IQR rule.
    """
    import numpy as np
    import pandas as pd

    stats: Dict[str, ColumnStats] = {}
    row_count = int(len(df))
    for c in df.columns:
        s = df[c]
        # treat numeric-like as numeric
        if not pd.api.types.is_numeric_dtype(s):
            try:
                s = pd.to_numeric(s, errors="coerce")
            except Exception:
                continue

        missing = int(s.isna().sum())
        missing_ratio = float(missing / max(1, row_count))

        valid = s.dropna().astype(float)
        if len(valid) == 0:
            stats[str(c)] = ColumnStats(
                mean=None,
                std=None,
                missing=missing,
                missing_ratio=missing_ratio,
                outliers_iqr=0,
            )
            continue

        mean = float(valid.mean())
        std = float(valid.std(ddof=1)) if len(valid) > 1 else 0.0

        q1 = float(valid.quantile(0.25))
        q3 = float(valid.quantile(0.75))
        iqr = q3 - q1
        if iqr <= 0:
            outliers = 0
        else:
            lo = q1 - 1.5 * iqr
            hi = q3 + 1.5 * iqr
            outliers = int(((valid < lo) | (valid > hi)).sum())

        stats[str(c)] = ColumnStats(
            mean=mean,
            std=std,
            missing=missing,
            missing_ratio=missing_ratio,
            outliers_iqr=outliers,
        )

    return stats


def analyze_dataset_csv(csv_text: str) -> Dict[str, Any]:
    """
    Analyze a dataset CSV text and return a JSON-serializable summary:
    {
      "columns": [...],
      "row_count": 120,
      "column_types": {...},
      "missing_values": {...},
      "statistics": {...}
    }
    """
    df = read_csv_from_text(csv_text)
    row_count = int(len(df))
    columns = [str(c) for c in df.columns]

    column_types = detect_column_types(df)
    numeric_stats = compute_numeric_stats(df)

    missing_values = {c: int(df[c].isna().sum()) for c in df.columns}

    statistics = {k: asdict(v) for k, v in numeric_stats.items()}

    return {
        "columns": columns,
        "row_count": row_count,
        "column_types": column_types,
        "missing_values": {str(k): int(v) for k, v in missing_values.items()},
        "statistics": statistics,
    }

