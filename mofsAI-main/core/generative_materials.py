from __future__ import annotations

import io
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class VAEConfig:
    hidden_dim: int = 64
    latent_dim: int = 8
    lr: float = 1e-3
    epochs: int = 60
    batch_size: int = 64


def _load_numeric_features_from_csv(
    csv_text: str,
    *,
    exclude_columns: Optional[List[str]] = None,
) -> Tuple["pd.DataFrame", List[str]]:
    import pandas as pd

    df = pd.read_csv(io.StringIO(csv_text))
    exclude = set([c for c in (exclude_columns or []) if c])

    # Keep numeric-like columns only (for generative modeling)
    X = df.drop(columns=[c for c in df.columns if str(c) in exclude], errors="ignore")
    X = X.apply(pd.to_numeric, errors="coerce")
    X = X.dropna(axis=1, how="all")
    feature_names = [str(c) for c in X.columns]
    return X, feature_names


def _standardize(X):
    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    return Xs, scaler


def train_vae(Xs, config: VAEConfig):
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset

    n_features = Xs.shape[1]

    class Encoder(nn.Module):
        def __init__(self):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(n_features, config.hidden_dim),
                nn.ReLU(),
                nn.Linear(config.hidden_dim, config.hidden_dim),
                nn.ReLU(),
            )
            self.mu = nn.Linear(config.hidden_dim, config.latent_dim)
            self.logvar = nn.Linear(config.hidden_dim, config.latent_dim)

        def forward(self, x):
            h = self.net(x)
            return self.mu(h), self.logvar(h)

    class Decoder(nn.Module):
        def __init__(self):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(config.latent_dim, config.hidden_dim),
                nn.ReLU(),
                nn.Linear(config.hidden_dim, config.hidden_dim),
                nn.ReLU(),
                nn.Linear(config.hidden_dim, n_features),
            )

        def forward(self, z):
            return self.net(z)

    class VAE(nn.Module):
        def __init__(self):
            super().__init__()
            self.encoder = Encoder()
            self.decoder = Decoder()

        def reparameterize(self, mu, logvar):
            std = torch.exp(0.5 * logvar)
            eps = torch.randn_like(std)
            return mu + eps * std

        def forward(self, x):
            mu, logvar = self.encoder(x)
            z = self.reparameterize(mu, logvar)
            recon = self.decoder(z)
            return recon, mu, logvar

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = VAE().to(device)

    x_tensor = torch.tensor(Xs, dtype=torch.float32)
    loader = DataLoader(TensorDataset(x_tensor), batch_size=config.batch_size, shuffle=True, drop_last=False)

    opt = optim.Adam(model.parameters(), lr=config.lr)
    mse = nn.MSELoss(reduction="sum")

    def loss_fn(recon_x, x, mu, logvar):
        recon_loss = mse(recon_x, x)
        # KL divergence
        kl = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
        return recon_loss + kl

    model.train()
    for _ in range(int(config.epochs)):
        for (xb,) in loader:
            xb = xb.to(device)
            recon, mu, logvar = model(xb)
            loss = loss_fn(recon, xb, mu, logvar)
            opt.zero_grad()
            loss.backward()
            opt.step()

    model.eval()
    return model, device


def generate_samples(model, device, n_samples: int) -> "np.ndarray":
    import numpy as np
    import torch

    with torch.no_grad():
        z = torch.randn((int(n_samples), model.decoder.net[0].in_features), device=device)
        x = model.decoder(z).cpu().numpy()
    return x


def validate_and_dedupe(
    X_generated,
    *,
    feature_names: List[str],
    min_vals: Dict[str, float],
    max_vals: Dict[str, float],
    round_decimals: int = 6,
) -> List[Dict[str, float]]:
    import numpy as np

    out: List[Dict[str, float]] = []
    seen = set()
    for row in X_generated:
        feats: Dict[str, float] = {}
        for i, f in enumerate(feature_names):
            v = float(row[i])
            lo = float(min_vals.get(f, v))
            hi = float(max_vals.get(f, v))
            if lo > hi:
                lo, hi = hi, lo
            v = max(lo, min(hi, v))
            feats[f] = v
        key = tuple(round(feats[f], round_decimals) for f in feature_names)
        if key in seen:
            continue
        seen.add(key)
        out.append(feats)
    return out


