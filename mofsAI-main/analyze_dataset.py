import json
import sys

from core.pipeline.data_analyzer import analyze_dataset_csv


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    csv_text = payload.get("csv_text")
    if not isinstance(csv_text, str) or not csv_text.strip():
        print(json.dumps({"error": "`csv_text` is required"}))
        sys.exit(1)

    try:
        analysis = analyze_dataset_csv(csv_text)
        print(json.dumps(analysis))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()

