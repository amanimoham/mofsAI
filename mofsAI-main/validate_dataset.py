import json
import sys

from core.pipeline.dataset_validator import validate_dataset, DEFAULT_REQUIRED_FEATURES


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    analysis = payload.get("analysis")
    detected_mapping = payload.get("detected_mapping") or {}
    required_features = payload.get("required_features") or DEFAULT_REQUIRED_FEATURES

    if not isinstance(analysis, dict):
        print(json.dumps({"error": "`analysis` (dict) is required"}))
        sys.exit(1)
    if not isinstance(detected_mapping, dict):
        print(json.dumps({"error": "`detected_mapping` must be an object"}))
        sys.exit(1)
    if not isinstance(required_features, list):
        print(json.dumps({"error": "`required_features` must be a list"}))
        sys.exit(1)

    try:
        result = validate_dataset(
            analysis=analysis,
            detected_mapping=detected_mapping,
            required_features=[str(x) for x in required_features],
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()

