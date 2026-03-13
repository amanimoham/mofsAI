import json
import sys

from core.pipeline.training_pipeline import train_from_csv


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    csv_text = payload.get("csv_text")
    target_column = payload.get("target_column")

    if not isinstance(csv_text, str) or not csv_text.strip():
        print(json.dumps({"error": "`csv_text` is required"}))
        sys.exit(1)
    if not isinstance(target_column, str) or not target_column.strip():
        print(json.dumps({"error": "`target_column` is required"}))
        sys.exit(1)

    try:
        result = train_from_csv(csv_text, target_column=target_column)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"trained": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()

