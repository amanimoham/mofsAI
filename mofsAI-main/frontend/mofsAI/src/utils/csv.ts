export function parseCsvToObject(csvText: string): Record<string, number>[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, number>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, number> = {};
    headers.forEach((header, idx) => {
      const num = Number(values[idx]);
      row[header] = Number.isNaN(num) ? 0 : num;
    });
    rows.push(row);
  }
  return rows;
}
