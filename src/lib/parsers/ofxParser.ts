export interface OFXTransaction {
  id: string;
  type: string;
  date: string;
  amount: number;
  description: string;
  memo: string;
  flow: 'INFLOW' | 'OUTFLOW';
  category?: string;
  cleanName?: string;
  paymentMethod?: string;
}

export interface OFXData {
  currency?: string;
  bankId?: string;
  accountId?: string;
  accountType?: string;
  balance?: number;
  balanceDate?: string;
  transactions: OFXTransaction[];
}

const extractTag = (str: string, tag: string): string | null => {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const match = str.match(regex);
  return match ? match[1].trim() : null;
};

function extractPaymentMethod(text: string, trnType: string): string {
  const upperText = text.toUpperCase();
  let paymentMethod = 'Outros';

  if (upperText.includes('PIX')) paymentMethod = 'PIX';
  else if (upperText.includes('CARTAO') || upperText.includes('CARTÃO')) paymentMethod = 'Cartão';
  else if (upperText.includes('TED') || upperText.includes('DOC') || upperText.includes('TRANSF')) paymentMethod = 'Transferência';
  else if (upperText.includes('BOLETO') || upperText.includes('TITULO') || upperText.includes('PAGTO ELETRONICO')) paymentMethod = 'Boleto';
  else if (upperText.includes('SAQUE') || upperText.includes('BANCO24HORAS') || upperText.includes('CASH')) paymentMethod = 'Saque';
  else if (upperText.includes('TARIFA') || upperText.includes('JUROS') || upperText.includes('IOF') || upperText.includes('MENSALIDADE') || upperText.includes('TAXA')) paymentMethod = 'Tarifa';
  else {
    const typeMap: Record<string, string> = {
      'POS': 'Cartão',
      'CREDIT': 'Crédito',
      'DEBIT': 'Débito',
      'XFER': 'Transferência',
      'PAYMENT': 'Pagamento',
      'CASH': 'Saque',
      'DIRECTDEP': 'Depósito',
      'FEE': 'Tarifa',
      'SRVCHG': 'Tarifa',
      'INT': 'Juros',
      'DIV': 'Dividendos',
    };
    paymentMethod = typeMap[trnType.toUpperCase()] || 'Outros';
  }
  
  return paymentMethod;
}

export async function parseOFX(file: File): Promise<OFXData> {
  const ofxString = await file.text();
  const data: OFXData = { transactions: [] };

  data.currency = extractTag(ofxString, 'CURDEF') || 'BRL';
  data.bankId = extractTag(ofxString, 'BANKID') || undefined;
  data.accountId = extractTag(ofxString, 'ACCTID') || undefined;
  data.accountType = extractTag(ofxString, 'ACCTTYPE') || undefined;

  const ledgerBalMatch = ofxString.match(/<LEDGERBAL>[\s\S]*?<\/LEDGERBAL>/i) || ofxString.match(/<LEDGERBAL>[\s\S]*?(?=<[A-Z])/i);
  if (ledgerBalMatch) {
    const balAmt = extractTag(ledgerBalMatch[0], 'BALAMT');
    if (balAmt) data.balance = parseFloat(balAmt);
    
    const rawBalDate = extractTag(ledgerBalMatch[0], 'DTASOF');
    if (rawBalDate && rawBalDate.length >= 8) {
      data.balanceDate = `${rawBalDate.substring(0, 4)}-${rawBalDate.substring(4, 6)}-${rawBalDate.substring(6, 8)}`;
    }
  }

  // Try standard STMTTRN with closing tags
  let stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let matches = [...ofxString.matchAll(stmtTrnRegex)];

  // If no matches, try looser regex (OFX often omits closing tags)
  if (matches.length === 0) {
    stmtTrnRegex = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>)/gi;
    matches = [...ofxString.matchAll(stmtTrnRegex)];
  }

  for (const match of matches) {
    const trnBlock = match[1];
    const amountStr = extractTag(trnBlock, 'TRNAMT');
    if (!amountStr) continue;
    
    const amount = parseFloat(amountStr);
    const rawDate = extractTag(trnBlock, 'DTPOSTED') || '';
    let formattedDate = rawDate;
    if (rawDate.length >= 8) {
      formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
    }

    const rawDesc = extractTag(trnBlock, 'NAME') || '';
    const rawMemo = extractTag(trnBlock, 'MEMO') || '';
    const combinedText = `${rawDesc} ${rawMemo}`.trim();
    const trnType = extractTag(trnBlock, 'TRNTYPE') || 'OTHER';

    const paymentMethod = extractPaymentMethod(combinedText, trnType);

    data.transactions.push({
      id: extractTag(trnBlock, 'FITID') || Math.random().toString(36).substring(7),
      type: trnType,
      date: formattedDate,
      amount: amount,
      description: rawDesc,
      memo: combinedText,
      flow: amount >= 0 ? 'INFLOW' : 'OUTFLOW',
      paymentMethod
    });
  }

  // Sort transactions by date descending
  data.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return data;
}
