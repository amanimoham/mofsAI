import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..', '..');
const PYTHON = process.platform === 'win32' ? 'py' : 'python3';
const PY_ARGS = process.platform === 'win32' ? ['-3'] : [];

export async function POST(request: Request): Promise<NextResponse> {
  let body: { csv_text?: string; target_column?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.csv_text) return NextResponse.json({ error: '`csv_text` is required' }, { status: 400 });
  if (!body.target_column) return NextResponse.json({ error: '`target_column` is required' }, { status: 400 });

  const inputData = JSON.stringify({ csv_text: body.csv_text, target_column: body.target_column });

  return new Promise<NextResponse>((resolve) => {
    const child = spawn(PYTHON, [...PY_ARGS, 'train_dataset.py'], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (c) => (stderr += c));

    child.on('error', (err) => resolve(NextResponse.json({ trained: false, error: err.message }, { status: 500 })));

    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout || '{}');
        if (code !== 0) {
          resolve(NextResponse.json({ trained: false, error: parsed.error || stderr || 'Training failed' }, { status: 500 }));
          return;
        }
        resolve(NextResponse.json(parsed));
      } catch {
        resolve(NextResponse.json({ trained: false, error: stderr || 'Invalid output' }, { status: 500 }));
      }
    });

    child.stdin.write(inputData, 'utf8');
    child.stdin.end();
  });
}

