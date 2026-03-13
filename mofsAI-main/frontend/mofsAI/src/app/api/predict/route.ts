import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Project root (where material_model.pkl and features.pkl live)
const PROJECT_ROOT = path.resolve(process.cwd(), '..', '..');
const RUN_SCRIPT = path.join('frontend', 'run_model.py');
const PYTHON = process.platform === 'win32' ? 'py' : 'python3';
const PY_ARGS = process.platform === 'win32' ? ['-3'] : [];

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const inputData = JSON.stringify(body);

  return new Promise<NextResponse>((resolve) => {
    const child = spawn(PYTHON, [...PY_ARGS, RUN_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', (err) => {
      resolve(
        NextResponse.json(
          { error: `Failed to run model: ${err.message}` },
          { status: 500 }
        )
      );
    });

    child.on('close', (code) => {
      const errText = stderr.trim() || stdout.trim();
      if (code !== 0) {
        let msg = errText || `Process exited with code ${code}`;
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.error) msg = parsed.error;
        } catch {
          // use msg as-is
        }
        resolve(NextResponse.json({ error: msg }, { status: 500 }));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          resolve(NextResponse.json({ error: result.error }, { status: 500 }));
          return;
        }
        // Support both { result } and { prediction } for compatibility
        const value = result.result ?? result.prediction?.[0];
        if (typeof value === 'number') {
          resolve(
            NextResponse.json({
              result: value,
              detected_mapping: result.detected_mapping,
              missing_features: result.missing_features,
            })
          );
          return;
        }
        resolve(NextResponse.json(result));
      } catch {
        resolve(
          NextResponse.json(
            { error: errText || 'Invalid model output' },
            { status: 500 }
          )
        );
      }
    });

    child.stdin.write(inputData, 'utf8');
    child.stdin.end();
  });
}
