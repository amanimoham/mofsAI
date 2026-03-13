import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, KFold, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBRegressor

df = pd.read_csv("data.csv")
df = df.dropna()

X = df.drop("critical_temp", axis=1)
y = df["critical_temp"]

feature_names = X.columns

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

kfold = KFold(n_splits=5, shuffle=True, random_state=42)

pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("model", XGBRegressor(objective="reg:squarederror"))
])

params = {
    "model__n_estimators": [300,500,800],
    "model__max_depth": [4,6,8,10],
    "model__learning_rate": [0.01,0.05,0.1],
    "model__subsample": [0.7,0.9,1.0]
}

search = RandomizedSearchCV(
    pipe,
    params,
    n_iter=20,
    cv=kfold,
    scoring="r2",
    n_jobs=-1,
    random_state=42
)

search.fit(X_train, y_train)

best_model = search.best_estimator_

joblib.dump(best_model,"material_model.pkl")
joblib.dump(feature_names,"features.pkl")

print("Model saved successfully")