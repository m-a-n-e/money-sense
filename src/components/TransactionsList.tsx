import React, { useState, useMemo } from 'react';
import { OFXData } from '../lib/ofxParser';
import { ArrowDownRight, ArrowUpRight, Search, Filter } from 'lucide-react';
import { getCategoryColor } from '../lib/categoryColors';

interface TransactionsListProps {
  appData: OFXData | null;
}

export default function TransactionsList({ appData }: TransactionsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const transactions = appData?.transactions || [];
  const currency = appData?.currency || 'BRL';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val);
  };

  // Dynamic filter options
  const categories = useMemo(() => {
    const cats = new Set(transactions.map(tx => tx.category || 'Outros'));
    return Array.from(cats).sort();
  }, [transactions]);

  const months = useMemo(() => {
    const mths = new Set(transactions.map(tx => {
      return tx.date.substring(0, 7); // tx.date is YYYY-MM-DD, so this gets YYYY-MM safely
    }));
    return Array.from(mths).sort().reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.cleanName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.memo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || (tx.category || 'Outros') === selectedCategory;
      const matchesType = selectedType === 'all' || tx.flow === selectedType;
      
      const txMonth = tx.date.substring(0, 7);
      const matchesMonth = selectedMonth === 'all' || txMonth === selectedMonth;

      return matchesSearch && matchesCategory && matchesType && matchesMonth;
    });
  }, [transactions, searchTerm, selectedCategory, selectedType, selectedMonth]);

  if (transactions.length === 0) {
    return (
      <div className="w-full p-4 md:p-8 z-10 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-white/50">Nenhuma transação importada ainda.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-8 z-10">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-1 md:mb-2">Transações</h2>
              <p className="text-white/50 text-sm md:text-base">Histórico completo de movimentações.</p>
            </div>
          </div>
        </header>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-xl rounded-3xl p-5 md:p-6 flex flex-col gap-6">
          
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="Buscar transação..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-100/50 transition-colors w-full"
              />
            </div>
            
            <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2 sm:pb-0 no-scrollbar w-full">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-100/50 transition-colors text-white/70 appearance-none min-w-[110px]"
              >
                <option value="all" className="bg-zinc-900">Todos os Meses</option>
                {months.map(m => {
                  const [year, month] = m.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1, 15);
                  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  return <option key={m} value={m} className="bg-zinc-900">{label.charAt(0).toUpperCase() + label.slice(1)}</option>
                })}
              </select>

              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-100/50 transition-colors text-white/70 appearance-none min-w-[110px]"
              >
                <option value="all" className="bg-zinc-900">Categorias</option>
                {categories.map(cat => (
                  <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                ))}
              </select>

              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-100/50 transition-colors text-white/70 appearance-none min-w-[110px]"
              >
                <option value="all" className="bg-zinc-900">Tipo</option>
                <option value="INFLOW" className="bg-zinc-900">Entradas</option>
                <option value="OUTFLOW" className="bg-zinc-900">Saídas</option>
              </select>
            </div>
          </div>

          <div className="overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-sm">
                  <th className="pb-3 font-medium w-10"></th>
                  <th className="pb-3 font-medium px-2">Data</th>
                  <th className="pb-3 font-medium px-2">Descrição Original</th>
                  <th className="pb-3 font-medium px-2">Estabelecimento (IA)</th>
                  <th className="pb-3 font-medium px-2">Método</th>
                  <th className="pb-3 font-medium px-2">Categoria (IA)</th>
                  <th className="pb-3 font-medium px-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="text-sm md:text-base">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-3 px-2">
                        <div className={`p-1.5 md:p-2 rounded-lg inline-flex ${tx.flow === 'INFLOW' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {tx.flow === 'INFLOW' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-white/70 whitespace-nowrap">{tx.date}</td>
                      <td className="py-3 px-2 text-white/50 text-xs truncate max-w-[150px]" title={tx.memo}>
                        {tx.memo}
                      </td>
                      <td className="py-3 px-2 font-medium text-white/90 truncate max-w-[200px]" title={tx.cleanName}>
                        {tx.cleanName || '---'}
                      </td>
                      <td className="py-3 px-2 text-white/70">
                        <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-xs whitespace-nowrap">
                          {tx.paymentMethod || 'Outros'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-white/70">
                        <span className={`px-2.5 py-1 rounded-md border text-xs whitespace-nowrap ${getCategoryColor(tx.category || 'Outros')}`}>
                          {tx.category || 'Pendente'}
                        </span>
                      </td>
                      <td className={`py-3 px-2 text-right font-medium whitespace-nowrap ${tx.flow === 'INFLOW' ? 'text-emerald-300' : 'text-white/90'}`}>
                        {tx.flow === 'INFLOW' ? '+' : ''}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-white/30">
                      Nenhuma transação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
