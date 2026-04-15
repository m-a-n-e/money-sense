import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AICategorizationResult {
  id: string;
  cleanName: string;
  category: string;
  paymentMethod: string;
}

export async function extractAndCategorizeFromMultipleDocuments(files: File[]): Promise<{ balance: number | null, currency: string, transactions: any[] }> {
  const fileDataPromises = files.map(async (file) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
    });

    let mimeType = file.type;
    if (!mimeType || mimeType === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      mimeType = 'text/plain'; // Send CSV as plain text to ensure compatibility
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      mimeType = 'application/pdf';
    }

    return {
      inlineData: {
        data: base64,
        mimeType: mimeType
      }
    };
  });

  const fileData = await Promise.all(fileDataPromises);

  // Busca correções manuais do usuário para treinar a IA
  let userCorrectionsText = '';
  try {
    const correctionsStr = localStorage.getItem('@moneysense:corrections');
    if (correctionsStr) {
      const corrections = JSON.parse(correctionsStr);
      if (corrections && corrections.length > 0) {
        const recentCorrections = corrections.slice(-20);
        userCorrectionsText = `\n\n=== CORREÇÕES MANUAIS DO USUÁRIO (PRIORIDADE MÁXIMA) ===\nO usuário corrigiu manualmente as seguintes transações no passado. Você DEVE seguir este padrão se encontrar transações similares:\n` +
          recentCorrections.map((c: any) => `- "${c.memo}" -> cleanName: "${c.cleanName}", category: "${c.category}"`).join('\n');
      }
    }
  } catch (e) {
    console.error("Erro ao ler correções do localStorage", e);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [
        ...fileData,
        { text: "Extraia as transações destes extratos bancários e categorize-as. Combine os dados se houver múltiplos arquivos." }
      ],
      config: {
        systemInstruction: `Você é um assistente financeiro especialista em extração de dados de extratos bancários (PDF e CSV).
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
- "PAGAMENTO DE FATURA" -> cleanName: "Fatura Cartão", category: "Fatura", paymentMethod: "Boleto"${userCorrectionsText}

=== CATEGORIAS PERMITIDAS ===
Mercado, Restaurante/Delivery, Combustível, Transporte App, Transporte Público, Contas Residenciais, Aluguel/Condomínio, Farmácia, Saúde/Consultas, Assinaturas/Streaming, Lazer/Eventos, Educação, Serviços de Software, Taxas Bancárias, Vestuário, Eletrônicos, Casa/Móveis, Investimentos, Salário, Transferência Enviada, Transferência Recebida, Petshop, Impostos, Fatura, Cuidados Pessoais, Doações, Outros.

=== MÉTODOS DE PAGAMENTO PERMITIDOS ===
PIX, Cartão, Boleto, Transferência, Saque, Tarifa, Outros.

Retorne APENAS um objeto JSON válido seguindo estritamente o schema solicitado.`,

        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            balance: { type: Type.NUMBER, description: "Saldo final do extrato mais recente, se encontrado. Caso contrário, null." },
            currency: { type: Type.STRING, description: "Moeda, ex: BRL" },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  date: { type: Type.STRING, description: "YYYY-MM-DD" },
                  amount: { type: Type.NUMBER, description: "Valor absoluto positivo" },
                  description: { type: Type.STRING, description: "Descrição curta" },
                  memo: { type: Type.STRING, description: "Descrição original completa" },
                  flow: { type: Type.STRING, description: "INFLOW ou OUTFLOW" },
                  cleanName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  paymentMethod: { type: Type.STRING, description: "Método de pagamento: PIX, Cartão, Boleto, Transferência, Saque, Tarifa, ou Outros" }
                },
                required: ["id", "date", "amount", "description", "memo", "flow", "cleanName", "category", "paymentMethod"]
              }
            }
          },
          required: ["transactions", "currency"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return { balance: null, currency: 'BRL', transactions: [] };
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Erro ao extrair dados dos documentos com IA:", error);
    throw error;
  }
}

