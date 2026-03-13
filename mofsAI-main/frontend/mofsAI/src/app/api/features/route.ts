import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..', '..');
const PYTHON = process.platform === 'win32' ? 'py' : 'python3';
const PY_ARGS = process.platform === 'win32' ? ['-3'] : [];

export async function GET(): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const child = spawn(PYTHON, [...PY_ARGS, 'get_features.py'], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', () => {
      resolve(NextResponse.json({ error: 'Failed to run Python' }, { status: 500 }));
    });

    child.on('close', () => {
      try {
        const data = JSON.parse(stdout);
        if (data.error) {
          resolve(NextResponse.json({ error: data.error }, { status: 500 }));
          return;
        }
        resolve(NextResponse.json(data));
      } catch {
        resolve(NextResponse.json({ error: stderr || 'Invalid output' }, { status: 500 }));
      }
    });

    child.stdin.end();
  });
}
