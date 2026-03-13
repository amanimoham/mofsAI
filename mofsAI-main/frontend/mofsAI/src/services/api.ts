const API_BASE = '';

export type ApiStatus = 'running' | 'completed' | 'error';

export interface PredictResponse {
  result: number;
  detected_mapping?: Record<string, string>;
  missing_features?: string[];
}

export interface FeaturesResponse {
  features: string[];
}

export interface DatasetAnalysisResponse {
  api_status?: ApiStatus;
  columns: string[];
  row_count: number;
  column_types: Record<string, string>;
  missing_values: Record<string, number>;
  statistics: Record<
    string,
    { mean: number | null; std: number | null; missing: number; missing_ratio: number; outliers_iqr: number }
  >;
}

export interface DatasetValidationResponse {
  api_status?: ApiStatus;
  quality_score: number;
  status: 'suitable' | 'not_suitable';
  reasons: string[];
  missing_ratio: number;
  required_features: string[];
}

export interface TrainModelResponse {
  trained: boolean;
  model_accuracy?: number;
  feature_importance?: Record<string, number>;
  feature_names?: string[];
  error?: string;
}

export interface RankMaterialsResponse {
  api_status?: ApiStatus;
  top_materials: Array<{
    rank: number;
    name: string;
    score: number;
    features?: Record<string, number>;
  }>;
  detected_mapping?: Record<string, string>;
  detection_logs?: string[];
}

export interface GenerateAiMaterialsResponse {
  api_status?: ApiStatus;
  generated_materials: Array<{
    rank: number;
    features: Record<string, number>;
    predicted_score: number;
    model_prediction: number | null;
  }>;
  generated_count: number;
  feature_names: string[];
  vae: { hidden_dim: number; latent_dim: number; epochs: number; batch_size: number; lr: number };
  error?: string;
}

export interface IdentifyFeaturesResponse {
  mapping: Record<string, string>;
  logs: string[];
}

export async function getFeatures(): Promise<FeaturesResponse> {
  const res = await fetch(`${API_BASE}/api/features`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to load features');
  }
  return res.json();
}

export async function identifyFeatures(payload: {
  columns: string[];
  target_features?: string[] | null;
}): Promise<IdentifyFeaturesResponse> {
  const res = await fetch(`${API_BASE}/api/identify-features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText || 'Feature detection failed');
  }
  return res.json();
}

export async function analyzeDataset(csv_text: string): Promise<DatasetAnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/analyze-dataset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv_text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText || 'Analyze dataset failed');
  }
  return res.json();
}

export async function validateDataset(payload: {
  analysis: DatasetAnalysisResponse;
  detected_mapping: Record<string, string>;
  required_features?: string[];
}): Promise<DatasetValidationResponse> {
  const res = await fetch(`${API_BASE}/api/validate-dataset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText || 'Validate dataset failed');
  }
  return res.json();
}

export async function trainModel(payload: { csv_text: string; target_column: string }): Promise<TrainModelResponse> {
  const res = await fetch(`${API_BASE}/api/train-model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText || 'Training failed');
  }
  return data;
}

export async function rankMaterials(payload: { csv_text: string; top_k?: number }): Promise<RankMaterialsResponse> {
  const res = await fetch(`${API_BASE}/api/rank-materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText || 'Ranking failed');
  }
  return res.json();
}

export async function generateAiMaterials(payload: {
  csv_text: string;
  exclude_columns?: string[];
  n_generate?: number;
  top_k?: number;
}): Promise<GenerateAiMaterialsResponse> {
  const res = await fetch(`${API_BASE}/api/generate-ai-materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText || 'AI material generation failed');
  }
  return res.json();
}

export async function postPredict(body: Record<string, number>): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText || 'Prediction failed');
  }
  return res.json();
}
