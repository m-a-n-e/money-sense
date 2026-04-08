export const CATEGORY_COLORS: Record<string, string> = {
  'Mercado': 'bg-orange-500/20 text-orange-300 border-orange-500/20',
  'Restaurante/Delivery': 'bg-amber-500/20 text-amber-300 border-amber-500/20',
  'Combustível': 'bg-blue-600/20 text-blue-400 border-blue-600/20',
  'Transporte App': 'bg-blue-400/20 text-blue-300 border-blue-400/20',
  'Transporte Público': 'bg-sky-500/20 text-sky-300 border-sky-500/20',
  'Contas Residenciais': 'bg-indigo-400/20 text-indigo-300 border-indigo-400/20',
  'Aluguel/Condomínio': 'bg-indigo-600/20 text-indigo-400 border-indigo-600/20',
  'Farmácia': 'bg-emerald-400/20 text-emerald-300 border-emerald-400/20',
  'Saúde/Consultas': 'bg-emerald-600/20 text-emerald-400 border-emerald-600/20',
  'Assinaturas/Streaming': 'bg-purple-400/20 text-purple-300 border-purple-400/20',
  'Lazer/Eventos': 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/20',
  'Educação': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20',
  'Serviços de Software': 'bg-slate-400/20 text-slate-300 border-slate-400/20',
  'Taxas Bancárias': 'bg-slate-600/20 text-slate-400 border-slate-600/20',
  'Vestuário': 'bg-pink-400/20 text-pink-300 border-pink-400/20',
  'Eletrônicos': 'bg-pink-600/20 text-pink-400 border-pink-600/20',
  'Casa/Móveis': 'bg-rose-400/20 text-rose-300 border-rose-400/20',
  'Investimentos': 'bg-teal-500/20 text-teal-300 border-teal-500/20',
  'Salário': 'bg-green-500/20 text-green-300 border-green-500/20',
  'Transferência Enviada': 'bg-cyan-600/20 text-cyan-400 border-cyan-600/20',
  'Transferência Recebida': 'bg-cyan-400/20 text-cyan-300 border-cyan-400/20',
  'Petshop': 'bg-red-400/20 text-red-300 border-red-400/20',
  'Impostos': 'bg-red-600/20 text-red-400 border-red-600/20',
  'Fatura': 'bg-blue-900/20 text-blue-200 border-blue-900/20',
  'Cuidados Pessoais': 'bg-violet-500/20 text-violet-300 border-violet-500/20',
  'Doações': 'bg-lime-500/20 text-lime-300 border-lime-500/20',
  'Outros': 'bg-white/10 text-white/70 border-white/10',
};

export const CATEGORY_HEX_COLORS: Record<string, string> = {
  'Mercado': '#f97316',
  'Restaurante/Delivery': '#f59e0b',
  'Combustível': '#2563eb',
  'Transporte App': '#60a5fa',
  'Transporte Público': '#0ea5e9',
  'Contas Residenciais': '#818cf8',
  'Aluguel/Condomínio': '#4f46e5',
  'Farmácia': '#34d399',
  'Saúde/Consultas': '#059669',
  'Assinaturas/Streaming': '#c084fc',
  'Lazer/Eventos': '#d946ef',
  'Educação': '#eab308',
  'Serviços de Software': '#94a3b8',
  'Taxas Bancárias': '#475569',
  'Vestuário': '#f472b6',
  'Eletrônicos': '#db2777',
  'Casa/Móveis': '#fb7185',
  'Investimentos': '#14b8a6',
  'Salário': '#22c55e',
  'Transferência Enviada': '#0891b2',
  'Transferência Recebida': '#22d3ee',
  'Petshop': '#f87171',
  'Impostos': '#dc2626',
  'Fatura': '#1e3a8a',
  'Cuidados Pessoais': '#8b5cf6',
  'Doações': '#84cc16',
  'Outros': '#9ca3af',
};

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Outros'];
}

export function getCategoryHexColor(category: string) {
  return CATEGORY_HEX_COLORS[category] || CATEGORY_HEX_COLORS['Outros'];
}
