from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
import re
from typing import Dict, Iterable, List, Optional, Tuple


def _normalize(name: str) -> str:
    """
    Normalize column names for matching:
    - lowercase
    - remove spaces, underscores, hyphens, slashes
    - strip common unit markers and punctuation
    """
    s = name.strip().lower()
    s = re.sub(r"[\s_\-\/]+", "", s)
    s = re.sub(r"[\(\)\[\]\{\}\.,:;]", "", s)
    # normalize some common unit notations
    s = s.replace("cm2", "cm2").replace("cms", "cms")
    s = s.replace("kev", "kev").replace("ev", "ev")
    s = s.replace("degc", "c").replace("celsius", "c")
    s = s.replace("kelvin", "k")
    return s


def _ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


@dataclass(frozen=True)
class Match:
    canonical: str
    score: float
    reason: str


# Canonical scientific concepts we want to detect, with aliases/keywords.
_CANONICAL_KEYWORDS: Dict[str, List[str]] = {
    "material_name": [
        "material",
        "materialname",
        "name",
        "mof",
        "mofname",
        "compound",
        "compoundname",
        "structure",
        "structureid",
        "id",
        "identifier",
    ],
    "band_gap": [
        "bandgap",
        "band_gap",
        "eg",
        "e_g",
        "gap",
        "energygap",
        "bandgap_ev",
        "eg_ev",
    ],
    "conductivity": [
        "conductivity",
        "sigma",
        "electricalconductivity",
        "cond",
        "conductivitys",
        "sperm",
        "s/m",
    ],
    "mobility": [
        "mobility",
        "carrier_mobility",
        "mu",
        "electronmobility",
        "holemobility",
        "mobilitycm2vs",
        "mobility_cm2",
        "cm2vs",
        "cm2/vs",
    ],
    "dielectric_constant": [
        "dielectric",
        "dielectricconstant",
        "epsilon",
        "eps",
        "permittivity",
        "relativepermittivity",
        "k",
        "kappa",
    ],
    "thickness": [
        "thickness",
        "t",
        "filmthickness",
        "layerthickness",
        "nm",
        "um",
        "micron",
    ],
    "temperature": [
        "temperature",
        "temp",
        "t_k",
        "tk",
        "tempk",
        "temp_k",
        "kelvin",
        "k",
        "c",
        "degc",
    ],
    "pressure": [
        "pressure",
        "p",
        "press",
        "pa",
        "kpa",
        "mpa",
        "bar",
        "atm",
        "torr",
    ],
}


def identify_columns(
    columns: Iterable[str],
    target_features: Optional[Iterable[str]] = None,
    *,
    min_score: float = 0.72,
) -> Tuple[Dict[str, str], List[str]]:
    """
    Identify/normalize dataset columns into canonical scientific concepts.

    Args:
        columns: original column names from the dataset.
        target_features: if provided, restrict results to these model feature keys.
                        (e.g. the model's features.pkl columns). When present,
                        we'll also do fuzzy matching against these to map to the model.
        min_score: minimum similarity score to accept a match.

    Returns:
        mapping: {original_column: canonical_feature}
        logs: list of human-readable detection logs.
    """
    cols = list(columns)
    targets = list(target_features) if target_features is not None else None

    # Prepare keyword universe
    canonical_keys = list(_CANONICAL_KEYWORDS.keys())

    def best_match_for(col: str) -> Optional[Match]:
        raw = col
        n = _normalize(raw)
        if not n:
            return None

        # 1) exact keyword token match (fast path)
        for canonical, keywords in _CANONICAL_KEYWORDS.items():
            for kw in keywords:
                nkw = _normalize(kw)
                if nkw and (n == nkw or nkw in n or n in nkw):
                    # strong match on containment
                    return Match(canonical=canonical, score=0.95, reason=f"keyword:{kw}")

        # 2) fuzzy against aliases
        best: Optional[Match] = None
        for canonical, keywords in _CANONICAL_KEYWORDS.items():
            for kw in keywords:
                score = _ratio(n, _normalize(kw))
                if best is None or score > best.score:
                    best = Match(canonical=canonical, score=score, reason=f"fuzzy:{kw}")

        if best and best.score >= min_score:
            return best

        # 3) fallback: fuzzy against target model features (if provided)
        if targets:
            best_t = None
            for t in targets:
                score = _ratio(n, _normalize(t))
                if best_t is None or score > best_t[1]:
                    best_t = (t, score)
            if best_t and best_t[1] >= max(min_score, 0.80):
                return Match(canonical=str(best_t[0]), score=float(best_t[1]), reason="model-feature-fuzzy")

        return None

    mapping: Dict[str, str] = {}
    logs: List[str] = []

    for col in cols:
        m = best_match_for(col)
        if not m:
            logs.append(f"[unmatched] {col}")
            continue

        # If restricting to targets, ensure canonical is allowed or can be mapped.
        if targets is not None:
            # direct allow
            if m.canonical in targets:
                mapping[col] = m.canonical
                logs.append(f"[matched] {col} -> {m.canonical} (score={m.score:.2f}, {m.reason})")
                continue

            # if the match is a canonical concept (band_gap, temperature, ...) try to map to the closest target feature
            if m.canonical in canonical_keys:
                best_t = None
                for t in targets:
                    score = _ratio(_normalize(m.canonical), _normalize(t))
                    if best_t is None or score > best_t[1]:
                        best_t = (t, score)
                if best_t and best_t[1] >= 0.65:
                    mapping[col] = str(best_t[0])
                    logs.append(
                        f"[matched] {col} -> {best_t[0]} via {m.canonical} (score={best_t[1]:.2f})"
                    )
                    continue

            logs.append(f"[unmatched] {col} (candidate={m.canonical}, score={m.score:.2f})")
            continue

        mapping[col] = m.canonical
        logs.append(f"[matched] {col} -> {m.canonical} (score={m.score:.2f}, {m.reason})")

    return mapping, logs

