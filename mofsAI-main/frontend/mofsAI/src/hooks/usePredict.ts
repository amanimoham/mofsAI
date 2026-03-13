import { useState, useCallback } from 'react';
import { postPredict, type PredictResponse } from '../services/api';

export function usePredict() {
  const [result, setResult] = useState<number | null>(null);
  const [detectedMapping, setDetectedMapping] = useState<Record<string, string> | null>(null);
  const [missingFeatures, setMissingFeatures] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(async (body: Record<string, number>) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDetectedMapping(null);
    setMissingFeatures(null);
    try {
      const data = await postPredict(body);
      setResult(data.result);
      setDetectedMapping(data.detected_mapping ?? null);
      setMissingFeatures(data.missing_features ?? null);
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Prediction failed';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setDetectedMapping(null);
    setMissingFeatures(null);
  }, []);

  return { result, detectedMapping, missingFeatures, loading, error, predict, reset };
}
