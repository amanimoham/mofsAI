'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Container from '../../components/common/Container';
import Button from '../../components/common/Button';
import { usePredict } from '../../hooks/usePredict';
import { parseCsvToObject } from '../../utils/csv';
import {
  analyzeDataset,
  generateAiMaterials,
  identifyFeatures,
  rankMaterials,
  validateDataset,
  type DatasetAnalysisResponse,
  type DatasetValidationResponse,
  type GenerateAiMaterialsResponse,
  type RankMaterialsResponse,
} from '../../services/api';

type StepStatus = 'idle' | 'running' | 'completed' | 'error';

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
  );
}

function ProgressBar() {
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full w-full animate-pulse bg-blue-600/70" />
    </div>
  );
}

function StepHeader({
  title,
  status,
  subtitle,
}: {
  title: string;
  status: StepStatus;
  subtitle?: string;
}) {
  const badge =
    status === 'completed'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'running'
        ? 'bg-blue-100 text-blue-800'
        : status === 'error'
          ? 'bg-red-100 text-red-800'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
      </div>
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge}`}>{status}</span>
    </div>
  );
}

export default function UploadPage() {
  const {
    result,
    detectedMapping: backendDetectedMapping,
    missingFeatures: backendMissingFeatures,
    loading,
    error,
    predict,
    reset,
  } = usePredict();

  const [csvText, setCsvText] = useState('');
  const [csvRows, setCsvRows] = useState<Record<string, number>[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [manualInput, setManualInput] = useState('');

  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<StepStatus>('idle');
  const [validationStatus, setValidationStatus] = useState<StepStatus>('idle');
  const [rankingStatus, setRankingStatus] = useState<StepStatus>('idle');
  const [generationStatus, setGenerationStatus] = useState<StepStatus>('idle');

  const [analysis, setAnalysis] = useState<DatasetAnalysisResponse | null>(null);
  const [canonicalMapping, setCanonicalMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<DatasetValidationResponse | null>(null);
  const [ranking, setRanking] = useState<RankMaterialsResponse | null>(null);
  const [generated, setGenerated] = useState<GenerateAiMaterialsResponse | null>(null);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      reset();
      setPipelineError(null);
      setAnalysisStatus('idle');
      setValidationStatus('idle');
      setRankingStatus('idle');
      setGenerationStatus('idle');
      setAnalysis(null);
      setCanonicalMapping({});
      setValidation(null);
      setRanking(null);
      setGenerated(null);

      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        setCsvText(text);
        setCsvRows(parseCsvToObject(text));
        setSelectedRowIndex(0);
      };
      reader.readAsText(f);
    },
    [reset]
  );

  // Auto-run steps 1 → 2 → 3 after upload
  useEffect(() => {
    if (!csvText) return;
    let cancelled = false;

    const run = async () => {
      try {
        setPipelineError(null);

        setAnalysisStatus('running');
        const a = await analyzeDataset(csvText);
        if (cancelled) return;
        setAnalysis(a);
        setAnalysisStatus('completed');

        setValidationStatus('running');
        const detect = await identifyFeatures({ columns: a.columns, target_features: null });
        if (cancelled) return;
        setCanonicalMapping(detect.mapping || {});

        const v = await validateDataset({
          analysis: a,
          detected_mapping: detect.mapping || {},
          required_features: ['band_gap', 'mobility', 'dielectric_constant', 'temperature'],
        });
        if (cancelled) return;
        setValidation(v);
        setValidationStatus('completed');

        if (v.status !== 'suitable') return;
        setRankingStatus('running');
        const r = await rankMaterials({ csv_text: csvText, top_k: 3 });
        if (cancelled) return;
        setRanking(r);
        setRankingStatus('completed');
      } catch (e) {
        if (cancelled) return;
        setPipelineError(e instanceof Error ? e.message : 'Pipeline failed');
        setAnalysisStatus((s) => (s === 'running' ? 'error' : s));
        setValidationStatus((s) => (s === 'running' ? 'error' : s));
        setRankingStatus((s) => (s === 'running' ? 'error' : s));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [csvText]);

  const runGenerate = useCallback(async () => {
    if (!csvText) return;
    setPipelineError(null);
    setGenerationStatus('running');
    try {
      const g = await generateAiMaterials({ csv_text: csvText, n_generate: 200, top_k: 5 });
      setGenerated(g);
      setGenerationStatus('completed');
    } catch (e) {
      setGenerationStatus('error');
      setPipelineError(e instanceof Error ? e.message : 'Generation failed');
    }
  }, [csvText]);

  const runPredictionFromCsv = useCallback(() => {
    const row = csvRows[selectedRowIndex];
    if (!row) return;
    predict(row);
  }, [csvRows, selectedRowIndex, predict]);

  const runPredictionFromManual = useCallback(() => {
    try {
      const parsed = JSON.parse(manualInput) as Record<string, number>;
      predict(parsed);
    } catch {
      reset();
      alert('Invalid JSON. Use an object with numeric values.');
    }
  }, [manualInput, predict, reset]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Container>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
          AI Upload Pipeline
        </h1>
        <p className="text-slate-600 mb-8">
          Upload a dataset to automatically run: Dataset Analysis → Dataset Validation → Top 3 Materials → Generate New Materials.
        </p>

        <div className="space-y-10">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Dataset (CSV)</h2>
            <input
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700"
            />
            {pipelineError ? (
              <p className="mt-3 text-sm text-red-600 font-medium">{pipelineError}</p>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader title="STEP 1 — Dataset Analysis" status={analysisStatus} subtitle={analysisStatus === 'running' ? 'Analyzing dataset…' : undefined} />
              {analysisStatus === 'running' ? (
                <div className="mt-4">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Spinner />
                    <span>Analyzing dataset…</span>
                  </div>
                  <ProgressBar />
                </div>
              ) : null}
              {analysisStatus === 'completed' && analysis ? (
                <div className="mt-4">
                  <div className="text-sm text-emerald-700 font-semibold">✔ Dataset analysis completed</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Rows</div>
                      <div className="text-lg font-semibold text-slate-900">{analysis.row_count}</div>
                    </div>
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Columns</div>
                      <div className="text-lg font-semibold text-slate-900">{analysis.columns.length}</div>
                    </div>
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Missing cells</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {Object.values(analysis.missing_values).reduce((a, b) => a + b, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader title="STEP 2 — Dataset Validation" status={validationStatus} subtitle={validationStatus === 'running' ? 'Validating dataset quality…' : undefined} />
              {validationStatus === 'running' ? (
                <div className="mt-4">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Spinner />
                    <span>Validating dataset quality…</span>
                  </div>
                  <ProgressBar />
                </div>
              ) : null}
              {validationStatus === 'completed' && validation ? (
                <div className="mt-4">
                  <div className="text-sm text-emerald-700 font-semibold">✔ Dataset validation completed</div>
                  <p className="mt-2 text-sm text-slate-700">
                    {validation.status === 'suitable' ? (
                      <span className="text-emerald-700 font-semibold">Dataset is suitable</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Dataset is not suitable</span>
                    )}
                    {' '}— Quality Score: <span className="font-semibold">{validation.quality_score}%</span>
                  </p>
                  {validation.reasons.length ? (
                    <ul className="mt-2 text-sm text-slate-700 list-disc pl-5">
                      {validation.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                  <details className="mt-3">
                    <summary className="text-xs text-slate-600 cursor-pointer">Detected / mapped features</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                      {Object.entries(canonicalMapping)
                        .slice(0, 40)
                        .map(([k, v]) => `${k} → ${v}`)
                        .join('\n')}
                    </pre>
                  </details>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader title="STEP 3 — Find Top 3 Materials" status={rankingStatus} subtitle={rankingStatus === 'running' ? 'Finding top materials…' : undefined} />
              {rankingStatus === 'running' ? (
                <div className="mt-4">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Spinner />
                    <span>Finding top materials…</span>
                  </div>
                  <ProgressBar />
                </div>
              ) : null}
              {rankingStatus === 'completed' && ranking ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Top 3 Materials from Dataset</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ranking.top_materials.map((m) => (
                      <div key={m.rank} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Rank #{m.rank}</div>
                        <div className="text-lg font-semibold text-slate-900">{m.name}</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Score: <span className="font-semibold">{m.score.toFixed(4)}</span>
                        </div>
                        {m.features ? (
                          <div className="mt-3 text-xs text-slate-700 space-y-1">
                            {Object.entries(m.features).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="font-mono">{k}</span>
                                <span className="font-semibold">{Number(v).toFixed(4)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5">
                    <Button type="button" onClick={runGenerate} disabled={generationStatus === 'running'}>
                      {generationStatus === 'running' ? 'Generating…' : 'Generate New Materials'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader title="STEP 4 — Generative AI Materials" status={generationStatus} subtitle={generationStatus === 'running' ? 'Generating new materials using AI…' : undefined} />
              {generationStatus === 'running' ? (
                <div className="mt-4">
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Spinner />
                    <span>Generating new materials using AI…</span>
                  </div>
                  <ProgressBar />
                </div>
              ) : null}
              {generationStatus === 'completed' && generated ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Generated Materials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {generated.generated_materials.slice(0, 5).map((m) => (
                      <div key={m.rank} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Rank #{m.rank}</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Predicted score: <span className="font-semibold">{m.predicted_score.toFixed(4)}</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-700 space-y-1">
                          {Object.entries(m.features).slice(0, 6).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="font-mono">{k}</span>
                              <span className="font-semibold">{Number(v).toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Direct Prediction (optional)</h2>
            {csvRows.length > 0 ? (
              <div className="mb-8">
                <p className="text-slate-600 mb-2">Pick a row and run prediction:</p>
                <select
                  value={selectedRowIndex}
                  onChange={(e) => setSelectedRowIndex(Number(e.target.value))}
                  className="mt-2 block w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {csvRows.map((_, i) => (
                    <option key={i} value={i}>
                      Row {i + 1}
                    </option>
                  ))}
                </select>
                <Button type="button" onClick={runPredictionFromCsv} disabled={loading} className="mt-3">
                  {loading ? 'Running…' : 'Predict from selected row'}
                </Button>
              </div>
            ) : null}

            <div>
              <p className="text-sm text-slate-600 mb-2">Or enter JSON:</p>
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder='{"mean_atomic_mass": 20.1, "mean_Density": 7.2}'
                rows={6}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-mono text-sm"
              />
              <Button type="button" onClick={runPredictionFromManual} disabled={loading} className="mt-3">
                {loading ? 'Running…' : 'Predict from JSON'}
              </Button>
            </div>
          </section>

          {(result !== null || error) && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Prediction Result</h2>
              {error ? <p className="text-red-600 font-medium">{error}</p> : null}
              {result !== null ? (
                <p className="text-2xl font-semibold text-slate-900">
                  Prediction: <span className="text-blue-600">{result}</span>
                </p>
              ) : null}

              {backendDetectedMapping ? (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Detected / mapped features (model schema)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(backendDetectedMapping).slice(0, 30).map(([src, dst]) => (
                      <div key={src} className="flex justify-between rounded bg-white px-3 py-2 border border-slate-200">
                        <span className="font-mono text-slate-700">{src}</span>
                        <span className="text-slate-900">→ {dst}</span>
                      </div>
                    ))}
                  </div>
                  {backendMissingFeatures?.length ? (
                    <p className="mt-3 text-xs text-amber-700">
                      Missing model features filled with defaults: {backendMissingFeatures.slice(0, 30).join(', ')}
                      {backendMissingFeatures.length > 30 ? ' …' : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          )}
        </div>
      </Container>
    </div>
  );
}

/*
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Container from '../../components/common/Container';
import Button from '../../components/common/Button';
import { usePredict } from '../../hooks/usePredict';
import { parseCsvToObject } from '../../utils/csv';
import {
  analyzeDataset,
  generateAiMaterials,
  identifyFeatures,
  rankMaterials,
  validateDataset,
  type DatasetAnalysisResponse,
  type DatasetValidationResponse,
  type GenerateAiMaterialsResponse,
  type RankMaterialsResponse,
} from '../../services/api';

type StepStatus = 'idle' | 'running' | 'completed' | 'error';

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
  );
}

function StepHeader({
  title,
  status,
  subtitle,
}: {
  title: string;
  status: StepStatus;
  subtitle?: string;
}) {
  const badge =
    status === 'completed'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'running'
        ? 'bg-blue-100 text-blue-800'
        : status === 'error'
          ? 'bg-red-100 text-red-800'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
      </div>
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge}`}>{status}</span>
    </div>
  );
}

