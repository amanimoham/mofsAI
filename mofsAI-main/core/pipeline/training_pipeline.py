from __future__ import annotations

import io
from typing import Any, Dict, List, Optional, Tuple


def train_from_csv(
    csv_text: str,
    *,
    target_column: str,
    output_model_path: str = "material_model.pkl",
    output_features_path: str = "features.pkl",
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Train an ML model on a CSV dataset.

    Requirements:
      - pandas
      - scikit-learn
      - xgboost
      - joblib

    Returns:
      {
        "trained": true/false,
        "model_accuracy": 0-1,
        "feature_importance": {feature: importance},
        "feature_names": [...],
      }
    """
    import pandas as pd
    import numpy as np
    import joblib
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import r2_score

    try:
        from xgboost import XGBRegressor
    except Exception as e:
        raise RuntimeError(f"xgboost is required for training: {e}")

    df = pd.read_csv(io.StringIO(csv_text))
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    df = df.dropna(subset=[target_column])
    y = df[target_column]
    X = df.drop(columns=[target_column])

    # Keep numeric columns only for training
    X = X.apply(pd.to_numeric, errors="coerce")
    X = X.fillna(X.median(numeric_only=True))

    feature_names = list(X.columns.astype(str))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state
    )

    model = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("model", XGBRegressor(objective="reg:squarederror", random_state=random_state)),
        ]
    )

    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    accuracy = float(r2_score(y_test, preds)) if len(y_test) > 0 else 0.0

    # Try to extract feature importances if possible
    importance: Dict[str, float] = {}
    try:
        booster = model.named_steps["model"]
        if hasattr(booster, "feature_importances_"):
            fi = booster.feature_importances_
            for i, f in enumerate(feature_names):
                importance[str(f)] = float(fi[i]) if i < len(fi) else 0.0
    except Exception:
        importance = {}

    joblib.dump(model, output_model_path)
    joblib.dump(feature_names, output_features_path)

    return {
        "trained": True,
        "model_accuracy": accuracy,
        "feature_importance": importance,
        "feature_names": feature_names,
    }

