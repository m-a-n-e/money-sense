export const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': 'bg-orange-500/20 text-orange-300 border-orange-500/20',
  'Transporte': 'bg-blue-500/20 text-blue-300 border-blue-500/20',
  'Moradia': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
  'Saúde': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
  'Lazer': 'bg-purple-500/20 text-purple-300 border-purple-500/20',
  'Educação': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20',
  'Serviços': 'bg-slate-500/20 text-slate-300 border-slate-500/20',
  'Compras': 'bg-pink-500/20 text-pink-300 border-pink-500/20',
  'Investimentos': 'bg-teal-500/20 text-teal-300 border-teal-500/20',
  'Salário': 'bg-green-500/20 text-green-300 border-green-500/20',
  'Transferência': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20',
  'Petshop': 'bg-rose-500/20 text-rose-300 border-rose-500/20',
  'Recebimentos': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
  'Pagamentos': 'bg-red-500/20 text-red-300 border-red-500/20',
  'Outros': 'bg-white/10 text-white/70 border-white/10',
};

export const CATEGORY_HEX_COLORS: Record<string, string> = {
  'Alimentação': '#f97316',
  'Transporte': '#3b82f6',
  'Moradia': '#6366f1',
  'Saúde': '#10b981',
  'Lazer': '#a855f7',
  'Educação': '#eab308',
  'Serviços': '#64748b',
  'Compras': '#ec4899',
  'Investimentos': '#14b8a6',
  'Salário': '#22c55e',
  'Transferência': '#06b6d4',
  'Petshop': '#f43f5e',
  'Recebimentos': '#10b981',
  'Pagamentos': '#ef4444',
  'Outros': '#9ca3af',
};

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Outros'];
}

export function getCategoryHexColor(category: string) {
  return CATEGORY_HEX_COLORS[category] || CATEGORY_HEX_COLORS['Outros'];
}