export default function UploadPage() {
  const {
    result,
    detectedMapping: backendDetectedMapping,
    missingFeatures: backendMissingFeatures,
    loading,
    error,
    predict,
    reset,
  } = usePredict();

  const [csvText, setCsvText] = useState('');
  const [csvRows, setCsvRows] = useState<Record<string, number>[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [manualInput, setManualInput] = useState('');

  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<StepStatus>('idle');
  const [validationStatus, setValidationStatus] = useState<StepStatus>('idle');
  const [rankingStatus, setRankingStatus] = useState<StepStatus>('idle');
  const [generationStatus, setGenerationStatus] = useState<StepStatus>('idle');

  const [analysis, setAnalysis] = useState<DatasetAnalysisResponse | null>(null);
  const [canonicalMapping, setCanonicalMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<DatasetValidationResponse | null>(null);
  const [ranking, setRanking] = useState<RankMaterialsResponse | null>(null);
  const [generated, setGenerated] = useState<GenerateAiMaterialsResponse | null>(null);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      reset();
      setPipelineError(null);
      setAnalysisStatus('idle');
      setValidationStatus('idle');
      setRankingStatus('idle');
      setGenerationStatus('idle');
      setAnalysis(null);
      setCanonicalMapping({});
      setValidation(null);
      setRanking(null);
      setGenerated(null);

      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        setCsvText(text);
        const rows = parseCsvToObject(text);
        setCsvRows(rows);
        setSelectedRowIndex(0);
      };
      reader.readAsText(f);
    },
    [reset]
  );

  // Auto-run steps 1 → 2 → 3 after upload
  useEffect(() => {
    if (!csvText) return;
    let cancelled = false;

    const run = async () => {
      try {
        setPipelineError(null);

        setAnalysisStatus('running');
        const a = await analyzeDataset(csvText);
        if (cancelled) return;
        setAnalysis(a);
        setAnalysisStatus('completed');

        setValidationStatus('running');
        const detect = await identifyFeatures({ columns: a.columns, target_features: null });
        if (cancelled) return;
        setCanonicalMapping(detect.mapping || {});

        const v = await validateDataset({
          analysis: a,
          detected_mapping: detect.mapping || {},
          required_features: ['band_gap', 'mobility', 'dielectric_constant', 'temperature'],
        });
        if (cancelled) return;
        setValidation(v);
        setValidationStatus('completed');

        if (v.status !== 'suitable') return;
        setRankingStatus('running');
        const r = await rankMaterials({ csv_text: csvText, top_k: 3 });
        if (cancelled) return;
        setRanking(r);
        setRankingStatus('completed');
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Pipeline failed';
        setPipelineError(msg);
        setAnalysisStatus((s) => (s === 'running' ? 'error' : s));
        setValidationStatus((s) => (s === 'running' ? 'error' : s));
        setRankingStatus((s) => (s === 'running' ? 'error' : s));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [csvText]);

  const runGenerate = useCallback(async () => {
    if (!csvText) return;
    setPipelineError(null);
    setGenerationStatus('running');
    try {
      const g = await generateAiMaterials({ csv_text: csvText, n_generate: 200, top_k: 5 });
      setGenerated(g);
      setGenerationStatus('completed');
    } catch (e) {
      setGenerationStatus('error');
      setPipelineError(e instanceof Error ? e.message : 'Generation failed');
    }
  }, [csvText]);

  const runPredictionFromCsv = useCallback(() => {
    const row = csvRows[selectedRowIndex];
    if (!row) return;
    predict(row);
  }, [csvRows, selectedRowIndex, predict]);

  const runPredictionFromManual = useCallback(() => {
    try {
      const parsed = JSON.parse(manualInput) as Record<string, number>;
      predict(parsed);
    } catch {
      reset();
      alert('Invalid JSON. Use an object with numeric values.');
    }
  }, [manualInput, predict, reset]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Container>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
          AI Upload Pipeline
        </h1>
        <p className="text-slate-600 mb-8">
          Upload a dataset to run: Dataset Analysis → Dataset Validation → Top 3 Materials → Generate New Materials.
        </p>

        <div className="space-y-10">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Dataset (CSV)</h2>
            <input
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700"
            />
            {pipelineError ? (
              <p className="mt-3 text-sm text-red-600 font-medium">{pipelineError}</p>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader title="STEP 1 — Dataset Analysis" status={analysisStatus} subtitle={analysisStatus === 'running' ? 'Analyzing dataset…' : undefined} />
              {analysisStatus === 'running' ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                  <Spinner />
                  <span>Analyzing dataset…</span>
                </div>
              ) : null}
              {analysisStatus === 'completed' && analysis ? (
                <div className="mt-4">
                  <div className="text-sm text-emerald-700 font-semibold">✔ Dataset analysis completed</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Rows</div>
                      <div className="text-lg font-semibold text-slate-900">{analysis.row_count}</div>
                    </div>
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Columns</div>
                      <div className="text-lg font-semibold text-slate-900">{analysis.columns.length}</div>
                    </div>
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Missing cells</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {Object.values(analysis.missing_values).reduce((a, b) => a + b, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader title="STEP 2 — Dataset Validation" status={validationStatus} subtitle={validationStatus === 'running' ? 'Validating dataset quality…' : undefined} />
              {validationStatus === 'running' ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                  <Spinner />
                  <span>Validating dataset quality…</span>
                </div>
              ) : null}
              {validationStatus === 'completed' && validation ? (
                <div className="mt-4">
                  <div className="text-sm text-emerald-700 font-semibold">✔ Dataset validation completed</div>
                  <p className="mt-2 text-sm text-slate-700">
                    {validation.status === 'suitable' ? (
                      <span className="text-emerald-700 font-semibold">Dataset is suitable</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Dataset is not suitable</span>
                    )}
                    {' '}— Quality Score: <span className="font-semibold">{validation.quality_score}%</span>
                  </p>
                  {validation.reasons.length ? (
                    <ul className="mt-2 text-sm text-slate-700 list-disc pl-5">
                      {validation.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                  <details className="mt-3">
                    <summary className="text-xs text-slate-600 cursor-pointer">Detected / mapped features</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                      {Object.entries(canonicalMapping)
                        .slice(0, 40)
                        .map(([k, v]) => `${k} → ${v}`)
                        .join('\n')}
                    </pre>
                  </details>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader title="STEP 3 — Find Top 3 Materials" status={rankingStatus} subtitle={rankingStatus === 'running' ? 'Finding top materials…' : undefined} />
              {rankingStatus === 'running' ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                  <Spinner />
                  <span>Finding top materials…</span>
                </div>
              ) : null}
              {rankingStatus === 'completed' && ranking ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Top 3 Materials from Dataset</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ranking.top_materials.map((m) => (
                      <div key={m.rank} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Rank #{m.rank}</div>
                        <div className="text-lg font-semibold text-slate-900">{m.name}</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Score: <span className="font-semibold">{m.score.toFixed(4)}</span>
                        </div>
                        {m.features ? (
                          <div className="mt-3 text-xs text-slate-700 space-y-1">
                            {Object.entries(m.features).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="font-mono">{k}</span>
                                <span className="font-semibold">{Number(v).toFixed(4)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5">
                    <Button type="button" onClick={runGenerate} disabled={generationStatus === 'running'}>
                      {generationStatus === 'running' ? 'Generating…' : 'Generate New Materials'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader title="STEP 4 — Generative AI Materials" status={generationStatus} subtitle={generationStatus === 'running' ? 'Generating new materials using AI…' : undefined} />
              {generationStatus === 'running' ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                  <Spinner />
                  <span>Generating new materials using AI…</span>
                </div>
              ) : null}
              {generationStatus === 'completed' && generated ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Generated Materials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {generated.generated_materials.slice(0, 5).map((m) => (
                      <div key={m.rank} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Rank #{m.rank}</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Predicted score: <span className="font-semibold">{m.predicted_score.toFixed(4)}</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-700 space-y-1">
                          {Object.entries(m.features).slice(0, 6).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="font-mono">{k}</span>
                              <span className="font-semibold">{Number(v).toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Direct Prediction (optional)</h2>
            {csvRows.length > 0 ? (
              <div className="mb-8">
                <p className="text-slate-600 mb-2">Pick a row and run prediction:</p>
                <select
                  value={selectedRowIndex}
                  onChange={(e) => setSelectedRowIndex(Number(e.target.value))}
                  className="mt-2 block w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {csvRows.map((_, i) => (
                    <option key={i} value={i}>
                      Row {i + 1}
                    </option>
                  ))}
                </select>
                <Button type="button" onClick={runPredictionFromCsv} disabled={loading} className="mt-3">
                  {loading ? 'Running…' : 'Predict from selected row'}
                </Button>
              </div>
            ) : null}

            <div>
              <p className="text-sm text-slate-600 mb-2">Or enter JSON:</p>
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder='{"mean_atomic_mass": 20.1, "mean_Density": 7.2}'
                rows={6}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-mono text-sm"
              />
              <Button type="button" onClick={runPredictionFromManual} disabled={loading} className="mt-3">
                {loading ? 'Running…' : 'Predict from JSON'}
              </Button>
            </div>
          </section>

          {(result !== null || error) && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Prediction Result</h2>
              {error ? <p className="text-red-600 font-medium">{error}</p> : null}
              {result !== null ? (
                <p className="text-2xl font-semibold text-slate-900">
                  Prediction: <span className="text-blue-600">{result}</span>
                </p>
              ) : null}

              {backendDetectedMapping ? (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Detected / mapped features (model schema)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(backendDetectedMapping).slice(0, 30).map(([src, dst]) => (
                      <div key={src} className="flex justify-between rounded bg-white px-3 py-2 border border-slate-200">
                        <span className="font-mono text-slate-700">{src}</span>
                        <span className="text-slate-900">→ {dst}</span>
                      </div>
                    ))}
                  </div>
                  {backendMissingFeatures?.length ? (
                    <p className="mt-3 text-xs text-amber-700">
                      Missing model features filled with defaults: {backendMissingFeatures.slice(0, 30).join(', ')}
                      {backendMissingFeatures.length > 30 ? ' …' : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          )}
        </div>
      </Container>
    </div>
  );
}

'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Container from '../../components/common/Container';
import Button from '../../components/common/Button';
import { usePredict } from '../../hooks/usePredict';
import { parseCsvToObject } from '../../utils/csv';
import {
  analyzeDataset,
  generateAiMaterials,
  identifyFeatures,
  rankMaterials,
  validateDataset,
  type DatasetAnalysisResponse,
  type DatasetValidationResponse,
  type GenerateAiMaterialsResponse,
  type RankMaterialsResponse,
} from '../../services/api';

type StepStatus = 'idle' | 'running' | 'completed' | 'error';

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
  );
}

function StepHeader({
  title,
  status,
  subtitle,
}: {
  title: string;
  status: StepStatus;
  subtitle?: string;
}) {
  const badge =
    status === 'completed'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'running'
        ? 'bg-blue-100 text-blue-800'
        : status === 'error'
          ? 'bg-red-100 text-red-800'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
      </div>
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge}`}>{status}</span>
    </div>
  );
}

export default function UploadPage() {
  const {
    result,
    detectedMapping: backendDetectedMapping,
    missingFeatures: backendMissingFeatures,
    loading,
    error,
    predict,
    reset,
  } = usePredict();

  const [csvText, setCsvText] = useState<string>('');
  const [csvRows, setCsvRows] = useState<Record<string, number>[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [manualInput, setManualInput] = useState('');

  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<StepStatus>('idle');
  const [validationStatus, setValidationStatus] = useState<StepStatus>('idle');
  const [rankingStatus, setRankingStatus] = useState<StepStatus>('idle');
  const [generationStatus, setGenerationStatus] = useState<StepStatus>('idle');

  const [analysis, setAnalysis] = useState<DatasetAnalysisResponse | null>(null);
  const [canonicalMapping, setCanonicalMapping] = useState<Record<string, string>>({});
  const [canonicalLogs, setCanonicalLogs] = useState<string[]>([]);
  const [validation, setValidation] = useState<DatasetValidationResponse | null>(null);
  const [ranking, setRanking] = useState<RankMaterialsResponse | null>(null);
  const [generated, setGenerated] = useState<GenerateAiMaterialsResponse | null>(null);

  const csvColumns = useMemo(() => {
    const first = csvRows[0];
    return first ? Object.keys(first) : [];
  }, [csvRows]);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      reset();
      setPipelineError(null);
      setAnalysisStatus('idle');
      setValidationStatus('idle');
      setRankingStatus('idle');
      setGenerationStatus('idle');
      setAnalysis(null);
      setCanonicalMapping({});
      setCanonicalLogs([]);
      setValidation(null);
      setRanking(null);
      setGenerated(null);

      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        setCsvText(text);
        const rows = parseCsvToObject(text);
        setCsvRows(rows);
        setSelectedRowIndex(0);
      };
      reader.readAsText(f);
    },
    [reset]
  );

  // Auto-run steps 1 → 2 → 3 after upload
  useEffect(() => {
    if (!csvText) return;
    let cancelled = false;

    const run = async () => {
      try {
        setPipelineError(null);

        setAnalysisStatus('running');
        const a = await analyzeDataset(csvText);
        if (cancelled) return;
        setAnalysis(a);
        setAnalysisStatus('completed');

        setValidationStatus('running');
        const detect = await identifyFeatures({ columns: a.columns, target_features: null });
        if (cancelled) return;
        setCanonicalMapping(detect.mapping || {});
        setCanonicalLogs(detect.logs || []);

        const v = await validateDataset({
          analysis: a,
          detected_mapping: detect.mapping || {},
          required_features: ['band_gap', 'mobility', 'dielectric_constant', 'temperature'],
        });
        if (cancelled) return;
        setValidation(v);
        setValidationStatus('completed');

        if (v.status !== 'suitable') return;
        setRankingStatus('running');
        const r = await rankMaterials({ csv_text: csvText, top_k: 3 });
        if (cancelled) return;
        setRanking(r);
        setRankingStatus('completed');
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Pipeline failed';
        setPipelineError(msg);
        if (analysisStatus === 'running') setAnalysisStatus('error');
        if (validationStatus === 'running') setValidationStatus('error');
        if (rankingStatus === 'running') setRankingStatus('error');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvText]);

  const runGenerate = useCallback(async () => {
    if (!csvText) return;
    setPipelineError(null);
    setGenerationStatus('running');
    try {
      const g = await generateAiMaterials({ csv_text: csvText, n_generate: 200, top_k: 5 });
      setGenerated(g);
      setGenerationStatus('completed');
    } catch (e) {
      setGenerationStatus('error');
      setPipelineError(e instanceof Error ? e.message : 'Generation failed');
    }
  }, [csvText]);

  const runPredictionFromCsv = useCallback(() => {
    const row = csvRows[selectedRowIndex];
    if (!row) return;
    predict(row);
  }, [csvRows, selectedRowIndex, predict]);

  const runPredictionFromManual = useCallback(() => {
    try {
      const parsed = JSON.parse(manualInput) as Record<string, number>;
      predict(parsed);
    } catch {
      reset();
      alert('Invalid JSON. Use an object with numeric values.');
    }
  }, [manualInput, predict, reset]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Container>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
          AI Upload Pipeline
        </h1>
        <p className="text-slate-600 mb-8">
          Upload a dataset to automatically run: Dataset Analysis → Dataset Validation → Top 3 Materials → Generate New Materials.
        </p>

        <div className="space-y-10">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Dataset (CSV)</h2>
            <input
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700"
            />
            {pipelineError ? (
              <p className="mt-3 text-sm text-red-600 font-medium">{pipelineError}</p>
            ) : null}
          </section>

          <section className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader
                title="STEP 1 — Dataset Analysis"
                status={analysisStatus}
                subtitle={analysisStatus === 'running' ? 'Analyzing dataset…' : undefined}
              />
              {analysisStatus === 'running' ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                  <Spinner />
                  <span>Analyzing dataset…</span>
                </div>
              ) : null}
              {analysisStatus === 'completed' && analysis ? (
                <div className="mt-4">
                  <div className="text-sm text-emerald-700 font-semibold">✔ Dataset analysis completed</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Rows</div>
                      <div className="text-lg font-semibold text-slate-900">{analysis.row_count}</div>
                    </div>
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Columns</div>
                      <div className="text-lg font-semibold text-slate-900">{analysis.columns.length}</div>
                    </div>
                    <div className="rounded bg-slate-50 border border-slate-200 p-3">
                      <div className="text-xs text-slate-500">Missing cells</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {Object.values(analysis.missing_values).reduce((a, b) => a + b, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader
                title="STEP 2 — Dataset Validation"
                status={validationStatus}
                subtitle={validationStatus === 'running' ? 'Validating dataset quality…' : undefined}
              />
              {validationStatus === 'running' ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                  <Spinner />
                  <span>Validating dataset quality…</span>
                </div>
              ) : null}
              {validationStatus === 'completed' && validation ? (
                <div className="mt-4">
                  <div className="text-sm text-emerald-700 font-semibold">✔ Dataset validation completed</div>
                  <p className="mt-2 text-sm text-slate-700">
                    {validation.status === 'suitable' ? (
                      <span className="text-emerald-700 font-semibold">Dataset is suitable</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Dataset is not suitable</span>
                    )}
                    {' '}— Quality Score: <span className="font-semibold">{validation.quality_score}%</span>
                  </p>
                  {validation.reasons.length ? (
                    <ul className="mt-2 text-sm text-slate-700 list-disc pl-5">
                      {validation.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}

                  <details className="mt-3">
                    <summary className="text-xs text-slate-600 cursor-pointer">
                      Detected / mapped features (sample)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                      {Object.entries(canonicalMapping)
                        .slice(0, 40)
                        .map(([k, v]) => `${k} → ${v}`)
                        .join('\n')}
                    </pre>
                    {canonicalLogs.length ? (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">
                        {canonicalLogs.slice(0, 15).join('\n')}
                      </pre>
                    ) : null}
                  </details>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader
                title="STEP 3 — Find Top 3 Materials"
                status={rankingStatus}
                subtitle={rankingStatus === 'running' ? 'Finding top materials…' : undefined}
              />
              {rankingStatus === 'running' ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                  <Spinner />
                  <span>Finding top materials…</span>
                </div>
              ) : null}
              {rankingStatus === 'completed' && ranking ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Top 3 Materials from Dataset</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ranking.top_materials.map((m) => (
                      <div key={m.rank} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Rank #{m.rank}</div>
                        <div className="text-lg font-semibold text-slate-900">{m.name}</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Score: <span className="font-semibold">{m.score.toFixed(4)}</span>
                        </div>
                        {m.features ? (
                          <div className="mt-3 text-xs text-slate-700 space-y-1">
                            {Object.entries(m.features).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="font-mono">{k}</span>
                                <span className="font-semibold">{Number(v).toFixed(4)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5">
                    <Button type="button" onClick={runGenerate} disabled={generationStatus === 'running'}>
                      {generationStatus === 'running' ? 'Generating…' : 'Generate New Materials'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mx-auto w-px h-6 bg-slate-300" />

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <StepHeader
                title="STEP 4 — Generative AI Materials"
                status={generationStatus}
                subtitle={generationStatus === 'running' ? 'Generating new materials using AI…' : undefined}
              />
              {generationStatus === 'running' ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-700">
                  <Spinner />
                  <span>Generating new materials using AI…</span>
                </div>
              ) : null}
              {generationStatus === 'completed' && generated ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Generated Materials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {generated.generated_materials.slice(0, 5).map((m) => (
                      <div key={m.rank} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">Rank #{m.rank}</div>
                        <div className="mt-1 text-sm text-slate-700">
                          Predicted score: <span className="font-semibold">{m.predicted_score.toFixed(4)}</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-700 space-y-1">
                          {Object.entries(m.features).slice(0, 6).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="font-mono">{k}</span>
                              <span className="font-semibold">{Number(v).toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Direct Prediction (optional)</h2>

            {csvRows.length > 0 ? (
              <div className="mb-8">
                <p className="text-slate-600 mb-2">Pick a row and run prediction:</p>
                <select
                  value={selectedRowIndex}
                  onChange={(e) => setSelectedRowIndex(Number(e.target.value))}
                  className="mt-2 block w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {csvRows.map((_, i) => (
                    <option key={i} value={i}>
                      Row {i + 1}
                    </option>
                  ))}
                </select>
                <Button type="button" onClick={runPredictionFromCsv} disabled={loading} className="mt-3">
                  {loading ? 'Running…' : 'Predict from selected row'}
                </Button>
              </div>
            ) : null}

            <div>
              <p className="text-sm text-slate-600 mb-2">Or enter JSON:</p>
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder='{"mean_atomic_mass": 20.1, "mean_Density": 7.2}'
                rows={6}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-mono text-sm"
              />
              <Button type="button" onClick={runPredictionFromManual} disabled={loading} className="mt-3">
                {loading ? 'Running…' : 'Predict from JSON'}
              </Button>
            </div>
          </section>

          {(result !== null || error) && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Prediction Result</h2>
              {error ? <p className="text-red-600 font-medium">{error}</p> : null}
              {result !== null ? (
                <p className="text-2xl font-semibold text-slate-900">
                  Prediction: <span className="text-blue-600">{result}</span>
                </p>
              ) : null}

              {backendDetectedMapping ? (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Detected / mapped features (model schema)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(backendDetectedMapping).slice(0, 30).map(([src, dst]) => (
                      <div key={src} className="flex justify-between rounded bg-white px-3 py-2 border border-slate-200">
                        <span className="font-mono text-slate-700">{src}</span>
                        <span className="text-slate-900">→ {dst}</span>
                      </div>
                    ))}
                  </div>
                  {backendMissingFeatures?.length ? (
                    <p className="mt-3 text-xs text-amber-700">
                      Missing model features filled with defaults: {backendMissingFeatures.slice(0, 30).join(', ')}
                      {backendMissingFeatures.length > 30 ? ' …' : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          )}
        </div>
      </Container>
    </div>
  );
}

'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Container from '../../components/common/Container';
import Button from '../../components/common/Button';
import { usePredict } from '../../hooks/usePredict';
import { parseCsvToObject } from '../../utils/csv';
import {
  analyzeDataset,
  getFeatures,
  identifyFeatures,
  rankMaterials,
  trainModel,
  validateDataset,
  type DatasetAnalysisResponse,
  type DatasetValidationResponse,
  type RankMaterialsResponse,
  type TrainModelResponse,
} from '../../services/api';

export default function UploadPage() {
  const { result, detectedMapping: backendDetectedMapping, missingFeatures: backendMissingFeatures, loading, error, predict, reset } = usePredict();
  const [csvRows, setCsvRows] = useState<Record<string, number>[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [featureNames, setFeatureNames] = useState<string[] | null>(null);
  const [detectedMapping, setDetectedMapping] = useState<Record<string, string>>({});
  const [detectionLogs, setDetectionLogs] = useState<string[]>([]);
  const [missingModelFeatures, setMissingModelFeatures] = useState<string[]>([]);
  const [csvText, setCsvText] = useState<string>('');

  const [analysis, setAnalysis] = useState<DatasetAnalysisResponse | null>(null);
  const [validation, setValidation] = useState<DatasetValidationResponse | null>(null);
  const [training, setTraining] = useState<TrainModelResponse | null>(null);
  const [ranking, setRanking] = useState<RankMaterialsResponse | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [targetColumn, setTargetColumn] = useState<string>('critical_temp');
  const [pipelineLoading, setPipelineLoading] = useState<
    null | 'analyze' | 'validate' | 'train' | 'rank'
  >(null);

  useEffect(() => {
    getFeatures()
      .then((data) => setFeatureNames(data.features))
      .catch(() => setFeatureNames(null));
  }, []);

  const csvColumns = useMemo(() => {
    const first = csvRows[0];
    return first ? Object.keys(first) : [];
  }, [csvRows]);

  useEffect(() => {
    if (!featureNames || csvColumns.length === 0) return;

    identifyFeatures({ columns: csvColumns, target_features: featureNames })
      .then((res) => {
        setDetectedMapping(res.mapping || {});
        setDetectionLogs(res.logs || []);
        const mappedTargets = new Set(Object.values(res.mapping || {}));
        const missing = featureNames.filter((f) => !mappedTargets.has(f));
        setMissingModelFeatures(missing);
        // show in server console too for debugging
        console.log('[feature-detection]', res.logs);
      })
      .catch((e) => {
        setDetectedMapping({});
        setDetectionLogs([`[error] ${e instanceof Error ? e.message : 'Feature detection failed'}`]);
        setMissingModelFeatures([]);
      });
  }, [featureNames, csvColumns]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    reset();
    setPipelineError(null);
    setAnalysis(null);
    setValidation(null);
    setTraining(null);
    setRanking(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setCsvText(text);
      const rows = parseCsvToObject(text);
      setCsvRows(rows);
      setSelectedRowIndex(0);
    };
    reader.readAsText(f);
  }, [reset]);

  const runAnalyze = useCallback(async () => {
    if (!csvText) return;
    setPipelineError(null);
    setPipelineLoading('analyze');
    try {
      const a = await analyzeDataset(csvText);
      setAnalysis(a);
      return a;
    } catch (e) {
      setPipelineError(e instanceof Error ? e.message : 'Analyze failed');
      return null;
    } finally {
      setPipelineLoading(null);
    }
  }, [csvText]);

  const runValidate = useCallback(async () => {
    if (!analysis) return;
    setPipelineError(null);
    setPipelineLoading('validate');
    try {
      const v = await validateDataset({
        analysis,
        detected_mapping: detectedMapping,
        required_features: ['band_gap', 'mobility', 'dielectric_constant', 'temperature'],
      });
      setValidation(v);
      return v;
    } catch (e) {
      setPipelineError(e instanceof Error ? e.message : 'Validate failed');
      return null;
    } finally {
      setPipelineLoading(null);
    }
  }, [analysis, detectedMapping]);

  const runTrain = useCallback(async () => {
    if (!csvText) return;
    if (!validation || validation.status !== 'suitable') return;
    setPipelineError(null);
    setPipelineLoading('train');
    try {
      const t = await trainModel({ csv_text: csvText, target_column: targetColumn });
      setTraining(t);
      return t;
    } catch (e) {
      setPipelineError(e instanceof Error ? e.message : 'Training failed');
      return null;
    } finally {
      setPipelineLoading(null);
    }
  }, [csvText, validation, targetColumn]);

  const runRank = useCallback(async () => {
    if (!csvText) return;
    setPipelineError(null);
    setPipelineLoading('rank');
    try {
      const r = await rankMaterials({ csv_text: csvText, top_k: 3 });
      setRanking(r);
      return r;
    } catch (e) {
      setPipelineError(e instanceof Error ? e.message : 'Ranking failed');
      return null;
    } finally {
      setPipelineLoading(null);
    }
  }, [csvText]);

  const runPredictionFromCsv = useCallback(() => {
    const row = csvRows[selectedRowIndex];
    if (!row) return;

    // Map arbitrary dataset columns to the model feature keys.
    if (featureNames && Object.keys(detectedMapping).length > 0) {
      const modelInput: Record<string, number> = {};
      for (const feature of featureNames) {
        // find a column whose detected meaning is this feature
        const sourceCol = Object.keys(detectedMapping).find((c) => detectedMapping[c] === feature);
        modelInput[feature] = sourceCol ? Number(row[sourceCol] ?? 0) : 0;
      }
      predict(modelInput);
      return;
    }

    // Fallback: use raw row
    predict(row);
  }, [csvRows, selectedRowIndex, predict, featureNames, detectedMapping]);

  // Backend mapping output (for model feature mismatch problems) now comes from the hook.

  const runPredictionFromManual = useCallback(() => {
    try {
      const parsed = JSON.parse(manualInput) as Record<string, number>;
      // If user pasted arbitrary keys, attempt detection+mapping before prediction.
      if (featureNames) {
        const cols = Object.keys(parsed);
        identifyFeatures({ columns: cols, target_features: featureNames })
          .then((res) => {
            const modelInput: Record<string, number> = {};
            for (const feature of featureNames) {
              const sourceCol = Object.keys(res.mapping || {}).find((c) => (res.mapping as Record<string, string>)[c] === feature);
              modelInput[feature] = sourceCol ? Number((parsed as Record<string, number>)[sourceCol] ?? 0) : 0;
            }
            setDetectedMapping(res.mapping || {});
            setDetectionLogs(res.logs || []);
            const mappedTargets = new Set(Object.values(res.mapping || {}));
            setMissingModelFeatures(featureNames.filter((f) => !mappedTargets.has(f)));
            predict(modelInput);
          })
          .catch(() => predict(parsed));
      } else {
        predict(parsed);
      }
    } catch {
      reset();
      alert('Invalid JSON. Use an object with numeric values, e.g. {"feature1": 1.2, "feature2": 3.4}');
    }
  }, [manualInput, predict, reset, featureNames]);

  const exampleJson = featureNames?.length
    ? JSON.stringify(
        Object.fromEntries(featureNames.map((f) => [f, 0])),
        null,
        2
      )
    : '{"feature1": 1.0, "feature2": 2.0}';

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Container>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
          Upload → Analyze → Validate → Train → Rank
        </h1>
        <p className="text-slate-600 mb-8">
          Upload a dataset to automatically analyze it, validate quality, train a model, and rank the top 3 materials for transistor applications.
        </p>

        <div className="space-y-10">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload CSV</h2>
            <input
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700"
            />
            {pipelineError && (
              <p className="mt-3 text-sm text-red-600 font-medium">{pipelineError}</p>
            )}

            {csvText && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={runAnalyze}
                  disabled={pipelineLoading !== null}
                >
                  {pipelineLoading === 'analyze' ? 'Analyzing…' : 'Analyze Dataset'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={runValidate}
                  disabled={pipelineLoading !== null || !analysis}
                >
                  {pipelineLoading === 'validate' ? 'Validating…' : 'Validate Quality'}
                </Button>
              </div>
            )}

            {analysis && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Dataset Analysis</h3>
                <div className="text-sm text-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded bg-white border border-slate-200 p-3">
                    <div className="text-xs text-slate-500">Rows</div>
                    <div className="text-lg font-semibold text-slate-900">{analysis.row_count}</div>
                  </div>
                  <div className="rounded bg-white border border-slate-200 p-3">
                    <div className="text-xs text-slate-500">Columns</div>
                    <div className="text-lg font-semibold text-slate-900">{analysis.columns.length}</div>
                  </div>
                  <div className="rounded bg-white border border-slate-200 p-3">
                    <div className="text-xs text-slate-500">Missing cells</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {Object.values(analysis.missing_values).reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="text-xs text-slate-600 cursor-pointer">Columns</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                    {analysis.columns.join(', ')}
                  </pre>
                </details>
              </div>
            )}

            {validation && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Dataset Quality</h3>
                <p className="text-sm text-slate-700">
                  Score: <span className="font-semibold">{validation.quality_score}</span> / 100 —{' '}
                  <span className={validation.status === 'suitable' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                    {validation.status}
                  </span>
                </p>
                {validation.reasons.length > 0 && (
                  <ul className="mt-2 text-sm text-slate-700 list-disc pl-5">
                    {validation.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="w-full md:w-auto">
                    <label className="block text-xs text-slate-600 mb-1">Target column for training</label>
                    <input
                      value={targetColumn}
                      onChange={(e) => setTargetColumn(e.target.value)}
                      className="w-full md:w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm"
                      placeholder="critical_temp"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={runTrain}
                    disabled={pipelineLoading !== null || validation.status !== 'suitable'}
                  >
                    {pipelineLoading === 'train' ? 'Training…' : 'Train Model'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={runRank}
                    disabled={pipelineLoading !== null || !training?.trained}
                  >
                    {pipelineLoading === 'rank' ? 'Ranking…' : 'Find Best Materials'}
                  </Button>
                </div>
              </div>
            )}

            {training && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Model Training</h3>
                {training.trained ? (
                  <p className="text-sm text-slate-700">
                    Trained: <span className="text-emerald-700 font-semibold">true</span>
                    {typeof training.model_accuracy === 'number' && (
                      <>
                        {' '}— Accuracy (R²): <span className="font-semibold">{training.model_accuracy.toFixed(3)}</span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-red-600 font-medium">Training failed: {training.error}</p>
                )}
              </div>
            )}

            {ranking && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Top 3 Materials for Transistors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ranking.top_materials.map((m) => (
                    <div key={m.rank} className="rounded-lg bg-white border border-slate-200 p-4">
                      <div className="text-xs text-slate-500">Rank {m.rank}</div>
                      <div className="text-lg font-semibold text-slate-900">{m.name}</div>
                      <div className="mt-1 text-sm text-slate-700">
                        Score: <span className="font-semibold">{m.score.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {ranking.detection_logs?.length ? (
                  <details className="mt-3">
                    <summary className="text-xs text-slate-600 cursor-pointer">Ranking feature detection logs</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{ranking.detection_logs.join('\n')}</pre>
                  </details>
                ) : null}
              </div>
            )}
            {csvRows.length > 0 && (
              <div className="mt-4">
                <p className="text-slate-600 mb-2">
                  Found {csvRows.length} row(s). Select row and run prediction:
                </p>
                <select
                  value={selectedRowIndex}
                  onChange={(e) => setSelectedRowIndex(Number(e.target.value))}
                  className="mt-2 block w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                >
                  {csvRows.map((_, i) => (
                    <option key={i} value={i}>
                      Row {i + 1}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={runPredictionFromCsv}
                  disabled={loading}
                  className="mt-3"
                >
                  {loading ? 'Running…' : 'Predict from selected row'}
                </Button>
              </div>
            )}

            {csvRows.length > 0 && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Auto-detected feature mapping</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.keys(detectedMapping).length === 0 && (
                    <p className="text-slate-600">No mapping detected yet.</p>
                  )}
                  {Object.entries(detectedMapping).map(([src, dst]) => (
                    <div key={src} className="flex justify-between rounded bg-white px-3 py-2 border border-slate-200">
                      <span className="font-mono text-slate-700">{src}</span>
                      <span className="text-slate-900">→ {dst}</span>
                    </div>
                  ))}
                </div>
                {missingModelFeatures.length > 0 && (
                  <p className="mt-3 text-xs text-amber-700">
                    Missing model features (filled with 0): {missingModelFeatures.join(', ')}
                  </p>
                )}
                {detectionLogs.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-slate-600 cursor-pointer">Detection logs</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{detectionLogs.join('\n')}</pre>
                  </details>
                )}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Or enter JSON</h2>
            <p className="text-sm text-slate-600 mb-2">
              Object with feature names and numeric values. Required keys: {featureNames ? featureNames.join(', ') : 'loading…'}
            </p>
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={exampleJson}
              rows={6}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-mono text-sm"
            />
            <Button
              type="button"
              onClick={runPredictionFromManual}
              disabled={loading}
              className="mt-3"
            >
              {loading ? 'Running…' : 'Predict from JSON'}
            </Button>
          </section>

          {(result !== null || error) && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Result</h2>
              {error && (
                <p className="text-red-600 font-medium">{error}</p>
              )}
              {result !== null && (
                <p className="text-2xl font-semibold text-slate-900">
                  Prediction: <span className="text-blue-600">{result}</span>
                </p>
              )}

              {backendDetectedMapping && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Backend feature mapping (model schema)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(backendDetectedMapping).slice(0, 30).map(([src, dst]) => (
                      <div key={src} className="flex justify-between rounded bg-white px-3 py-2 border border-slate-200">
                        <span className="font-mono text-slate-700">{src}</span>
                        <span className="text-slate-900">→ {dst}</span>
                      </div>
                    ))}
                  </div>
                  {backendMissingFeatures?.length ? (
                    <p className="mt-3 text-xs text-amber-700">
                      Missing model features filled with defaults: {backendMissingFeatures.slice(0, 30).join(', ')}
                      {backendMissingFeatures.length > 30 ? ' …' : ''}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          )}
        </div>
      </Container>
    </div>
  );
}

*/