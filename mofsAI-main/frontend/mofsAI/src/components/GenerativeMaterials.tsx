'use client';

import React, { useMemo, useState } from 'react';
import Button from './common/Button';
import { generateAiMaterials, type GenerateAiMaterialsResponse } from '../services/api';

function histogram(values: number[], bins = 10) {
  if (values.length === 0) return { bins: [] as number[], min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max - min || 1;
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor(((v - min) / width) * bins));
    counts[idx] += 1;
  }
  return { bins: counts, min, max };
}

function MiniHistogram({ values, title }: { values: number[]; title: string }) {
  const { bins } = useMemo(() => histogram(values, 12), [values]);
  const maxBin = Math.max(1, ...bins);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-600 mb-2">{title}</div>
      <svg viewBox="0 0 120 32" className="w-full h-8">
        {bins.map((b, i) => {
          const h = (b / maxBin) * 30;
          return <rect key={i} x={i * 10} y={32 - h} width={8} height={h} fill="#2563eb" opacity={0.75} />;
        })}
      </svg>
    </div>
  );
}

export default function GenerativeMaterials() {
  const [csvText, setCsvText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateAiMaterialsResponse | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''));
      setResult(null);
      setError(null);
    };
    reader.readAsText(f);
  };

  const generated = result?.generated_materials ?? [];
  const featureValues = useMemo(() => {
    const vals: Record<string, number[]> = {};
    for (const g of generated) {
      for (const [k, v] of Object.entries(g.features)) {
        if (typeof v !== 'number') continue;
        (vals[k] ||= []).push(v);
      }
    }
    return vals;
  }, [generated]);

  const generate = async () => {
    if (!csvText) return;
    setLoading(true);
    setError(null);
    try {
      const res = await generateAiMaterials({ csv_text: csvText, n_generate: 200, top_k: 10 });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Generate AI Materials (VAE)</h2>
        <p className="text-sm text-slate-600">
          Upload a CSV dataset, then generate new candidate materials by sampling a trained VAE latent space.
        </p>

        <div className="mt-4">
          <input
            type="file"
            accept=".csv"
            onChange={onFileChange}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700"
          />
        </div>

        <div className="mt-4 flex gap-3">
          <Button type="button" onClick={generate} disabled={!csvText || loading}>
            {loading ? 'Generating…' : 'Generate AI Materials'}
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
        {result && (
          <p className="mt-3 text-sm text-slate-700">
            Generated candidates: <span className="font-semibold">{result.generated_count}</span>
          </p>
        )}
      </div>

      {generated.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Candidates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generated.slice(0, 6).map((m) => (
              <div key={m.rank} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Rank {m.rank}</div>
                <div className="mt-1 text-sm text-slate-700">
                  Predicted score:{' '}
                  <span className="font-semibold text-slate-900">{m.predicted_score.toFixed(4)}</span>
                </div>
                {typeof m.model_prediction === 'number' && (
                  <div className="text-xs text-slate-600 mt-1">
                    Model prediction: <span className="font-semibold">{m.model_prediction.toFixed(4)}</span>
                  </div>
                )}
                <div className="mt-3 text-xs text-slate-700 space-y-1">
                  {Object.entries(m.features)
                    .slice(0, 8)
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <span className="font-mono">{k}</span>
                        <span className="font-semibold">{typeof v === 'number' ? v.toFixed(4) : String(v)}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {generated.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Feature distributions (generated)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {['band_gap', 'mobility', 'dielectric_constant', 'temperature']
              .filter((k) => (featureValues[k] || []).length > 0)
              .map((k) => (
                <MiniHistogram key={k} title={k} values={featureValues[k]} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

