import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionsList from './components/TransactionsList';
import { OFXData, parseOFX } from './lib/ofxParser';
import { categorizeTransactionsWithAI } from './lib/aiService';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [appData, setAppData] = useState<OFXData | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.ofx')) {
      alert('Por favor, envie um arquivo .ofx válido.');
      return;
    }

    setIsProcessing(true);

    try {
      const text = await file.text();
      const parsedData = parseOFX(text);
      
      const existingIds = new Set(appData?.transactions.map(t => t.id) || []);
      const newTransactions = parsedData.transactions.filter(t => !existingIds.has(t.id));

      if (newTransactions.length === 0) {
        alert('Nenhuma transação nova encontrada. Todas já foram importadas anteriormente.');
        setIsProcessing(false);
        return;
      }

      // Call AI to categorize only new transactions
      const aiResults = await categorizeTransactionsWithAI(newTransactions);
      
      // Merge AI results with parsed data
      const enrichedNewTransactions = newTransactions.map(tx => {
        const aiMatch = aiResults.find(r => r.id === tx.id);
        return {
          ...tx,
          cleanName: aiMatch?.cleanName || tx.description,
          category: aiMatch?.category || 'Outros'
        };
      });

      setAppData(prev => {
        const allTransactions = [...(prev?.transactions || []), ...enrichedNewTransactions];
        // Sort by date descending
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return {
          balance: parsedData.balance ?? prev?.balance ?? 0,
          currency: parsedData.currency ?? prev?.currency ?? 'BRL',
          transactions: allTransactions
        };
      });
      
      setActiveTab('dashboard'); // Go to dashboard after import
    } catch (error) {
      console.error("Error processing OFX:", error);
      alert('Erro ao processar o arquivo OFX ou ao conectar com a IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 to-neutral-900 text-white font-sans selection:bg-cyan-100/30 relative flex overflow-x-hidden">
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
          <Dashboard appData={appData} onProcessFile={processFile} />
        )}
        {!isProcessing && activeTab === 'transactions' && (
          <TransactionsList appData={appData} />
        )}
      </main>
    </div>
  );
}
