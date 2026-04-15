/// <reference types="vite/client" />
/**
 * Cliente fino para a Pages Function /api/gemini.
 *
 * IMPORTANTE: este arquivo NÃO importa @google/genai. Toda chamada ao Gemini
 * é proxyada pela função em functions/api/gemini.ts, que injeta a chave a
 * partir de context.env.GEMINI_API_KEY (variável de ambiente do servidor).
 *
 * As assinaturas públicas são as mesmas do contrato original (Agente 1).
 */

export interface AICategorizationResult {
  id: string;
  cleanName: string;
  category: string;
  paymentMethod: string;
}

const GEMINI_ENDPOINT = import.meta.env.DEV
  ? 'http://localhost:8788/api/gemini'
  : '/api/gemini';

const MODEL_PRO = 'gemini-3.1-pro-preview';
const MODEL_FLASH = 'gemini-3.1-flash-preview';

// ---------- Schemas REST (strings literais, não enums do SDK) ----------

const TRANSACTION_ITEM_SCHEMA = {
  type: 'OBJECT',
  properties: {
    id: { type: 'STRING' },
    date: { type: 'STRING', description: 'YYYY-MM-DD' },
    amount: { type: 'NUMBER', description: 'Valor absoluto positivo' },
    description: { type: 'STRING', description: 'Descrição curta' },
    memo: { type: 'STRING', description: 'Descrição original completa' },
    flow: { type: 'STRING', description: 'INFLOW ou OUTFLOW' },
    cleanName: { type: 'STRING' },
    category: { type: 'STRING' },
    paymentMethod: {
      type: 'STRING',
      description:
        'Método de pagamento: PIX, Cartão, Boleto, Transferência, Saque, Tarifa, ou Outros',
    },
  },
  required: [
    'id',
    'date',
    'amount',
    'description',
    'memo',
    'flow',
    'cleanName',
    'category',
    'paymentMethod',
  ],
};

const EXTRACT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    balance: {
      type: 'NUMBER',
      description: 'Saldo final do extrato, se encontrado. Caso contrário, null.',
    },
    currency: { type: 'STRING', description: 'Moeda, ex: BRL' },
    transactions: {
      type: 'ARRAY',
      items: TRANSACTION_ITEM_SCHEMA,
    },
  },
  required: ['transactions', 'currency'],
};

const CATEGORIZE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING', description: 'O mesmo ID enviado na requisição' },
      cleanName: { type: 'STRING', description: 'Nome limpo do estabelecimento' },
      category: { type: 'STRING', description: 'Uma das categorias permitidas' },
      paymentMethod: {
        type: 'STRING',
        description:
          'Método de pagamento: PIX, Cartão, Boleto, Transferência, Saque, Tarifa, ou Outros',
      },
    },
    required: ['id', 'cleanName', 'category', 'paymentMethod'],
  },
};

// ---------- Helpers ----------

function getUserCorrectionsText(): string {
  try {
    const correctionsStr = localStorage.getItem('@moneysense:corrections');
    if (!correctionsStr) return '';
    const corrections = JSON.parse(correctionsStr);
    if (!corrections || corrections.length === 0) return '';
    const recentCorrections = corrections.slice(-20);
    return (
      `\n\n=== CORREÇÕES MANUAIS DO USUÁRIO (PRIORIDADE MÁXIMA) ===\n` +
      `O usuário corrigiu manualmente as seguintes transações no passado. Você DEVE seguir este padrão se encontrar transações similares:\n` +
      recentCorrections
        .map(
          (c: any) =>
            `- "${c.memo}" -> cleanName: "${c.cleanName}", category: "${c.category}"`,
        )
        .join('\n')
    );
  } catch (e) {
    console.error('Erro ao ler correções do localStorage', e);
    return '';
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
  });
}

interface GeminiRestBody {
  contents: Array<{ role?: string; parts: any[] }>;
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: Record<string, unknown>;
}

async function callGemini(
  action: string,
  model: string,
  body: GeminiRestBody,
): Promise<any> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, model, body }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini proxy ${response.status}: ${errText}`);
  }

  return response.json();
}

function extractText(geminiResponse: any): string {
  const parts = geminiResponse?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p: any) => p.text ?? '').join('');
}

// ---------- Prompts compartilhados ----------

const EXTRACT_SYSTEM_INSTRUCTION_BASE = `Você é um assistente financeiro especialista em extração de dados de extratos bancários (PDF e CSV).
Sua tarefa é ler os arquivos fornecidos e extrair todas as transações financeiras, além do saldo atual final (se disponível).
Para cada transação, você deve:
1. Extrair a data no formato YYYY-MM-DD.
2. Extrair o valor (amount) como um número positivo (absoluto).
3. Extrair a descrição original (memo).
4. Gerar um ID único (ex: hash simples ou combinação de data+valor+memo sem espaços).
5. Determinar o fluxo (flow): 'INFLOW' para entradas/receitas, 'OUTFLOW' para saídas/despesas.
6. Extrair o nome limpo do estabelecimento (cleanName). Remova códigos, números de transação, datas, e prefixos como "COMPRA CARTAO", "PIX TRANSF", "PAGTO ELETRONICO".
7. Categorizar a transação (category).
8. Identificar o método de pagamento (paymentMethod).

