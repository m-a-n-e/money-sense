import React, { useMemo, useState, useCallback, useRef } from 'react';
import { OFXData } from '../lib/parsers';
import { ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown, DollarSign, UploadCloud, X, FileText, LayoutDashboard, ListOrdered, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { getCategoryColor, getCategoryHexColor } from '../lib/categoryColors';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Mercado': 'Gastos com supermercados, atacarejos, hortifruti e açougues.',
  'Restaurante/Delivery': 'Gastos com restaurantes, padarias, pizzarias e aplicativos de delivery (iFood, Rappi).',
  'Combustível': 'Gastos com postos de gasolina e combustíveis.',
  'Transporte App': 'Corridas em aplicativos como Uber, 99, Cabify e inDrive.',
  'Transporte Público': 'Passagens de ônibus, metrô, trem e recargas de bilhete único.',
  'Contas Residenciais': 'Contas de água, luz, gás, internet e telefone fixo.',
  'Aluguel/Condomínio': 'Pagamento de aluguel e taxas condominiais.',
  'Farmácia': 'Gastos em farmácias e drogarias.',
  'Saúde/Consultas': 'Consultas médicas, exames, dentista e planos de saúde.',
  'Assinaturas/Streaming': 'Netflix, Spotify, Amazon Prime, HBO, Disney+ e outras assinaturas.',
  'Lazer/Eventos': 'Cinema, shows, teatro, ingressos e viagens.',
  'Educação': 'Mensalidades escolares, faculdade, cursos online e materiais didáticos.',
  'Serviços de Software': 'Assinaturas de softwares, serviços em nuvem (AWS, Google) e telefonia móvel.',
  'Taxas Bancárias': 'Tarifas de manutenção, anuidades de cartão, juros e IOF.',
  'Vestuário': 'Roupas, calçados e acessórios.',
  'Eletrônicos': 'Smartphones, computadores, videogames e gadgets.',
  'Casa/Móveis': 'Móveis, decoração, eletrodomésticos e utensílios para o lar.',
  'Investimentos': 'Aportes em corretoras, CDB, Tesouro Direto, ações e criptomoedas.',
  'Salário': 'Recebimentos de salário, adiantamentos, férias e rescisão.',
  'Transferência Enviada': 'Envio de valores via PIX, TED ou DOC para outras contas.',
  'Transferência Recebida': 'Recebimento de valores via PIX, TED ou DOC.',
  'Petshop': 'Gastos com animais de estimação, veterinário, ração e banho.',
  'Impostos': 'Pagamento de IPVA, IPTU, Imposto de Renda e outras taxas governamentais.',
  'Cuidados Pessoais': 'Salão de beleza, barbearia, estética e cosméticos.',
  'Doações': 'Doações para ONGs, instituições de caridade e campanhas.',
  'Outros': 'Despesas ou receitas que não se encaixam nas demais categorias.'
};

interface DashboardProps {
  appData: OFXData | null;
  onProcessFile: (file: File) => void;
  onOpenImportModal: () => void;
  subView?: string;
}

