import sys
import json

def predict():
    # Read input: from stdin (when called by Next.js) or from argv
    if len(sys.argv) > 1:
        input_json = sys.argv[1]
    else:
        input_json = sys.buffer.read().decode("utf-8")

    try:
        data = json.loads(input_json)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    try:
        import joblib
        model = joblib.load("material_model.pkl")
        features = list(joblib.load("features.pkl"))
    except FileNotFoundError as e:
        print(json.dumps({"error": f"Model files not found. Run from project root. {e}"}))
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
            project_root=".",
            model_features=[str(f) for f in features],
        )
        input_values, detected_mapping, missing_features = map_row_to_model_input(
            row=data,
            model_features=[str(f) for f in features],
            defaults=defaults,
        )
    except Exception as e:
        print(json.dumps({"error": f"Feature mapping failed: {e}"}))
        sys.exit(1)

    try:
        prediction = model.predict([input_values])
        print(
            json.dumps(
                {
                    "result": float(prediction[0]),
                    "detected_mapping": detected_mapping,
                    "missing_features": missing_features,
                }
            )
        )
    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    predict()