=== TREINAMENTO DE CATEGORIZAÇÃO (FEW-SHOT EXAMPLES) ===
Use estes exemplos como base para o seu raciocínio:
- "COMPRA CARTAO UBER *TRIP" -> cleanName: "Uber", category: "Transporte App", paymentMethod: "Cartão"
- "IFOOD *IFOOD" -> cleanName: "iFood", category: "Restaurante/Delivery", paymentMethod: "Cartão"
- "PAGTO ELETRONICO COELBA" -> cleanName: "Coelba", category: "Contas Residenciais", paymentMethod: "Boleto"
- "PIX TRANSF JOAO SILVA" (saída) -> cleanName: "João Silva", category: "Transferência Enviada", paymentMethod: "PIX"
- "PIX TRANSF MARIA" (entrada) -> cleanName: "Maria", category: "Transferência Recebida", paymentMethod: "PIX"
- "PGTO BOLETO UNIMED" -> cleanName: "Unimed", category: "Saúde/Consultas", paymentMethod: "Boleto"
- "MERCADOPAGO" -> cleanName: "Mercado Pago", category: "Eletrônicos", paymentMethod: "Cartão"
- "AMAZON PRIME" -> cleanName: "Amazon Prime", category: "Assinaturas/Streaming", paymentMethod: "Cartão"
- "PAGTO SALARIO" -> cleanName: "Salário", category: "Salário", paymentMethod: "Transferência"
- "PETZ" ou "COBASI" -> cleanName: "Petz", category: "Petshop", paymentMethod: "Cartão"
- "DROGASIL" ou "PAGUE MENOS" -> cleanName: "Drogasil", category: "Farmácia", paymentMethod: "Cartão"
- "POSTO IPIRANGA" -> cleanName: "Posto Ipiranga", category: "Combustível", paymentMethod: "Cartão"
- "SUPERMERCADO BRETAS" -> cleanName: "Supermercado Bretas", category: "Mercado", paymentMethod: "Cartão"
- "AWS EMEA" -> cleanName: "AWS", category: "Serviços de Software", paymentMethod: "Cartão"
- "MENSALIDADE ESCOLAR" -> cleanName: "Escola", category: "Educação", paymentMethod: "Boleto"
- "XP INVESTIMENTOS" -> cleanName: "XP Investimentos", category: "Investimentos", paymentMethod: "Transferência"
- "TARIFA MANUTENCAO CONTA" -> cleanName: "Tarifa Bancária", category: "Taxas Bancárias", paymentMethod: "Tarifa"
- "ZARA" ou "RENNER" -> cleanName: "Zara", category: "Vestuário", paymentMethod: "Cartão"
- "SAQUE BANCO24HORAS" -> cleanName: "Saque", category: "Outros", paymentMethod: "Saque"
- "TED TRANSF" -> cleanName: "Transferência", category: "Transferência Enviada", paymentMethod: "Transferência"
- "PAGAMENTO FATURA CARTAO" ou "PAGTO FATURA" ou "PAGAMENTO TITULO" -> cleanName: "Fatura Cartão", category: "Fatura", paymentMethod: "Boleto"
- "PAGAMENTO DE FATURA" -> cleanName: "Fatura Cartão", category: "Fatura", paymentMethod: "Boleto"`;

const CATEGORIES_BLOCK = `
=== CATEGORIAS PERMITIDAS ===
Mercado, Restaurante/Delivery, Combustível, Transporte App, Transporte Público, Contas Residenciais, Aluguel/Condomínio, Farmácia, Saúde/Consultas, Assinaturas/Streaming, Lazer/Eventos, Educação, Serviços de Software, Taxas Bancárias, Vestuário, Eletrônicos, Casa/Móveis, Investimentos, Salário, Transferência Enviada, Transferência Recebida, Petshop, Impostos, Fatura, Cuidados Pessoais, Doações, Outros.

=== MÉTODOS DE PAGAMENTO PERMITIDOS ===
PIX, Cartão, Boleto, Transferência, Saque, Tarifa, Outros.

