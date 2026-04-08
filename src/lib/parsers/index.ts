import { parseOFX, OFXData } from './ofxParser';
import { parseCSV } from './csvParser';
import { parsePDF } from './pdfParser';

export type { OFXData, OFXTransaction } from './ofxParser';

export async function parseBankStatement(file: File): Promise<OFXData> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.ofx')) {
    return await parseOFX(file);
  } else if (fileName.endsWith('.csv')) {
    return await parseCSV(file);
  } else if (fileName.endsWith('.pdf')) {
    return await parsePDF(file);
  } else {
    throw new Error('Formato de arquivo não suportado. Use .ofx, .csv ou .pdf');
  }
}
