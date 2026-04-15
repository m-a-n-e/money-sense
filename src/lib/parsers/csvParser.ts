import { OFXData, OFXTransaction } from './ofxParser';

function normalizeDate(dateStr: string): string {
  // Try DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr; // Assume already YYYY-MM-DD
}

export async function parseCSVLocal(file: File): Promise<OFXData> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) throw new Error("Arquivo CSV vazio ou inválido");

  // Detect separator
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const separator = semicolonCount > commaCount ? ';' : ',';

  // Find header indices
  const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
  const dateIdx = headers.findIndex(h => h.includes('data'));
  const descIdx = headers.findIndex(h => h.includes('desc'));
  const valIdx = headers.findIndex(h => h.includes('valor') || h.includes('amount'));

  if (dateIdx === -1 || descIdx === -1 || valIdx === -1) {
    throw new Error("Não foi possível identificar as colunas necessárias (Data, Descrição, Valor)");
  }

  const transactions: OFXTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(separator);
    if (cols.length <= Math.max(dateIdx, descIdx, valIdx)) continue;

    const date = normalizeDate(cols[dateIdx].trim());
    const description = cols[descIdx].trim();
    const rawValue = cols[valIdx].trim();

    // Convert value: "1.500,00" -> 1500.00, "-50,00" -> -50.00
    // Handle both "1.500,00" and "1500.00"
    let amount = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amount)) amount = 0;

    transactions.push({
      id: Math.random().toString(36).substring(7),
      type: 'OTHER',
      date: date,
      amount: amount,
      description: description,
      memo: description,
      flow: amount >= 0 ? 'INFLOW' : 'OUTFLOW',
    });
  }

  return { transactions };
}