def transistor_rank_score(features: Dict[str, float]) -> float:
    # Uses requested scoring formula; missing values -> 0
    mobility = float(features.get("mobility", 0.0) or 0.0)
    band_gap = float(features.get("band_gap", 0.0) or 0.0)
    dielectric = float(features.get("dielectric_constant", 0.0) or 0.0)
    temperature = float(features.get("temperature", 0.0) or 0.0)
    return 0.4 * mobility + 0.3 * band_gap + 0.2 * dielectric + 0.1 * temperature


def generate_ai_materials(
    *,
    csv_text: str,
    exclude_columns: Optional[List[str]] = None,
    n_generate: int = 200,
    top_k: int = 10,
    vae_config: Optional[VAEConfig] = None,
) -> Dict[str, Any]:
    """
    Train a VAE on uploaded dataset features and generate new candidates.
    Returns JSON-serializable dict with ranked candidates.
    """
    import numpy as np
    import pandas as pd
    import joblib

    X_df, feature_names = _load_numeric_features_from_csv(csv_text, exclude_columns=exclude_columns)
    if X_df.shape[0] < 10 or X_df.shape[1] < 2:
        return {
            "error": "Dataset too small for generative training (need >=10 rows and >=2 numeric feature columns).",
            "generated_materials": [],
        }

    # Fill missing with medians
    X_df = X_df.fillna(X_df.median(numeric_only=True))

    min_vals = {str(c): float(X_df[str(c)].min()) for c in feature_names}
    max_vals = {str(c): float(X_df[str(c)].max()) for c in feature_names}

    Xs, scaler = _standardize(X_df.values)
    cfg = vae_config or VAEConfig()
    model, device = train_vae(Xs, cfg)

    # Generate in standardized space, then inverse-transform
    Xg_std = generate_samples(model, device, int(n_generate))
    Xg = scaler.inverse_transform(Xg_std)

    candidates = validate_and_dedupe(
        Xg,
        feature_names=feature_names,
        min_vals=min_vals,
        max_vals=max_vals,
    )

    # Predict performance using existing trained model (if available)
    predicted: List[Dict[str, Any]] = []
    model_pred = None
    model_features = None
    try:
        model_pred = joblib.load("material_model.pkl")
        model_features = joblib.load("features.pkl")
    except Exception:
        model_pred = None
        model_features = None

    for feats in candidates:
        # Model expects input vector in features.pkl order if available
        model_output = None
        if model_pred is not None and model_features is not None:
            try:
                vec = [float(feats.get(f, 0.0) or 0.0) for f in model_features]
                yhat = model_pred.predict([vec])
                model_output = float(yhat[0])
            except Exception:
                model_output = None

        rank_score = transistor_rank_score(feats)
        predicted.append(
            {
                "features": feats,
                "model_prediction": model_output,
                "rank_score_raw": float(rank_score),
            }
        )

    # Normalize rank_score to 0..1 for "predicted_score"
    scores = [p["rank_score_raw"] for p in predicted]
    if scores:
        lo, hi = float(min(scores)), float(max(scores))
    else:
        lo, hi = 0.0, 1.0
    denom = (hi - lo) if (hi - lo) != 0 else 1.0
    for p in predicted:
        p["predicted_score"] = float((p["rank_score_raw"] - lo) / denom)

    predicted.sort(key=lambda x: x["predicted_score"], reverse=True)
    top = predicted[: max(1, int(top_k))]

    generated_materials = []
    for i, item in enumerate(top):
        generated_materials.append(
            {
                "rank": i + 1,
                "features": item["features"],
                "predicted_score": item["predicted_score"],
                "model_prediction": item["model_prediction"],
            }
        )

    return {
        "generated_materials": generated_materials,
        "generated_count": len(candidates),
        "feature_names": feature_names,
        "vae": {
            "hidden_dim": cfg.hidden_dim,
            "latent_dim": cfg.latent_dim,
            "epochs": cfg.epochs,
            "batch_size": cfg.batch_size,
            "lr": cfg.lr,
        },
    }