Retorne APENAS um objeto JSON válido seguindo estritamente o schema solicitado.`;

// ---------- Funções públicas ----------

export async function extractAndCategorizeFromMultipleDocuments(
  files: File[],
): Promise<{ balance: number | null; currency: string; transactions: any[] }> {
  const fileParts = await Promise.all(
    files.map(async (file) => {
      const base64 = await fileToBase64(file);
      let mimeType = file.type;
      if (!mimeType || mimeType === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        mimeType = 'text/plain';
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      }
      return { inlineData: { data: base64, mimeType } };
    }),
  );

  const userCorrectionsText = getUserCorrectionsText();

  const systemInstruction =
    EXTRACT_SYSTEM_INSTRUCTION_BASE + userCorrectionsText + CATEGORIES_BLOCK;

  try {
    const result = await callGemini('parsePdfMulti', MODEL_PRO, {
      contents: [
        {
          role: 'user',
          parts: [
            ...fileParts,
            {
              text: 'Extraia as transações destes extratos bancários e categorize-as. Combine os dados se houver múltiplos arquivos.',
            },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: EXTRACT_SCHEMA,
      },
    });

    const resultText = extractText(result);
    if (!resultText) return { balance: null, currency: 'BRL', transactions: [] };
    return JSON.parse(resultText);
  } catch (error) {
    console.error('Erro ao extrair dados dos documentos com IA:', error);
    throw error;
  }
}

export async function extractAndCategorizeFromDocument(file: File): Promise<any> {
  const base64 = await fileToBase64(file);

  let mimeType = file.type;
  if (!mimeType) {
    if (file.name.toLowerCase().endsWith('.csv')) mimeType = 'text/csv';
    else if (file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
    else mimeType = 'text/plain';
  }

  const userCorrectionsText = getUserCorrectionsText();
  const systemInstruction =
    EXTRACT_SYSTEM_INSTRUCTION_BASE + userCorrectionsText + CATEGORIES_BLOCK;

  try {
    const result = await callGemini('parsePdf', MODEL_PRO, {
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: 'Extraia as transações deste extrato bancário e categorize-as.' },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: EXTRACT_SCHEMA,
      },
    });

    const resultText = extractText(result);
    if (!resultText) return { balance: null, currency: 'BRL', transactions: [] };
    return JSON.parse(resultText);
  } catch (error) {
    console.error('Erro ao extrair dados do documento com IA:', error);
    throw error;
  }
}

export async function checkIfBankStatement(file: File): Promise<boolean> {
  const base64 = await fileToBase64(file);

  try {
    const result = await callGemini('checkStatement', MODEL_FLASH, {
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64, mimeType: file.type || 'application/pdf' } },
            {
              text: "Este documento é um extrato bancário ou fatura de cartão de crédito? Responda apenas 'sim' ou 'nao'.",
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: "Você é um classificador de documentos financeiros. Responda apenas 'sim' se o documento for um extrato bancário ou fatura de cartão de crédito, e 'nao' caso contrário (ex: DANFSE, nota fiscal, recibo de compra, contrato).",
          },
        ],
      },
    });

    const resultText = extractText(result).toLowerCase().trim();
    return resultText.includes('sim');
  } catch (error) {
    console.error('Erro ao verificar se o documento é um extrato:', error);
    return false;
  }
}

export async function categorizeTransactionsWithAI(
  transactions: any[],
): Promise<AICategorizationResult[]> {
  const promptData = transactions.map((t) => ({
    id: t.id,
    memo: t.memo,
    amount: t.amount,
  }));

  const userCorrectionsText = getUserCorrectionsText();

  const systemInstruction = `Você é um assistente financeiro especialista em análise de extratos bancários (OFX).
Sua tarefa é analisar o campo 'memo' (descrição bruta do banco) e o 'amount' (valor) de cada transação para:
1. Extrair o nome limpo e legível do estabelecimento (cleanName). Remova códigos, números de transação, datas, e prefixos como "COMPRA CARTAO", "PIX TRANSF", "PAGTO ELETRONICO".
2. Categorizar a transação (category).
3. Identificar o método de pagamento (paymentMethod).

