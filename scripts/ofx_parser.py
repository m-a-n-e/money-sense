import re
import json

def clean_and_categorize(text, amount):
    text = text.upper()
    clean_name = re.sub(r'\s+', ' ', text).strip()
    category = 'Outros'

    rules = [
        {'keywords': ['UBER', '99APP', '99 POP', 'CABIFY', 'INDRIVE', 'BUSER'], 'category': 'Transporte'},
        {'keywords': ['IFOOD', 'RAPPI', 'ZÉ DELIVERY', 'MCDONALDS', 'BURGER KING', 'RESTAURANTE', 'PADARIA', 'PIZZARIA', 'LANCHONETE'], 'category': 'Alimentação'},
        {'keywords': ['SUPERMERCADO', 'ATACADAO', 'CARREFOUR', 'EXTRA', 'ASSAI', 'MERCADO', 'BRETAS', 'TESCO', 'DIA '], 'category': 'Mercado'},
        {'keywords': ['FARMACIA', 'DROGASIL', 'PAGUE MENOS', 'DROGARIA', 'HOSPITAL', 'CLINICA', 'RAIA', 'SAUDE'], 'category': 'Saúde'},
        {'keywords': ['PET', 'COBASI', 'PETZ', 'VETERINARIA', 'PETSHOP'], 'category': 'Petshop'},
        {'keywords': ['NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'CINEMA', 'INGRESSO', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO'], 'category': 'Lazer'},
        {'keywords': ['ENEL', 'SABESP', 'CONDOMINIO', 'ALUGUEL', 'CPFL', 'LIGHT', 'SANEPAR', 'COPEL', 'CEG'], 'category': 'Moradia'},
        {'keywords': ['SALARIO', 'PAGAMENTO', 'ADIANTAMENTO', 'REMUNERACAO', 'PROVENTOS', 'HOLERITE'], 'category': 'Salário'},
        {'keywords': ['PIX ENVIADO', 'TED ENVIADA', 'DOC ENVIADO', 'TRANSF ENVIADA', 'PAGAMENTO DE BOLETO', 'PAGTO ELETRONICO', 'PAG TITULO'], 'category': 'Pagamentos'},
        {'keywords': ['PIX RECEBIDO', 'TED RECEBIDA', 'DOC RECEBIDO', 'TRANSF RECEBIDA'], 'category': 'Recebimentos'},
        {'keywords': ['TARIFA', 'ANUIDADE', 'JUROS', 'IOF', 'MENSALIDADE', 'MANUTENCAO', 'TAXA'], 'category': 'Serviços Bancários'},
        {'keywords': ['POSTO', 'IPIRANGA', 'SHELL', 'PETROBRAS', 'COMBUSTIVEL', 'AUTO POSTO'], 'category': 'Transporte'},
        {'keywords': ['SHOPEE', 'MERCADO LIVRE', 'AMAZON', 'ALIEXPRESS', 'SHEIN', 'MAGALU', 'AMERICANAS', 'CASAS BAHIA'], 'category': 'Compras'},
        {'keywords': ['SMART FIT', 'ACADEMIA', 'GYMPASS'], 'category': 'Saúde'}
    ]

    # Limpeza de prefixos comuns e caracteres inúteis
    clean_name = re.sub(r'(?i)COMPRA CARTAO - ', '', clean_name)
    clean_name = re.sub(r'(?i)COMPRA NO CARTAO ', '', clean_name)
    clean_name = re.sub(r'(?i)PAGTO ELETRONICO ', '', clean_name)
    clean_name = re.sub(r'(?i)PAGAMENTO DE TITULO ', '', clean_name)
    clean_name = re.sub(r'(?i)PIX TRANSF ', 'PIX ', clean_name)
    clean_name = re.sub(r'[\d-]', ' ', clean_name) # Remove números e traços
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()

    # Encontra a categoria baseada nas palavras-chave
    for rule in rules:
        if any(kw in text for kw in rule['keywords']):
            category = rule['category']
            break

    # Formata para Title Case (Ex: "Uber Do Brasil" -> "Uber Do Brasil")
    clean_name = clean_name.title()

    if not clean_name or len(clean_name) < 2:
        clean_name = 'Entrada de Recursos' if amount > 0 else 'Despesa'

    if category == 'Outros' and amount > 0:
        category = 'Recebimentos'

    return clean_name, category

def extract_tag(text, tag):
    match = re.search(f'<{tag}>([^<\\r\\n]+)', text, re.IGNORECASE)
    return match.group(1).strip() if match else None

def parse_ofx(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        ofx_string = f.read()

    data = {
        'currency': extract_tag(ofx_string, 'CURDEF') or 'BRL',
        'bankId': extract_tag(ofx_string, 'BANKID'),
        'accountId': extract_tag(ofx_string, 'ACCTID'),
        'transactions': []
    }

    # Tenta encontrar blocos STMTTRN com tag de fechamento
    stmt_trn_regex = r'<STMTTRN>([\s\S]*?)</STMTTRN>'
    matches = re.findall(stmt_trn_regex, ofx_string, re.IGNORECASE)

    # Se não encontrar, tenta regex mais flexível (alguns OFX omitem o fechamento)
    if not matches:
        stmt_trn_regex = r'<STMTTRN>([\s\S]*?)(?=<STMTTRN>|</BANKTRANLIST>)'
        matches = re.findall(stmt_trn_regex, ofx_string, re.IGNORECASE)

    for trn_block in matches:
        amount_str = extract_tag(trn_block, 'TRNAMT')
        if not amount_str:
            continue
            
        amount = float(amount_str)
        raw_date = extract_tag(trn_block, 'DTPOSTED') or ''
        formatted_date = raw_date
        if len(raw_date) >= 8:
            formatted_date = f"{raw_date[0:4]}-{raw_date[4:6]}-{raw_date[6:8]}"

        raw_desc = extract_tag(trn_block, 'NAME') or ''
        raw_memo = extract_tag(trn_block, 'MEMO') or ''
        combined_text = f"{raw_desc} {raw_memo}".strip()

        clean_name, category = clean_and_categorize(combined_text, amount)

        data['transactions'].append({
            'id': extract_tag(trn_block, 'FITID'),
            'type': extract_tag(trn_block, 'TRNTYPE') or 'OTHER',
            'date': formatted_date,
            'amount': amount,
            'description': raw_desc,
            'memo': raw_memo,
            'flow': 'INFLOW' if amount >= 0 else 'OUTFLOW',
            'category': category,
            'cleanName': clean_name
        })

    data['transactions'].sort(key=lambda x: x['date'], reverse=True)
    return data

if __name__ == "__main__":
    # Exemplo de uso:
    # result = parse_ofx("caminho/para/seu/extrato.ofx")
    # print(json.dumps(result, indent=2, ensure_ascii=False))
    print("Script de parser OFX em Python pronto para uso!")
