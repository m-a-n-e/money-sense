import React, { useState, useMemo, useEffect } from 'react';
import { OFXData } from '../lib/parsers';
import { ArrowDownRight, ArrowUpRight, Search, Filter, ChevronDown, Trash2, AlertTriangle, ListOrdered, X } from 'lucide-react';
import { getCategoryColor, CATEGORY_COLORS } from '../lib/categoryColors';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionsListProps {
  appData: OFXData | null;
  onUpdateCategory: (id: string, newCategory: string) => void;
  onDeleteTransactions: (ids: string[]) => void;
}

export default function TransactionsList({ appData, onUpdateCategory, onDeleteTransactions }: TransactionsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [openFilter, setOpenFilter] = useState<'month' | 'category' | 'type' | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  const months = useMemo<string[]>(() => {
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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, selectedCategory, selectedType, selectedMonth]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, filterName: string) => {
    setter(value);
    toast.success(`Filtro de ${filterName} aplicado`);
  };

  const isAllSelected = filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      setLastSelectedId(null);
    } else {
      const allIds = filteredTransactions.map(tx => tx.id);
      setSelectedIds(new Set(allIds));
      setLastSelectedId(allIds[allIds.length - 1]);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
      if (lastSelectedId === id) {
        setLastSelectedId(newSet.size > 0 ? Array.from(newSet)[newSet.size - 1] : null);
      }
    } else {
      newSet.add(id);
      setLastSelectedId(id);
    }
    setSelectedIds(newSet);
  };

  const confirmDelete = () => {
    onDeleteTransactions(Array.from(selectedIds));
    setIsDeleteModalOpen(false);
    setSelectedIds(new Set());
  };

  const allCategories = Object.keys(CATEGORY_COLORS).sort();

  if (transactions.length === 0) {
    return (
      <div className="w-full p-4 md:p-8 z-10 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-white/50">Nenhuma transação importada ainda.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 md:p-8 z-10">
      <div className="w-full max-w-6xl mx-auto space-y-6 md:space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-cyan-100/10 text-cyan-100 rounded-2xl border border-cyan-100/20 shrink-0">
              <ListOrdered className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-1 truncate">Transações</h2>
              <p className="text-white/50 text-sm truncate">Histórico completo de movimentações.</p>
            </div>
          </div>
          <div className="flex items-center justify-end">
            {/* Empty div to maintain header layout if needed, but the button is now floating */}
          </div>
        </header>

        <div className="bg-zinc-900 border border-white/10 shadow-xl rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-6 w-full min-w-0">
          
          <div className="flex flex-col gap-4 w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="Buscar transação..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-100/50 transition-colors w-full"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {/* Month Filter */}
              <div className="relative w-full">
                <button 
                  onClick={() => setOpenFilter(openFilter === 'month' ? null : 'month')}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-100/50 transition-colors text-white/70 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedMonth === 'all' ? 'Todos os Meses' : (() => {
                      const [year, month] = selectedMonth.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, 15);
                      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      return label.charAt(0).toUpperCase() + label.slice(1);
                    })()}
                  </span>
                  <ChevronDown className={`w-3 h-3 opacity-50 shrink-0 ml-2 transition-transform ${openFilter === 'month' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFilter === 'month' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 mt-1 w-full min-w-[180px] max-h-[250px] overflow-y-auto bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1.5 custom-scrollbar flex flex-col gap-1"
                      >
                        <button
                          onClick={() => { handleFilterChange(setSelectedMonth, 'all', 'Mês'); setOpenFilter(null); }}
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedMonth === 'all' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-zinc-800 border-white/5 text-white/70 hover:text-white'}`}
                        >
                          Todos os Meses
                        </button>
                        {months.map(m => {
                          const [year, month] = m.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, 15);
                          const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                          const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                          return (
                            <button
                              key={m}
                              onClick={() => { handleFilterChange(setSelectedMonth, m, 'Mês'); setOpenFilter(null); }}
                              className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedMonth === m ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-zinc-800 border-white/5 text-white/70 hover:text-white'}`}
                            >
                              {formattedLabel}
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Category Filter */}
              <div className="relative w-full">
                <button 
                  onClick={() => {
                    setOpenFilter(openFilter === 'category' ? null : 'category');
                    setCategorySearch('');
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-cyan-100/50 transition-colors flex items-center justify-between ${selectedCategory === 'all' ? 'bg-zinc-800 border-white/10 text-white/70' : getCategoryColor(selectedCategory)}`}
                >
                  <span className="truncate">{selectedCategory === 'all' ? 'Categorias' : selectedCategory}</span>
                  <ChevronDown className={`w-3 h-3 opacity-50 shrink-0 ml-2 transition-transform ${openFilter === 'category' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFilter === 'category' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 mt-1 w-full min-w-[220px] max-h-[300px] overflow-hidden bg-zinc-900 border border-white/10 rounded-xl shadow-2xl flex flex-col"
                      >
                        <div className="p-2 border-b border-white/5 shrink-0">
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Buscar categoria..."
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-md py-1.5 pl-7 pr-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-100/50 transition-colors"
                            />
                          </div>
                        </div>
                        <div className="p-1.5 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                          <button
                            onClick={() => { handleFilterChange(setSelectedCategory, 'all', 'Categoria'); setOpenFilter(null); }}
                            className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedCategory === 'all' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-zinc-800 border-white/5 text-white/70 hover:text-white'}`}
                          >
                            Todas as Categorias
                          </button>
                          {categories
                            .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                            .map(cat => (
                            <button
                              key={cat}
                              onClick={() => { handleFilterChange(setSelectedCategory, cat, 'Categoria'); setOpenFilter(null); }}
                              className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${getCategoryColor(cat)}`}
                            >
                              {cat}
                            </button>
                          ))}
                          {categories.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                            <div className="text-center py-4 text-white/40 text-xs">
                              Nenhuma categoria encontrada
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Type Filter */}
              <div className="relative w-full">
                <button 
                  onClick={() => setOpenFilter(openFilter === 'type' ? null : 'type')}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-100/50 transition-colors text-white/70 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedType === 'all' ? 'Tipo' : selectedType === 'INFLOW' ? 'Entradas' : 'Saídas'}
                  </span>
                  <ChevronDown className={`w-3 h-3 opacity-50 shrink-0 ml-2 transition-transform ${openFilter === 'type' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFilter === 'type' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 mt-1 w-full min-w-[150px] overflow-hidden bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1"
                      >
                        <button
                          onClick={() => { handleFilterChange(setSelectedType, 'all', 'Tipo'); setOpenFilter(null); }}
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedType === 'all' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-zinc-800 border-white/5 text-white/70 hover:text-white'}`}
                        >
                          Todos os Tipos
                        </button>
                        <button
                          onClick={() => { handleFilterChange(setSelectedType, 'INFLOW', 'Tipo'); setOpenFilter(null); }}
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedType === 'INFLOW' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-zinc-800 border-white/5 text-white/70 hover:text-white'}`}
                        >
                          Entradas
                        </button>
                        <button
                          onClick={() => { handleFilterChange(setSelectedType, 'OUTFLOW', 'Tipo'); setOpenFilter(null); }}
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedType === 'OUTFLOW' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-zinc-800 border-white/5 text-white/70 hover:text-white'}`}
                        >
                          Saídas
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar w-full">
            {/* Desktop Table View */}
            <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px] hidden md:table">
              <thead>
                <tr className="text-white/50 text-sm">
                  <th className="pb-3 font-medium w-10 px-2 border-b border-white/10">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="cyberpunk-checkbox"
                    />
                  </th>
                  <th className="pb-3 font-medium w-10 border-b border-white/10"></th>
                  <th className="pb-3 font-medium px-2 border-b border-white/10">Data</th>
                  <th className="pb-3 font-medium px-2 border-b border-white/10">Descrição Original</th>
                  <th className="pb-3 font-medium px-2 border-b border-white/10">Estabelecimento</th>
                  <th className="pb-3 font-medium px-2 border-b border-white/10">Método</th>
                  <th className="pb-3 font-medium px-2 border-b border-white/10">Categoria</th>
                  <th className="pb-3 font-medium px-2 text-right border-b border-white/10">Valor</th>
                </tr>
              </thead>
              <tbody className="text-sm md:text-base">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx, index) => {
                    const isSelected = selectedIds.has(tx.id);
                    const prevSelected = index > 0 && selectedIds.has(filteredTransactions[index - 1].id);
                    const nextSelected = index < filteredTransactions.length - 1 && selectedIds.has(filteredTransactions[index + 1].id);
                    
                    const rowBgClass = isSelected ? 'bg-cyan-100/10' : 'group-hover:bg-zinc-800/50';
                    const rowBorderColor = (isSelected && nextSelected) ? 'border-cyan-100/10' : 'border-white/5';
                    const cellBase = `py-3 px-2 transition-all duration-300 ${rowBgClass} border-b ${rowBorderColor}`;

                    return (
                      <tr 
                        key={tx.id} 
                        className="group transition-all duration-300"
                      >
                        <td className={`${cellBase} relative ${isSelected ? (
                          !prevSelected ? 'rounded-tl-2xl' : ''
                        ) : 'group-hover:rounded-tl-2xl'} ${isSelected ? (
                          !nextSelected ? 'rounded-bl-2xl' : ''
                        ) : 'group-hover:rounded-bl-2xl'}`}>
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleSelection(tx.id)}
                              className="cyberpunk-checkbox"
                            />
                            <AnimatePresence>
                              {lastSelectedId === tx.id && selectedIds.size > 0 && (
                                <motion.button
                                  initial={{ opacity: 0, scale: 0.5, x: -10 }}
                                  animate={{ opacity: 1, scale: 1, x: 0 }}
                                  exit={{ opacity: 0, scale: 0.5, x: -10 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="absolute left-full ml-2 p-2 bg-rose-500 text-white rounded-full shadow-lg shadow-rose-500/40 hover:bg-rose-600 transition-all z-50 flex items-center gap-2 group/btn"
                                  title="Excluir selecionados"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {selectedIds.size > 1 && (
                                    <span className="text-[10px] font-bold pr-1">
                                      {selectedIds.size}
                                    </span>
                                  )}
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                        <td className={cellBase}>
                          <div className={`p-1.5 md:p-2 rounded-lg inline-flex ${tx.flow === 'INFLOW' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {tx.flow === 'INFLOW' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                        </td>
                        <td className={`${cellBase} text-white/70 whitespace-nowrap`}>{tx.date}</td>
                        <td className={`${cellBase} text-white/50 text-xs truncate max-w-[150px]`} title={tx.memo}>
                          {tx.memo}
                        </td>
                        <td className={`${cellBase} font-medium text-white/90 truncate max-w-[200px]`} title={tx.cleanName}>
                          {tx.cleanName || '---'}
                        </td>
                        <td className={cellBase}>
                          <span className="px-2.5 py-1 rounded-md bg-zinc-800 border border-white/5 text-xs whitespace-nowrap">
                            {tx.paymentMethod || 'Outros'}
                          </span>
                        </td>
                        <td className={`${cellBase} text-white/70 relative`}>
                          <div className="relative w-[180px]">
                            <button 
                              onClick={() => {
                                if (editingCategoryId === tx.id) {
                                  setEditingCategoryId(null);
                                } else {
                                  setEditingCategoryId(tx.id);
                                  setCategorySearch('');
                                }
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-md border text-xs whitespace-nowrap flex items-center justify-between hover:opacity-80 transition-opacity cursor-pointer ${getCategoryColor(tx.category || 'Outros')}`}
                              title="Clique para corrigir a categoria"
                            >
                              <span className="truncate">{tx.category || 'Pendente'}</span>
                              <ChevronDown className="w-3 h-3 opacity-50 shrink-0 ml-2" />
                            </button>

                            <AnimatePresence>
                              {editingCategoryId === tx.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setEditingCategoryId(null)} />
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute z-50 top-full left-0 mt-1 w-[220px] max-h-[300px] overflow-hidden bg-zinc-900 border border-white/10 rounded-xl shadow-2xl flex flex-col"
                                  >
                                    <div className="p-2 border-b border-white/5 shrink-0">
                                      <div className="relative">
                                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                          type="text"
                                          autoFocus
                                          placeholder="Buscar categoria..."
                                          value={categorySearch}
                                          onChange={(e) => setCategorySearch(e.target.value)}
                                          className="w-full bg-black/20 border border-white/10 rounded-md py-1.5 pl-7 pr-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-100/50 transition-colors"
                                        />
                                      </div>
                                    </div>
                                    <div className="p-1.5 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                      {allCategories
                                        .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                                        .map(cat => (
                                        <button
                                          key={cat}
                                          onClick={() => {
                                            onUpdateCategory(tx.id, cat);
                                            setEditingCategoryId(null);
                                          }}
                                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${getCategoryColor(cat)}`}
                                        >
                                          {cat}
                                        </button>
                                      ))}
                                      {allCategories.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                                        <div className="text-center py-4 text-white/40 text-xs">
                                          Nenhuma categoria encontrada
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                        <td className={`${cellBase} text-right font-medium whitespace-nowrap ${tx.flow === 'INFLOW' ? 'text-emerald-300' : 'text-white/90'} ${isSelected ? (
                          !prevSelected ? 'rounded-tr-2xl' : ''
                        ) : 'group-hover:rounded-tr-2xl'} ${isSelected ? (
                          !nextSelected ? 'rounded-br-2xl' : ''
                        ) : 'group-hover:rounded-br-2xl'}`}>
                          {tx.flow === 'INFLOW' ? '+' : ''}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-white/30">
                      Nenhuma transação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="cyberpunk-checkbox"
                  />
                  <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Selecionar Tudo</span>
                </div>
                <span className="text-xs text-white/30">{filteredTransactions.length} transações</span>
              </div>

              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx, index) => {
                  const isSelected = selectedIds.has(tx.id);
                  const prevSelected = index > 0 && selectedIds.has(filteredTransactions[index - 1].id);
                  const nextSelected = index < filteredTransactions.length - 1 && selectedIds.has(filteredTransactions[index + 1].id);
                  
                  const rowBgClass = isSelected ? 'bg-cyan-100/10' : 'active:bg-zinc-800/50';
                  const rowBorderColor = (isSelected && nextSelected) ? 'border-cyan-100/10' : 'border-white/5';

                  return (
                    <div 
                      key={tx.id}
                      className={`relative p-4 transition-all duration-300 border-b ${rowBorderColor} ${rowBgClass} ${isSelected ? (
                        !prevSelected ? 'rounded-t-2xl' : ''
                      ) : ''} ${isSelected ? (
                        !nextSelected ? 'rounded-b-2xl' : ''
                      ) : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative pt-1">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelection(tx.id)}
                            className="cyberpunk-checkbox"
                          />
                          <AnimatePresence>
                            {lastSelectedId === tx.id && selectedIds.size > 0 && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.5, x: -10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5, x: -10 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsDeleteModalOpen(true);
                                }}
                                className="absolute left-full ml-2 top-0 p-2 bg-rose-500 text-white rounded-full shadow-lg shadow-rose-500/40 z-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                {selectedIds.size > 1 && (
                                  <span className="text-[10px] font-bold pr-1">
                                    {selectedIds.size}
                                  </span>
                                )}
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-white font-medium truncate" title={tx.cleanName}>
                                {tx.cleanName || '---'}
                              </h4>
                              <p className="text-white/40 text-xs truncate" title={tx.memo}>
                                {tx.memo}
                              </p>
                            </div>
                            <div className={`text-right font-bold whitespace-nowrap ${tx.flow === 'INFLOW' ? 'text-emerald-300' : 'text-white'}`}>
                              {tx.flow === 'INFLOW' ? '+' : ''}{formatCurrency(tx.amount)}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded-md ${tx.flow === 'INFLOW' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {tx.flow === 'INFLOW' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              </div>
                              <span className="text-white/40 text-xs">{tx.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-white/5 text-[10px] text-white/50">
                                {tx.paymentMethod || 'Outros'}
                              </span>
                              <button 
                                onClick={() => {
                                  if (editingCategoryId === tx.id) {
                                    setEditingCategoryId(null);
                                  } else {
                                    setEditingCategoryId(tx.id);
                                    setCategorySearch('');
                                  }
                                }}
                                className={`px-2 py-0.5 rounded border text-[10px] font-medium ${getCategoryColor(tx.category || 'Outros')}`}
                              >
                                {tx.category || 'Pendente'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Category Editor Overlay */}
                      <AnimatePresence>
                        {editingCategoryId === tx.id && (
                          <>
                            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setEditingCategoryId(null)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 20 }}
                              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[70] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[70vh]"
                            >
                              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-white font-medium">Alterar Categoria</h3>
                                <button onClick={() => setEditingCategoryId(null)} className="text-white/40 hover:text-white">
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                              <div className="p-4 border-b border-white/5">
                                <div className="relative">
                                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Buscar categoria..."
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-100/50 transition-colors"
                                  />
                                </div>
                              </div>
                              <div className="p-2 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                {allCategories
                                  .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                                  .map(cat => (
                                  <button
                                    key={cat}
                                    onClick={() => {
                                      onUpdateCategory(tx.id, cat);
                                      setEditingCategoryId(null);
                                    }}
                                    className={`w-full px-4 py-3 rounded-xl border text-sm text-left transition-all active:scale-[0.98] ${getCategoryColor(cat)}`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-white/30 text-sm">
                  Nenhuma transação encontrada.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Delete Button removed, now using selection bar */}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-medium text-white">
                  Excluir Transações
                </h3>
              </div>
              
              <p className="text-white/70 mb-6">
                Tem certeza que deseja excluir {selectedIds.size === 1 ? 'esta transação' : `estas ${selectedIds.size} transações`}? Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-colors font-medium"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
