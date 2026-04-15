import { extractAndCategorizeFromDocument, checkIfBankStatement } from '../aiService';
import { OFXData } from './ofxParser';

export async function parsePDF(file: File): Promise<OFXData> {
  const isBankStatement = await checkIfBankStatement(file);
  if (!isBankStatement) {
    throw new Error("O arquivo enviado não parece ser um extrato bancário ou fatura de cartão de crédito.");
  }
  return await extractAndCategorizeFromDocument(file);
}
