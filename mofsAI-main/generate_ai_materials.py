import json
import sys

from core.generative_materials import generate_ai_materials, VAEConfig


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    csv_text = payload.get("csv_text")
    exclude_columns = payload.get("exclude_columns") or []
    n_generate = int(payload.get("n_generate", 200))
    top_k = int(payload.get("top_k", 10))

    cfg_payload = payload.get("vae") or {}
    cfg = VAEConfig(
        hidden_dim=int(cfg_payload.get("hidden_dim", 64)),
        latent_dim=int(cfg_payload.get("latent_dim", 8)),
        lr=float(cfg_payload.get("lr", 1e-3)),
        epochs=int(cfg_payload.get("epochs", 60)),
        batch_size=int(cfg_payload.get("batch_size", 64)),
    )

    if not isinstance(csv_text, str) or not csv_text.strip():
        print(json.dumps({"error": "`csv_text` is required"}))
        sys.exit(1)

    try:
        out = generate_ai_materials(
            csv_text=csv_text,
            exclude_columns=[str(x) for x in exclude_columns],
            n_generate=n_generate,
            top_k=top_k,
            vae_config=cfg,
        )
        print(json.dumps(out))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()

