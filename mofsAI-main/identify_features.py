"""
CLI entrypoint for column meaning detection.

Reads JSON from stdin:
{
  "columns": ["Eg", "Mobility_cm2", "Temp_K"],
  "target_features": ["feature_a", "feature_b", ...]   // optional
}

Prints JSON to stdout:
{
  "mapping": {"Eg": "band_gap", ...},
  "logs": ["[matched] ...", ...]
}
"""

import json
import sys

from core.feature_identifier import identify_columns


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    columns = payload.get("columns") or []
    target_features = payload.get("target_features", None)

    if not isinstance(columns, list) or not all(isinstance(c, str) for c in columns):
        print(json.dumps({"error": "`columns` must be a list of strings"}))
        sys.exit(1)

    if target_features is not None:
        if not isinstance(target_features, list) or not all(isinstance(t, str) for t in target_features):
            print(json.dumps({"error": "`target_features` must be a list of strings"}))
            sys.exit(1)

    mapping, logs = identify_columns(columns, target_features=target_features)
    print(json.dumps({"mapping": mapping, "logs": logs}))


if __name__ == "__main__":
    main()