export async function extractAndCategorizeFromDocument(file: File): Promise<any> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
  });

  let mimeType = file.type;
  if (!mimeType) {
    if (file.name.toLowerCase().endsWith('.csv')) mimeType = 'text/csv';
    else if (file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
    else mimeType = 'text/plain';
  }

  // Busca correções manuais do usuário para treinar a IA
  let userCorrectionsText = '';
  try {
    const correctionsStr = localStorage.getItem('@moneysense:corrections');
    if (correctionsStr) {
      const corrections = JSON.parse(correctionsStr);
      if (corrections && corrections.length > 0) {
        const recentCorrections = corrections.slice(-20);
        userCorrectionsText = `\n\n=== CORREÇÕES MANUAIS DO USUÁRIO (PRIORIDADE MÁXIMA) ===\nO usuário corrigiu manualmente as seguintes transações no passado. Você DEVE seguir este padrão se encontrar transações similares:\n` +
          recentCorrections.map((c: any) => `- "${c.memo}" -> cleanName: "${c.cleanName}", category: "${c.category}"`).join('\n');
      }
    }
  } catch (e) {
    console.error("Erro ao ler correções do localStorage", e);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          inlineData: {
            data: base64,
            mimeType: mimeType
          }
        },
        "Extraia as transações deste extrato bancário e categorize-as."
      ],
      config: {
        systemInstruction: `Você é um assistente financeiro especialista em extração de dados de extratos bancários (PDF e CSV).
Sua tarefa é ler o arquivo fornecido e extrair todas as transações financeiras, além do saldo atual (se disponível).
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
- "PAGAMENTO DE FATURA" -> cleanName: "Fatura Cartão", category: "Fatura", paymentMethod: "Boleto"${userCorrectionsText}

=== CATEGORIAS PERMITIDAS ===
Mercado, Restaurante/Delivery, Combustível, Transporte App, Transporte Público, Contas Residenciais, Aluguel/Condomínio, Farmácia, Saúde/Consultas, Assinaturas/Streaming, Lazer/Eventos, Educação, Serviços de Software, Taxas Bancárias, Vestuário, Eletrônicos, Casa/Móveis, Investimentos, Salário, Transferência Enviada, Transferência Recebida, Petshop, Impostos, Fatura, Cuidados Pessoais, Doações, Outros.

=== MÉTODOS DE PAGAMENTO PERMITIDOS ===
PIX, Cartão, Boleto, Transferência, Saque, Tarifa, Outros.

Retorne APENAS um objeto JSON válido seguindo estritamente o schema solicitado.`,

        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            balance: { type: Type.NUMBER, description: "Saldo final do extrato, se encontrado. Caso contrário, null." },
            currency: { type: Type.STRING, description: "Moeda, ex: BRL" },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  date: { type: Type.STRING, description: "YYYY-MM-DD" },
                  amount: { type: Type.NUMBER, description: "Valor absoluto positivo" },
                  description: { type: Type.STRING, description: "Descrição curta" },
                  memo: { type: Type.STRING, description: "Descrição original completa" },
                  flow: { type: Type.STRING, description: "INFLOW ou OUTFLOW" },
                  cleanName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  paymentMethod: { type: Type.STRING, description: "Método de pagamento: PIX, Cartão, Boleto, Transferência, Saque, Tarifa, ou Outros" }
                },
                required: ["id", "date", "amount", "description", "memo", "flow", "cleanName", "category", "paymentMethod"]
              }
            }
          },
          required: ["transactions", "currency"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return { balance: null, currency: 'BRL', transactions: [] };
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Erro ao extrair dados do documento com IA:", error);
    throw error;
  }
}

export async function checkIfBankStatement(file: File): Promise<boolean> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-preview', // Use a faster/cheaper model for validation
      contents: [
        {
          inlineData: {
            data: base64,
            mimeType: file.type || 'application/pdf'
          }
        },
        "Este documento é um extrato bancário ou fatura de cartão de crédito? Responda apenas 'sim' ou 'nao'."
      ],
      config: {
        systemInstruction: "Você é um classificador de documentos financeiros. Responda apenas 'sim' se o documento for um extrato bancário ou fatura de cartão de crédito, e 'nao' caso contrário (ex: DANFSE, nota fiscal, recibo de compra, contrato).",
      }
    });

    const resultText = response.text?.toLowerCase().trim() || '';
    return resultText.includes('sim');
  } catch (error) {
    console.error("Erro ao verificar se o documento é um extrato:", error);
    return false; // Assume não em caso de erro
  }
}

export async function categorizeTransactionsWithAI(transactions: any[]): Promise<AICategorizationResult[]> {
  // Prepara os dados para a IA (enviamos apenas o necessário para economizar tokens)
  const promptData = transactions.map(t => ({ id: t.id, memo: t.memo, amount: t.amount }));

  // Busca correções manuais do usuário para treinar a IA
  let userCorrectionsText = '';
  try {
    const correctionsStr = localStorage.getItem('@moneysense:corrections');
    if (correctionsStr) {
      const corrections = JSON.parse(correctionsStr);
      if (corrections && corrections.length > 0) {
        // Pega as últimas 20 correções para não estourar o prompt
        const recentCorrections = corrections.slice(-20);
        userCorrectionsText = `\n\n=== CORREÇÕES MANUAIS DO USUÁRIO (PRIORIDADE MÁXIMA) ===\nO usuário corrigiu manualmente as seguintes transações no passado. Você DEVE seguir este padrão se encontrar transações similares:\n` + 
          recentCorrections.map((c: any) => `- "${c.memo}" -> cleanName: "${c.cleanName}", category: "${c.category}"`).join('\n');
      }
    }
  } catch (e) {
    console.error("Erro ao ler correções do localStorage", e);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Categorize as seguintes transações financeiras:\n${JSON.stringify(promptData)}`,
      config: {
        systemInstruction: `Você é um assistente financeiro especialista em análise de extratos bancários (OFX).
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

Retorne APENAS um array JSON válido seguindo estritamente o schema solicitado.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "O mesmo ID enviado na requisição" },
              cleanName: { type: Type.STRING, description: "Nome limpo do estabelecimento" },
              category: { type: Type.STRING, description: "Uma das categorias permitidas" },
              paymentMethod: { type: Type.STRING, description: "Método de pagamento: PIX, Cartão, Boleto, Transferência, Saque, Tarifa, ou Outros" }
            },
            required: ["id", "cleanName", "category", "paymentMethod"]
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

export async function chatWithAI(messages: { role: 'user' | 'model', text: string }[], persona: any, appData: any): Promise<string> {
  const history = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  const systemInstruction = `Você é o assistente financeiro inteligente ${persona.robotName}.
${persona.mentality}

Contexto do Usuário:
${appData ? `O usuário possui ${appData.transactions.length} transações registradas.
Resumo:
- Saldo: ${appData.balance || 'Não identificado'}
- Moeda: ${appData.currency}
- Total de Transações: ${appData.transactions.length}` : 'O usuário ainda não importou dados financeiros.'}

Instruções:
1. Seja amigável e profissional.
2. Use Markdown para formatar suas respostas (negrito, listas, tabelas).
3. Se o usuário perguntar sobre seus gastos, use o contexto fornecido.
4. Mantenha-se fiel à sua mentalidade de investimento (${persona.name}).
5. Responda sempre em Português do Brasil.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: history,
      config: {
        systemInstruction,
      }
    });

    return response.text || "Desculpe, não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Erro no chat com IA:", error);
    return "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?";
  }
}
