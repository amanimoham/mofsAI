import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..', '..');
const PYTHON = process.platform === 'win32' ? 'py' : 'python3';
const PY_ARGS = process.platform === 'win32' ? ['-3'] : [];

export async function POST(request: Request): Promise<NextResponse> {
  let body: { columns?: string[]; target_features?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const inputData = JSON.stringify({
    columns: body.columns ?? [],
    target_features: body.target_features ?? null,
  });

  return new Promise<NextResponse>((resolve) => {
    const child = spawn(PYTHON, [...PY_ARGS, 'identify_features.py'], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      resolve(NextResponse.json({ error: err.message }, { status: 500 }));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const msg = stderr.trim() || stdout.trim() || `Process exited with code ${code}`;
        try {
          const parsed = JSON.parse(stdout);
          resolve(NextResponse.json({ error: parsed.error || msg }, { status: 500 }));
        } catch {
          resolve(NextResponse.json({ error: msg }, { status: 500 }));
        }
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(NextResponse.json(parsed));
      } catch {
        resolve(NextResponse.json({ error: stderr.trim() || 'Invalid output' }, { status: 500 }));
      }
    });

    child.stdin.write(inputData, 'utf8');
    child.stdin.end();
  });
}