=== TREINAMENTO DE CATEGORIZAÇÃO (FEW-SHOT EXAMPLES) ===
Use estes exemplos como base para o seu raciocínio:
- "COMPRA CARTAO UBER *TRIP" -> cleanName: "Uber", category: "Transporte App", paymentMethod: "Cartão"
- "IFOOD *IFOOD" -> cleanName: "iFood", category: "Restaurante/Delivery", paymentMethod: "Cartão"
- "PAGTO ELETRONICO COELBA" -> cleanName: "Coelba", category: "Contas Residenciais", paymentMethod: "Boleto"
- "PIX TRANSF JOAO SILVA" (amount < 0) -> cleanName: "João Silva", category: "Transferência Enviada", paymentMethod: "PIX"
- "PIX TRANSF MARIA" (amount > 0) -> cleanName: "Maria", category: "Transferência Recebida", paymentMethod: "PIX"
- "PGTO BOLETO UNIMED" -> cleanName: "Unimed", category: "Saúde/Consultas", paymentMethod: "Boleto"
- "MERCADOPAGO" -> cleanName: "Mercado Pago", category: "Eletrônicos", paymentMethod: "Cartão"
- "AMAZON PRIME" -> cleanName: "Amazon Prime", category: "Assinaturas/Streaming", paymentMethod: "Cartão"
- "PAGTO SALARIO" -> cleanName: "Salário", category: "Salário", paymentMethod: "Transferência"
- "PETZ" ou "COBASI" -> cleanName: "Petz", category: "Petshop", paymentMethod: "Cartão"
- "DROGASIL" ou "PAGUE MENOS" -> cleanName: "Drogasil", category: "Farmácia", paymentMethod: "Cartão"
- "POSTO IPIRANGA" -> cleanName: "Posto Ipiranga", category: "Combustível", paymentMethod: "Cartão"
- "SUPERMERCADO BRETAS" -> cleanName: "Supermercado Bretas", category: "Mercado", paymentMethod: "Cartão"
- "AWS EMEA" -> cleanName: "AWS", category: "Serviços de Software", paymentMethod: "Cartão"
- "MENSALIDADE ESCOLAR" -> cleanName: "Escola", category: "Educação", paymentMethod: "Boleto"
- "XP INVESTIMENTOS" -> cleanName: "XP Investimentos", category: "Investimentos", paymentMethod: "Transferência"
- "TARIFA MANUTENCAO CONTA" -> cleanName: "Tarifa Bancária", category: "Taxas Bancárias", paymentMethod: "Tarifa"
- "ZARA" ou "RENNER" -> cleanName: "Zara", category: "Vestuário", paymentMethod: "Cartão"
- "SAQUE BANCO24HORAS" -> cleanName: "Saque", category: "Outros", paymentMethod: "Saque"
- "TED TRANSF" -> cleanName: "Transferência", category: "Transferência Enviada", paymentMethod: "Transferência"
- "PAGAMENTO FATURA CARTAO" ou "PAGTO FATURA" ou "PAGAMENTO TITULO" -> cleanName: "Fatura Cartão", category: "Fatura", paymentMethod: "Boleto"
- "PAGAMENTO DE FATURA" -> cleanName: "Fatura Cartão", category: "Fatura", paymentMethod: "Boleto"${userCorrectionsText}

=== CATEGORIAS PERMITIDAS ===
Mercado, Restaurante/Delivery, Combustível, Transporte App, Transporte Público, Contas Residenciais, Aluguel/Condomínio, Farmácia, Saúde/Consultas, Assinaturas/Streaming, Lazer/Eventos, Educação, Serviços de Software, Taxas Bancárias, Vestuário, Eletrônicos, Casa/Móveis, Investimentos, Salário, Transferência Enviada, Transferência Recebida, Petshop, Impostos, Fatura, Cuidados Pessoais, Doações, Outros.

=== MÉTODOS DE PAGAMENTO PERMITIDOS ===
PIX, Cartão, Boleto, Transferência, Saque, Tarifa, Outros.

Retorne APENAS um array JSON válido seguindo estritamente o schema solicitado.`;

  try {
    const result = await callGemini('categorize', MODEL_PRO, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Categorize as seguintes transações financeiras:\n${JSON.stringify(promptData)}`,
            },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: CATEGORIZE_SCHEMA,
      },
    });

    const resultText = extractText(result);
    if (!resultText) return [];
    return JSON.parse(resultText) as AICategorizationResult[];
  } catch (error) {
    console.error('Erro ao categorizar com IA:', error);
    throw error;
  }
}

export async function chatWithAI(
  messages: { role: 'user' | 'model'; text: string }[],
  persona: any,
  appData: any,
): Promise<string> {
  const history = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  const systemInstruction = `Você é o assistente financeiro inteligente ${persona.robotName}.
${persona.mentality}

Contexto do Usuário:
${
  appData
    ? `O usuário possui ${appData.transactions.length} transações registradas.
Resumo:
- Saldo: ${appData.balance || 'Não identificado'}
- Moeda: ${appData.currency}
- Total de Transações: ${appData.transactions.length}`
    : 'O usuário ainda não importou dados financeiros.'
}

Instruções:
1. Seja amigável e profissional.
2. Use Markdown para formatar suas respostas (negrito, listas, tabelas).
3. Se o usuário perguntar sobre seus gastos, use o contexto fornecido.
4. Mantenha-se fiel à sua mentalidade de investimento (${persona.name}).
5. Responda sempre em Português do Brasil.`;

  try {
    const result = await callGemini('chat', MODEL_PRO, {
      contents: history,
      systemInstruction: { parts: [{ text: systemInstruction }] },
    });

    return extractText(result) || 'Desculpe, não consegui gerar uma resposta.';
  } catch (error) {
    console.error('Erro no chat com IA:', error);
    return 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?';
  }
}
