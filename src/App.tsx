import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionsList from './components/TransactionsList';
import GlobalAssistant from './components/GlobalAssistant';
import { parseBankStatement, OFXData } from './lib/parsers';
import { categorizeTransactionsWithAI } from './lib/aiService';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { UploadCloud, X, FileText } from 'lucide-react';

export default function App() {
  const [appData, setAppData] = useState<OFXData | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('@moneysense:data');
    if (saved) {
      try {
        setAppData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  useEffect(() => {
    if (appData) {
      localStorage.setItem('@moneysense:data', JSON.stringify(appData));
    }
  }, [appData]);

  const updateTransactionCategory = (id: string, newCategory: string) => {
    setAppData(prev => {
      if (!prev) return prev;
      const updatedTransactions = prev.transactions.map(tx => {
        if (tx.id === id) {
          // Salvar a correção no localStorage para a IA aprender
          const corrections = JSON.parse(localStorage.getItem('@moneysense:corrections') || '[]');
          corrections.push({ memo: tx.memo, cleanName: tx.cleanName, category: newCategory });
          localStorage.setItem('@moneysense:corrections', JSON.stringify(corrections));
          
          return { ...tx, category: newCategory };
        }
        return tx;
      });
      return { ...prev, transactions: updatedTransactions };
    });
    toast.success('Categoria atualizada com sucesso!');
  };

  const deleteTransactions = (ids: string[]) => {
    setAppData(prev => {
      if (!prev) return prev;
      const updatedTransactions = prev.transactions.filter(tx => !ids.includes(tx.id));
      return { ...prev, transactions: updatedTransactions };
    });
    toast.success(`${ids.length} transaç${ids.length === 1 ? 'ão excluída' : 'ões excluídas'} com sucesso!`);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);

    try {
      const parsedData = await parseBankStatement(file);
      
      const existingIds = new Set(appData?.transactions.map(t => t.id) || []);
      const newTransactionsRaw = parsedData.transactions.filter(t => !existingIds.has(t.id));

      if (newTransactionsRaw.length === 0) {
        toast.error('Nenhuma transação nova encontrada.');
        setIsProcessing(false);
        return;
      }

      let processedTransactions = [];

      // If it's OFX, we still need to categorize the new transactions with AI
      // (CSV and PDF already come categorized from the AI-based parser)
      if (file.name.toLowerCase().endsWith('.ofx')) {
        const aiResults = await categorizeTransactionsWithAI(newTransactionsRaw);
        
        processedTransactions = newTransactionsRaw.map(tx => {
          const aiMatch = aiResults.find(r => r.id === tx.id);
          return {
            ...tx,
            cleanName: aiMatch?.cleanName || tx.description,
            category: aiMatch?.category || 'Outros',
            paymentMethod: aiMatch?.paymentMethod || tx.paymentMethod || 'Outros'
          };
        });
      } else {
        // CSV/PDF already have category, cleanName, etc. from the parser
        processedTransactions = newTransactionsRaw;
      }

      setAppData(prev => {
        const allTransactions = [...(prev?.transactions || []), ...processedTransactions];
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return {
          balance: parsedData.balance ?? prev?.balance ?? 0,
          currency: parsedData.currency ?? prev?.currency ?? 'BRL',
          transactions: allTransactions
        };
      });
      
      toast.success('Extrato importado e analisado com sucesso!');
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar o arquivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.toLowerCase().split('.').pop();
      if (['ofx', 'csv', 'pdf'].includes(ext || '')) {
        processFile(file);
        setIsImportModalOpen(false);
      } else {
        toast.error('Formato não suportado. Use OFX, CSV ou PDF.');
      }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      setIsImportModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 to-neutral-900 text-white font-sans selection:bg-cyan-100/30 relative flex overflow-x-hidden">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(24, 24, 27, 0.9)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
          },
          success: {
            iconTheme: {
              primary: '#34d399',
              secondary: '#18181b',
            },
          },
        }} 
      />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col relative pt-28 pb-8 min-h-screen w-full max-w-full">
        {/* Subtle background glow */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800/30 rounded-full blur-[120px] pointer-events-none" />

        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center"
            >
              <div className="loadingspinner">
                <div id="square1"></div>
                <div id="square2"></div>
                <div id="square3"></div>
                <div id="square4"></div>
                <div id="square5"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isProcessing && activeTab === 'dashboard' && (
          <Dashboard appData={appData} onProcessFile={processFile} onOpenImportModal={() => setIsImportModalOpen(true)} />
        )}
        {!isProcessing && activeTab === 'transactions' && (
          <TransactionsList 
            appData={appData} 
            onUpdateCategory={updateTransactionCategory} 
            onDeleteTransactions={deleteTransactions}
          />
        )}
      </main>

      <GlobalAssistant appData={appData} />

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept=".ofx,.csv,.pdf"
        className="hidden"
      />

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[32px] p-6 md:p-8 max-w-lg w-full relative overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-2xl">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white">Importar Extrato</h3>
                    <p className="text-white/50 text-xs">Selecione seu arquivo bancário</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
                  isDragging 
                    ? 'border-cyan-400 bg-cyan-400/5 scale-[1.02]' 
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className={`p-5 rounded-full transition-all duration-300 ${
                  isDragging ? 'bg-cyan-400/20 text-cyan-300 scale-110' : 'bg-white/5 text-white/30 group-hover:text-white/50 group-hover:scale-110'
                }`}>
                  <FileText className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium mb-1">Arraste seu arquivo aqui</p>
                  <p className="text-white/40 text-sm">Ou clique para navegar no computador</p>
                </div>
                
                <div className="flex gap-2 mt-2">
                  {['.OFX', '.CSV', '.PDF'].map(ext => (
                    <span key={ext} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 group-hover:text-white/60 transition-colors">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <p className="text-xs text-white/60 leading-relaxed">
                    Seus dados são processados localmente e nunca saem do seu navegador de forma insegura.
                  </p>
                </div>
                
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