const COLORS = ['#cffafe', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#60a5fa', '#f472b6', '#94a3b8'];

export default function Dashboard({ appData, onProcessFile, onOpenImportModal }: DashboardProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const transactions = appData?.transactions || [];
  const balance = appData?.balance || 0;
  const currency = appData?.currency || 'BRL';

  const { income, expense, categoryData, monthlyData } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catMap: Record<string, number> = {};
    const monthMap: Record<string, { income: number, expense: number, balance: number }> = {};

    transactions.forEach(tx => {
      const month = tx.date.substring(0, 7); // YYYY-MM
      if (!monthMap[month]) {
        monthMap[month] = { income: 0, expense: 0, balance: 0 };
      }

      if (tx.flow === 'INFLOW') {
        inc += tx.amount;
        monthMap[month].income += tx.amount;
        monthMap[month].balance += tx.amount;
      } else {
        exp += Math.abs(tx.amount);
        monthMap[month].expense += Math.abs(tx.amount);
        monthMap[month].balance -= Math.abs(tx.amount);
        const cat = tx.category || 'Outros';
        catMap[cat] = (catMap[cat] || 0) + Math.abs(tx.amount);
      }
    });

    const catData = Object.keys(catMap).map(key => ({
      name: key,
      value: catMap[key]
    })).sort((a, b) => b.value - a.value);

    const mData = Object.keys(monthMap).sort().map(month => {
      const [year, m] = month.split('-');
      const date = new Date(parseInt(year), parseInt(m) - 1, 15);
      const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      return {
        month,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        Receitas: monthMap[month].income,
        Despesas: monthMap[month].expense,
        Saldo: monthMap[month].balance
      };
    });

    return { income: inc, expense: exp, categoryData: catData, monthlyData: mData };
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val);
  };

  const isEmpty = transactions.length === 0;

  return (
    <div className="w-full px-4 py-6 md:p-8 z-10">
      <div className="w-full max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-cyan-100/10 text-cyan-100 rounded-2xl border border-cyan-100/20 shrink-0">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-1 truncate">Dashboard</h2>
              <p className="text-white/50 text-sm truncate">Acompanhe suas finanças categorizadas automaticamente.</p>
            </div>
          </div>
          <button 
            onClick={() => onOpenImportModal()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-cyan-50 border border-white/10 rounded-xl transition-all font-medium text-sm md:text-base shadow-xl"
          >
            <UploadCloud className="w-4 h-4 md:w-5 md:h-5" />
            Importar extrato
          </button>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-zinc-900 border border-white/10 shadow-xl rounded-2xl md:rounded-3xl p-5 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 md:p-6 opacity-20 text-cyan-100">
              <DollarSign className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            <p className="text-white/50 font-medium mb-1 md:mb-2 text-sm md:text-base">Saldo Atual</p>
            <h3 className="text-2xl md:text-3xl font-semibold text-cyan-50">{formatCurrency(balance)}</h3>
          </div>
          
          <div className="bg-zinc-900 border border-white/10 shadow-xl rounded-3xl p-5 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 md:p-6 opacity-20 text-emerald-400">
              <TrendingUp className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            <p className="text-white/50 font-medium mb-1 md:mb-2 text-sm md:text-base">Entradas</p>
            <h3 className="text-2xl md:text-3xl font-semibold text-emerald-300">{formatCurrency(income)}</h3>
          </div>

          <div className="bg-zinc-900 border border-white/10 shadow-xl rounded-2xl md:rounded-3xl p-5 md:p-6 relative overflow-hidden sm:col-span-2 md:col-span-1">
            <div className="absolute top-0 right-0 p-4 md:p-6 opacity-20 text-rose-400">
              <TrendingDown className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            <p className="text-white/50 font-medium mb-1 md:mb-2 text-sm md:text-base">Saídas</p>
            <h3 className="text-2xl md:text-3xl font-semibold text-rose-300">{formatCurrency(expense)}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Chart */}
          <div className="lg:col-span-1 bg-zinc-900 border border-white/10 shadow-xl rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <PieChartIcon className="w-5 h-5 text-cyan-100" />
              <h3 className="text-base md:text-lg font-medium text-cyan-50">Despesas por Categoria</h3>
            </div>
            <div className="flex flex-col gap-8">
              <div className="h-[250px] relative">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryHexColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 text-sm">
                    <div className="w-32 h-32 rounded-full border-4 border-white/5 border-dashed mb-4" />
                    <p>Sem dados para exibir</p>
                  </div>
                )}
              </div>
              {categoryData.length > 0 && (
                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                  {categoryData.map((cat, idx) => (
                    <div 
                      key={cat.name} 
                      className="flex flex-col cursor-pointer group"
                      onMouseEnter={() => setActiveCategory(cat.name)}
                      onMouseLeave={() => setActiveCategory(null)}
                      onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
                    >
                      <div className="flex items-center justify-between text-xs md:text-sm p-2 rounded-xl hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: getCategoryHexColor(cat.name) }} />
                          <span className="text-white/70 truncate max-w-[100px] md:max-w-[120px] group-hover:text-cyan-50 transition-colors">{cat.name}</span>
                        </div>
                        <span className="font-medium group-hover:text-cyan-50 transition-colors">{formatCurrency(cat.value)}</span>
                      </div>
                      
                      <AnimatePresence>
                        {activeCategory === cat.name && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 mb-2 mx-2 p-3 bg-zinc-800 border border-white/10 shadow-xl rounded-xl">
                              <p className="text-xs text-white/70 leading-relaxed">
                                {CATEGORY_DESCRIPTIONS[cat.name] || 'Despesas ou receitas associadas a esta categoria.'}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="lg:col-span-2 bg-zinc-900 border border-white/10 shadow-xl rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col h-[400px] md:h-[500px]">
            <div className="flex items-center gap-3 mb-6">
              <ListOrdered className="w-5 h-5 text-cyan-100" />
              <h3 className="text-base md:text-lg font-medium text-cyan-50">Transações Recentes</h3>
            </div>
            <div className="overflow-x-auto custom-scrollbar flex-1 relative w-full">
              {isEmpty ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
                  <UploadCloud className="w-12 h-12 mb-4 opacity-50" />
                  <p>Importe seu extrato bancário para começar a analisar suas finanças.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 text-sm">
                      <th className="pb-3 font-medium w-10"></th>
                      <th className="pb-3 font-medium px-2">Data</th>
                      <th className="pb-3 font-medium px-2">Estabelecimento</th>
                      <th className="pb-3 font-medium px-2">Método</th>
                      <th className="pb-3 font-medium px-2">Categoria</th>
                      <th className="pb-3 font-medium px-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm md:text-base">
                    {transactions.slice(0, 50).map((tx) => (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-zinc-800/50 transition-colors group">
                        <td className="py-3 px-2">
                          <div className={`p-1.5 md:p-2 rounded-lg inline-flex ${tx.flow === 'INFLOW' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {tx.flow === 'INFLOW' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-white/70 whitespace-nowrap">{tx.date}</td>
                        <td className="py-3 px-2 font-medium text-white/90 truncate max-w-[200px]" title={tx.cleanName || tx.description}>
                          {tx.cleanName || tx.description || 'Desconhecido'}
                        </td>
                        <td className="py-3 px-2 text-white/70">
                          <span className="px-2.5 py-1 rounded-md bg-zinc-800 border border-white/5 text-xs whitespace-nowrap">
                            {tx.paymentMethod || 'Outros'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-white/70">
                          <span className={`px-2.5 py-1 rounded-md border text-xs whitespace-nowrap ${getCategoryColor(tx.category || 'Outros')}`}>
                            {tx.category || 'Outros'}
                          </span>
                        </td>
                        <td className={`py-3 px-2 text-right font-medium whitespace-nowrap ${tx.flow === 'INFLOW' ? 'text-emerald-300' : 'text-white/90'}`}>
                          {tx.flow === 'INFLOW' ? '+' : ''}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Resumo Mensal */}
        {monthlyData.length > 0 && (
          <div className="bg-zinc-900 border border-white/10 shadow-xl rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-cyan-100" />
              <h3 className="text-base md:text-lg font-medium text-cyan-50">Resumo Mensal</h3>
            </div>
            <div className="w-full h-[300px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`} 
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }} />
                  <Bar dataKey="Receitas" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saldo" fill="#cffafe" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
