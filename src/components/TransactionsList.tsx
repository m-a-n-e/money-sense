import React, { useState, useMemo, useEffect } from 'react';
import { OFXData } from '../lib/parsers';
import { ArrowDownRight, ArrowUpRight, Search, Filter, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
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
    } else {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
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
    <div className="w-full p-4 md:p-8 z-10">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-1 md:mb-2">Transações</h2>
              <p className="text-white/50 text-sm md:text-base">Histórico completo de movimentações.</p>
            </div>
            <div className="flex items-start justify-end min-h-[40px]">
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all font-medium text-sm backdrop-blur-md whitespace-nowrap ${selectedIds.size > 0 ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'}`}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{isAllSelected ? 'Excluir Todas' : `Excluir (${selectedIds.size})`}</span>
                <span className="sm:hidden">Excluir</span>
              </button>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {/* Month Filter */}
              <div className="relative w-full">
                <button 
                  onClick={() => setOpenFilter(openFilter === 'month' ? null : 'month')}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-100/50 transition-colors text-white/70 flex items-center justify-between"
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
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedMonth === 'all' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-white/5 border-white/5 text-white/70 hover:text-white'}`}
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
                              className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedMonth === m ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-white/5 border-white/5 text-white/70 hover:text-white'}`}
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
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-cyan-100/50 transition-colors flex items-center justify-between ${selectedCategory === 'all' ? 'bg-white/5 border-white/10 text-white/70' : getCategoryColor(selectedCategory)}`}
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
                            className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedCategory === 'all' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-white/5 border-white/5 text-white/70 hover:text-white'}`}
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
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-100/50 transition-colors text-white/70 flex items-center justify-between"
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
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedType === 'all' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-white/5 border-white/5 text-white/70 hover:text-white'}`}
                        >
                          Todos os Tipos
                        </button>
                        <button
                          onClick={() => { handleFilterChange(setSelectedType, 'INFLOW', 'Tipo'); setOpenFilter(null); }}
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedType === 'INFLOW' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-white/5 border-white/5 text-white/70 hover:text-white'}`}
                        >
                          Entradas
                        </button>
                        <button
                          onClick={() => { handleFilterChange(setSelectedType, 'OUTFLOW', 'Tipo'); setOpenFilter(null); }}
                          className={`w-full px-2.5 py-1.5 rounded-md border text-xs text-left transition-all hover:brightness-110 ${selectedType === 'OUTFLOW' ? 'bg-cyan-100/20 border-cyan-100/30 text-cyan-100' : 'bg-white/5 border-white/5 text-white/70 hover:text-white'}`}
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

          <div className="overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-sm">
                  <th className="pb-3 font-medium w-10 px-2">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="cyberpunk-checkbox"
                    />
                  </th>
                  <th className="pb-3 font-medium w-10"></th>
                  <th className="pb-3 font-medium px-2">Data</th>
                  <th className="pb-3 font-medium px-2">Descrição Original</th>
                  <th className="pb-3 font-medium px-2">Estabelecimento</th>
                  <th className="pb-3 font-medium px-2">Método</th>
                  <th className="pb-3 font-medium px-2">Categoria</th>
                  <th className="pb-3 font-medium px-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="text-sm md:text-base">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className={`border-b border-white/5 transition-colors group ${selectedIds.has(tx.id) ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}>
                      <td className="py-3 px-2">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelection(tx.id)}
                          className="cyberpunk-checkbox"
                        />
                      </td>
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
                      <td className="py-3 px-2 text-white/70 relative">
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
                      <td className={`py-3 px-2 text-right font-medium whitespace-nowrap ${tx.flow === 'INFLOW' ? 'text-emerald-300' : 'text-white/90'}`}>
                        {tx.flow === 'INFLOW' ? '+' : ''}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-white/30">
                      Nenhuma transação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6 max-w-md w-full"
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
