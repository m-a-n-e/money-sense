import { extractAndCategorizeFromDocument } from '../aiService';
import { OFXData } from './ofxParser';

export async function parseCSV(file: File): Promise<OFXData> {
  // For now, we use the AI service which is already optimized for CSV extraction and categorization
  return await extractAndCategorizeFromDocument(file);
}
