import json
import sys

from core.pipeline.data_analyzer import read_csv_from_text
from core.feature_identifier import identify_columns


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    csv_text = payload.get("csv_text")
    top_k = payload.get("top_k", 3)

    if not isinstance(csv_text, str) or not csv_text.strip():
        print(json.dumps({"error": "`csv_text` is required"}))
        sys.exit(1)

    try:
        df = read_csv_from_text(csv_text)
        rows = df.fillna(0).to_dict(orient="records")
        columns = [str(c) for c in df.columns]

        mapping, logs = identify_columns(columns, target_features=None)

        # Build reverse mapping canonical -> source column
        canonical_to_source = {}
        for src, canon in mapping.items():
          canonical_to_source[canon] = src

        def get_val(row, canon):
          src = canonical_to_source.get(canon)
          if not src:
            return 0.0
          try:
            return float(row.get(src, 0) or 0)
          except Exception:
            return 0.0

        def get_name(row, idx):
          src = canonical_to_source.get("material_name")
          if src and str(row.get(src, "")).strip():
            return str(row.get(src))
          # common fallbacks
          for k in ["name", "material", "mof", "id"]:
            if k in row and str(row.get(k, "")).strip():
              return str(row.get(k))
          return f"Material_{idx+1}"

        scored = []
        for idx, row in enumerate(rows):
          score = (
            0.4 * get_val(row, "mobility")
            + 0.3 * get_val(row, "band_gap")
            + 0.2 * get_val(row, "dielectric_constant")
            + 0.1 * get_val(row, "temperature")
          )
          scored.append(
            {
              "idx": idx,
              "name": get_name(row, idx),
              "score": float(score),
              "features": {
                "band_gap": get_val(row, "band_gap"),
                "mobility": get_val(row, "mobility"),
                "dielectric_constant": get_val(row, "dielectric_constant"),
                "temperature": get_val(row, "temperature"),
              },
            }
          )

        scored.sort(key=lambda x: x["score"], reverse=True)
        top = scored[: max(1, int(top_k))]

        result = {
          "top_materials": [
            {"rank": i + 1, "name": m["name"], "score": m["score"], "features": m["features"]}
            for i, m in enumerate(top)
          ],
          "detection_logs": logs,
          "detected_mapping": mapping,
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()

