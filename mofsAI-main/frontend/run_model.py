"""
Run ML model for prediction. Loads model from project root.
Accepts JSON via stdin; prints {"prediction": [...]} or {"error": "..."}.
"""
import sys
import json
import os

# Project root = parent of frontend/
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)


def main():
    try:
        # Read JSON input from stdin
        input_json = sys.stdin.read()
        data = json.loads(input_json)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    try:
        import joblib
        model_path = os.path.join(PROJECT_ROOT, "material_model.pkl")
        features_path = os.path.join(PROJECT_ROOT, "features.pkl")
        model = joblib.load(model_path)
        features = list(joblib.load(features_path))
    except FileNotFoundError as e:
        print(json.dumps({"error": f"Model files not found: {e}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load model: {e}"}))
        sys.exit(1)

    try:
        from core.feature_mapper import (
            get_feature_defaults_from_trained_scaler,
            map_row_to_model_input,
        )

        defaults = get_feature_defaults_from_trained_scaler(
            project_root=PROJECT_ROOT,
            model_features=[str(f) for f in features],
        )
        values, detected_mapping, missing_features = map_row_to_model_input(
            row=data,
            model_features=[str(f) for f in features],
            defaults=defaults,
        )

        # Logging (stdout JSON also contains mapping for UI)
        print(
            json.dumps(
                {
                    "log": {
                        "detected_mapping": detected_mapping,
                        "missing_features": missing_features,
                    }
                }
            ),
            file=sys.stderr,
        )
    except Exception as e:
        print(json.dumps({"error": f"Feature mapping failed: {e}"}))
        sys.exit(1)

    try:
        prediction = model.predict([values])
        result = prediction.tolist()
        print(
            json.dumps(
                {
                    "prediction": result,
                    "result": result[0],
                    "detected_mapping": detected_mapping,
                    "missing_features": missing_features,
                }
            )
        )
    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
