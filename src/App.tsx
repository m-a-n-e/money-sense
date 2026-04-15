import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionsList from './components/TransactionsList';
import GlobalAssistant from './components/GlobalAssistant';
import AlertDialog from './components/AlertDialog';
import { OFXData } from './lib/parsers';
import { parseOFX } from './lib/parsers/ofxParser';
import { parseCSVLocal } from './lib/parsers/csvParser';
import { parsePDF } from './lib/parsers/pdfParser';
import { categorizeTransactionsWithAI } from './lib/aiService';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { UploadCloud, X, FileText, Menu, Sparkles, Loader2 } from 'lucide-react';

export default function App() {
  const [appData, setAppData] = useState<OFXData | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const [privacyMessage, setPrivacyMessage] = useState<string>('');
  const [loadingState, setLoadingState] = useState<'local' | 'ai' | null>(null);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setImportProgress(0);

    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        const next = prev + Math.random() * 10;
        return next > 95 ? 95 : next;
      });
    }, 400);

    try {
      let allNewTransactions: any[] = [];
      let finalBalance: number | null = null;
      let finalCurrency = 'BRL';

      for (const file of files) {
        const ext = file.name.toLowerCase().split('.').pop();
        let result: any;

        if (ext === 'ofx') {
          setLoadingState('local');
          setPrivacyMessage("🟢 Arquivo suportado nativamente. Processamento 100% local.");
          result = await parseOFX(file);
        } else if (ext === 'csv') {
          setLoadingState('local');
          setPrivacyMessage("🟢 Arquivo suportado nativamente. Processamento 100% local.");
          result = await parseCSVLocal(file);
        } else if (ext === 'pdf') {
          setLoadingState('ai');
          setPrivacyMessage("✨ Lendo PDF com Inteligência Artificial na nuvem.");
          result = await parsePDF(file);
        } else {
          continue;
        }

        if (result.balance !== null) finalBalance = result.balance;
        if (result.currency) finalCurrency = result.currency;

        // Categorize transactions
        allNewTransactions = [...allNewTransactions, ...result.transactions];
      }

      // Batch categorize all new transactions in one AI call
      if (allNewTransactions.length > 0) {
        const aiResults = await categorizeTransactionsWithAI(allNewTransactions);
        
        allNewTransactions = allNewTransactions.map(tx => {
          const aiMatch = aiResults.find(r => r.id === tx.id);
          return {
            ...tx,
            cleanName: aiMatch?.cleanName || tx.description,
            category: aiMatch?.category || 'Outros',
            paymentMethod: aiMatch?.paymentMethod || tx.paymentMethod || 'Outros'
          };
        });
      }

      if (allNewTransactions.length === 0) {
        toast.error('Nenhuma transação nova encontrada nos arquivos.');
        clearInterval(progressInterval);
        setIsProcessing(false);
        return;
      }

      setAppData(prev => {
        const allTransactions = [...(prev?.transactions || []), ...allNewTransactions];
        const uniqueTransactions = Array.from(new Map(allTransactions.map(tx => [tx.id, tx])).values());
        uniqueTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return {
          balance: finalBalance ?? prev?.balance ?? 0,
          currency: finalCurrency ?? prev?.currency ?? 'BRL',
          transactions: uniqueTransactions
        };
      });
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      setTimeout(() => {
        toast.success(`${allNewTransactions.length} transações importadas com sucesso!`);
        setActiveTab('dashboard');
        setIsProcessing(false);
        setImportProgress(0);
        setLoadingState(null);
        setPrivacyMessage('');
      }, 500);
    } catch (error) {
      console.error("Error processing files:", error);
      clearInterval(progressInterval);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar os arquivos.');
      setIsProcessing(false);
      setImportProgress(0);
      setLoadingState(null);
      setPrivacyMessage('');
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
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(file => {
        const ext = file.name.toLowerCase().split('.').pop();
        return ['ofx', 'csv', 'pdf'].includes(ext || '');
      });

      if (validFiles.length > 0) {
        processFiles(validFiles);
        setIsImportModalOpen(false);
      } else {
        toast.error('Nenhum arquivo suportado encontrado. Use OFX, CSV ou PDF.');
      }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      setIsImportModalOpen(false);
    }
  };

  const handleLogout = () => {
    // Implement actual logout logic here
    toast.success('Sessão encerrada com sucesso!');
    // For demo purposes, we might clear local data or redirect
  };

  return (
    <div className="min-h-screen w-full bg-app-bg text-white font-sans selection:bg-cyan-100/30 relative flex overflow-x-hidden">
      {isMobile && (
        <header className="h-16 bg-zinc-800 border-b border-white/5 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 flex justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-cyan-100">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-zalando font-black text-xl tracking-tight text-white whitespace-nowrap">
              money<span className="text-cyan-100">Sense.</span>
            </span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white/50 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
        </header>
      )}

      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fff',
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
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (isMobile) setIsMobileMenuOpen(false);
        }} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
        onLogout={() => setIsLogoutAlertOpen(true)}
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isMobile ? 'pt-16 pl-0' : (isSidebarCollapsed ? 'pl-20' : 'pl-[260px]')}`}>
        <main className="flex-1 flex flex-col relative pb-8 min-h-screen transition-all duration-300 ease-in-out w-full max-w-7xl mx-auto px-4 md:px-8">
          {activeTab === 'dashboard' && (
            <Dashboard 
              appData={appData} 
              onProcessFile={(file) => processFiles([file])} 
              onOpenImportModal={() => setIsImportModalOpen(true)}
              isProcessing={isProcessing}
              importProgress={importProgress}
            />
          )}
          {activeTab === 'transactions' && (
            <TransactionsList 
              appData={appData} 
              onUpdateCategory={updateTransactionCategory} 
              onDeleteTransactions={deleteTransactions}
            />
          )}
        </main>

      </div>

      <AlertDialog 
        isOpen={isLogoutAlertOpen}
        onClose={() => setIsLogoutAlertOpen(false)}
        onConfirm={handleLogout}
        title="Encerrar Sessão"
        description="Você tem certeza que deseja sair da sua conta? Todas as alterações não salvas podem ser perdidas."
        confirmText="Sair agora"
        cancelText="Continuar logado"
        variant="danger"
      />

      <GlobalAssistant appData={appData} />

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept=".ofx,.csv,.pdf"
        multiple
        className="hidden"
      />

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-800 border border-white/5 rounded-[32px] p-8 md:p-10 max-w-lg w-full relative overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-2xl">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white">Importar Extratos</h3>
                    <p className="text-white/50 text-xs">Selecione seus arquivos bancários (OFX, CSV ou PDF)</p>
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
                    : 'border-white/10 hover:border-white/20 hover:bg-zinc-800'
                }`}
              >
                <div className={`p-5 rounded-full transition-all duration-300 ${
                  isDragging ? 'bg-cyan-400/20 text-cyan-300 scale-110' : 'bg-zinc-800 text-white/30 group-hover:text-white/50 group-hover:scale-110'
                }`}>
                  <FileText className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium mb-1">Arraste seus arquivos aqui</p>
                  <p className="text-white/40 text-sm">Ou clique para navegar no computador</p>
                </div>
                
                <div className="flex gap-2 mt-2">
                  {['.OFX', '.CSV', '.PDF'].map(ext => (
                    <span key={ext} className="px-2 py-1 bg-zinc-800 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 group-hover:text-white/60 transition-colors">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                {privacyMessage && (
                  <div className="flex items-start gap-3 p-4 bg-zinc-800 rounded-2xl border border-white/5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${loadingState === 'ai' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <p className="text-xs text-white/60 leading-relaxed">
                      {privacyMessage}
                    </p>
                  </div>
                )}
                
                {isProcessing ? (
                  <div className="w-full py-3.5 rounded-2xl bg-zinc-800 border border-white/10 text-white font-medium flex items-center justify-center gap-2">
                    {loadingState === 'ai' ? <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> : <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
                    <span>Processando...</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="w-full py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-medium transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
