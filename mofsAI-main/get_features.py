"""Print feature names as JSON for the /api/features endpoint."""
import json
import sys

try:
    import joblib
    features = joblib.load("features.pkl")
    print(json.dumps({"features": list(features)}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
