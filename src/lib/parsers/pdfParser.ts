import { extractAndCategorizeFromDocument } from '../aiService';
import { OFXData } from './ofxParser';

export async function parsePDF(file: File): Promise<OFXData> {
  // For now, we use the AI service which is already optimized for PDF extraction and categorization
  return await extractAndCategorizeFromDocument(file);
}
