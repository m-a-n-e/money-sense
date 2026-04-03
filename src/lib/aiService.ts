import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AICategorizationResult {
  id: string;
  cleanName: string;
  category: string;
}

export async function categorizeTransactionsWithAI(transactions: { id: string; memo: string; amount: number }[]): Promise<AICategorizationResult[]> {
  if (!transactions || transactions.length === 0) return [];

  // Prepara os dados para a IA (enviamos apenas o necessário para economizar tokens)
  const promptData = transactions.map(t => ({ id: t.id, memo: t.memo, amount: t.amount }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Categorize as seguintes transações financeiras:\n${JSON.stringify(promptData)}`,
      config: {
        systemInstruction: `Você é um assistente financeiro especialista em análise de extratos bancários (OFX).
Sua tarefa é analisar o campo 'memo' (descrição bruta do banco) e o 'amount' (valor) de cada transação para:
1. Extrair o nome limpo e legível do estabelecimento (cleanName).
2. Categorizar a transação (category).

=== TREINAMENTO DE CATEGORIZAÇÃO (FEW-SHOT EXAMPLES) ===
Use estes exemplos como base para o seu raciocínio:
- "COMPRA CARTAO UBER *TRIP" -> cleanName: "Uber", category: "Transporte"
- "IFOOD *IFOOD" -> cleanName: "iFood", category: "Alimentação"
- "PAGTO ELETRONICO COELBA" -> cleanName: "Coelba", category: "Moradia"
- "PIX TRANSF JOAO SILVA" -> cleanName: "João Silva", category: "Transferência"
- "PGTO BOLETO UNIMED" -> cleanName: "Unimed", category: "Saúde"
- "MERCADOPAGO" -> cleanName: "Mercado Pago", category: "Serviços"
- "AMAZON PRIME" -> cleanName: "Amazon Prime", category: "Lazer"
- "PAGTO SALARIO" -> cleanName: "Salário", category: "Salário"
- "PETZ" ou "COBASI" -> cleanName: "Petz/Cobasi", category: "Petshop"
- "DROGASIL" ou "PAGUE MENOS" -> cleanName: "Farmácia", category: "Saúde"

=== CATEGORIAS PERMITIDAS ===
Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Serviços, Compras, Investimentos, Salário, Transferência, Petshop, Outros.

Retorne APENAS um array JSON válido seguindo estritamente o schema solicitado.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "O mesmo ID enviado na requisição" },
              cleanName: { type: Type.STRING, description: "Nome limpo do estabelecimento" },
              category: { type: Type.STRING, description: "Uma das categorias permitidas" }
            },
            required: ["id", "cleanName", "category"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return [];
    
    return JSON.parse(resultText) as AICategorizationResult[];
  } catch (error) {
    console.error("Erro ao categorizar com IA:", error);
    throw error;
  }
}
