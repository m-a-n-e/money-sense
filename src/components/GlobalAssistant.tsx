import React, { useState, useRef, useEffect } from 'react';
import { OFXData } from '../lib/parsers';
import { Send, User, ShieldCheck, TrendingUp, Scale, Leaf, X, MessageSquare, ChevronDown, Bot, Settings, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { chatWithAI } from '../lib/aiService';

interface GlobalAssistantProps {
  appData: OFXData | null;
}

const PERSONAS = [
  {
    id: 'conservador',
    robotName: 'Aegis',
    name: 'Conservador',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/20',
    gradient: 'from-emerald-500 to-teal-700',
    mentality: 'Sua mentalidade é focada em segurança absoluta, preservação de capital e aversão total ao risco. Você prioriza a reserva de emergência, corte de gastos supérfluos e investimentos em renda fixa protegidos pela inflação. Suas respostas devem ser cautelosas, incentivando a economia e a prudência financeira.',
    description: 'Foca em segurança, reserva de emergência e corte de gastos supérfluos.',
    suggestions: [
      'Como posso reduzir meus gastos essenciais?',
      'Qual a melhor forma de montar uma reserva de emergência?',
      'Onde estou gastando dinheiro à toa?',
      'Como proteger meu patrimônio da inflação?'
    ]
  },
  {
    id: 'agressivo',
    robotName: 'Vortex',
    name: 'Agressivo',
    icon: TrendingUp,
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10',
    borderColor: 'border-rose-400/20',
    gradient: 'from-rose-500 to-red-700',
    mentality: 'Sua mentalidade é focada em crescimento exponencial, multiplicação de patrimônio e busca por altos retornos através de riscos calculados. Você prioriza investimentos em renda variável, alavancagem e identificação de oportunidades de mercado. Suas respostas devem ser audaciosas, incentivando o investimento agressivo e a visão de longo prazo para enriquecimento.',
    description: 'Foca em multiplicar patrimônio, investimentos e assumir riscos calculados.',
    suggestions: [
      'Como posso investir melhor o que sobrou este mês?',
      'Quais gastos estão me impedindo de enriquecer?',
      'Como alavancar meus ganhos?',
      'Onde posso assumir mais risco para maior retorno?'
    ]
  },
  {
    id: 'equilibrado',
    robotName: 'Libra',
    name: 'Equilibrado',
    icon: Scale,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/20',
    gradient: 'from-blue-500 to-indigo-700',
    mentality: 'Sua mentalidade é focada no equilíbrio entre qualidade de vida e responsabilidade financeira. Você utiliza a regra 50/30/20 como base e busca diversificação equilibrada entre segurança e crescimento. Suas respostas devem ser ponderadas, incentivando o planejamento, a moderação e o bem-estar financeiro sustentável.',
    description: 'Foca na regra 50/30/20, qualidade de vida com responsabilidade.',
    suggestions: [
      'Meus gastos estão dentro da regra 50/30/20?',
      'Como posso equilibrar melhor lazer e poupança?',
      'Faça um diagnóstico geral das minhas finanças.',
      'Como planejar uma viagem sem comprometer o orçamento?'
    ]
  },
  {
    id: 'minimalista',
    robotName: 'Zenith',
    name: 'Minimalista',
    icon: Leaf,
    color: 'text-teal-400',
    bgColor: 'bg-teal-400/10',
    borderColor: 'border-teal-400/20',
    gradient: 'from-teal-400 to-emerald-600',
    mentality: 'Sua mentalidade é focada na simplicidade, no consumo consciente e na liberdade através do desapego material. Você prioriza gastar apenas com o que é essencial e traz valor real, questionando cada compra e buscando viver com menos. Suas respostas devem ser reflexivas, incentivando o minimalismo financeiro e a redução drástica de excessos.',
    description: 'Foca em gastar apenas com o essencial, questionar compras e viver com menos.',
    suggestions: [
      'Quais dos meus gastos parecem compras por impulso?',
      'Como posso simplificar minha vida financeira?',
      'Estou gastando muito com coisas não essenciais?',
      'Como aplicar o minimalismo nas minhas contas?'
    ]
  }
];

export default function GlobalAssistant({ appData }: GlobalAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  
  const [selectedPersona, setSelectedPersona] = useState<typeof PERSONAS[0]>(PERSONAS[2]); // Default to Libra (Equilibrado)
  
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('auto');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading]);

  // Bloquear scroll do body no mobile quando o chat estiver aberto
  useEffect(() => {
    const handleScrollLock = () => {
      if (isOpen && window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    };

    handleScrollLock();
    window.addEventListener('resize', handleScrollLock);
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('resize', handleScrollLock);
    };
  }, [isOpen]);

  useEffect(() => {
    // Check if user already has a saved persona
    const savedPersonaId = localStorage.getItem('@moneysense:persona');
    const persona = PERSONAS.find(p => p.id === savedPersonaId) || PERSONAS[2];
    setSelectedPersona(persona);
    loadChatHistory(persona);
  }, []);

  const loadChatHistory = (persona: typeof PERSONAS[0]) => {
    const historyKey = `@moneysense:chat_history_${persona.id}`;
    const savedHistoryStr = localStorage.getItem(historyKey);
    let initialMessages: { role: 'user' | 'model', text: string }[] = [];
    
    if (savedHistoryStr) {
      try {
        initialMessages = JSON.parse(savedHistoryStr);
      } catch (e) {
        console.error("Error parsing chat history", e);
      }
    }

    if (initialMessages.length === 0) {
      initialMessages = [
        { role: 'model', text: `Olá! Eu sou o **${persona.robotName}**, seu assistente financeiro com perfil **${persona.name}**. Analisei suas transações e estou pronto para ajudar com minha mentalidade focada em ${persona.description.toLowerCase()} O que você gostaria de saber?` }
      ];
    }
    
    setMessages(initialMessages);
  };

  const switchPersona = (persona: typeof PERSONAS[0]) => {
    setSelectedPersona(persona);
    localStorage.setItem('@moneysense:persona', persona.id);
    loadChatHistory(persona);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();
    setInputText('');
    
    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const responseText = await chatWithAI(newMessages, selectedPersona, appData);
      const finalMessages = [...newMessages, { role: 'model' as const, text: responseText }];
      setMessages(finalMessages);
      
      // Save to localStorage
      const historyKey = `@moneysense:chat_history_${selectedPersona.id}`;
      localStorage.setItem(historyKey, JSON.stringify(finalMessages));
    } catch (error) {
      console.error("Error in chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Deseja limpar o histórico de conversas deste perfil?')) {
      const historyKey = `@moneysense:chat_history_${selectedPersona.id}`;
      localStorage.removeItem(historyKey);
      loadChatHistory(selectedPersona);
    }
  };

  const toggleChat = () => {
    if (!isOpen && !isFabExpanded) {
      setIsFabExpanded(true);
    } else if (isFabExpanded) {
      setIsFabExpanded(false);
    } else {
      setIsOpen(false);
    }
  };

  const viewState = isOpen ? 'chat' : isFabExpanded ? 'selecting' : 'closed';

  const containerClasses = {
    closed: 'w-14 h-14 rounded-full cursor-pointer hover:bg-white/10',
    selecting: 'w-[240px] h-auto rounded-3xl',
    chat: 'w-full sm:w-[400px] h-full sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl'
  };

  return (
    <>
      <AnimatePresence>
        {/* FAB */}
        {!isOpen && !isFabExpanded && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setIsFabExpanded(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-zinc-900 border border-white/10 shadow-2xl flex items-center justify-center text-cyan-100 hover:bg-zinc-800 transition-colors"
          >
            <Bot className="w-6 h-6" />
          </motion.button>
        )}

        {/* Selector Menu */}
        {isFabExpanded && !isOpen && (
          <motion.div
            key="selector"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[240px] bg-zinc-900 border border-white/10 shadow-2xl rounded-3xl flex flex-col p-2 origin-bottom-right"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 mb-2">
              <span className="text-xs font-medium text-white/50">Assistentes</span>
              <button 
                onClick={() => setIsFabExpanded(false)} 
                className="text-white/50 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    switchPersona(p);
                    setIsOpen(true);
                    setIsFabExpanded(false);
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 transition-colors text-left"
                >
                  <div className={`p-2 rounded-full ${p.bgColor} ${p.color}`}>
                    <p.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-white">{p.robotName}</span>
                    <span className="block text-[10px] text-white/40">{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Chat Window */}
        {isOpen && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[100] sm:z-50 w-full sm:w-[400px] h-full sm:h-[600px] sm:max-h-[80vh] bg-zinc-900 border-0 sm:border border-white/10 shadow-2xl flex flex-col overflow-hidden origin-bottom sm:origin-bottom-right sm:rounded-2xl"
          >
            {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-zinc-900 border-b border-white/10 flex items-center justify-between shrink-0 relative z-50 overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${selectedPersona.bgColor} ${selectedPersona.color} border ${selectedPersona.borderColor} shadow-lg shadow-black/20`}>
                    <selectedPersona.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-white flex items-center gap-2">
                      {selectedPersona.robotName}
                    </h2>
                    <p className="text-[10px] text-white/50 flex items-center gap-1">
                      Perfil {selectedPersona.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={clearChat}
                    title="Limpar conversa"
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/30 hover:text-white/60"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/50 hover:text-white relative z-20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>

              {/* Content Area */}
              <motion.div 
                ref={scrollContainerRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col-reverse gap-6 custom-scrollbar bg-transparent"
              >
                <>
                  <div ref={messagesEndRef} className="h-0" />
                  
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${selectedPersona.bgColor} ${selectedPersona.color}`}>
                        <selectedPersona.icon className="w-4 h-4" />
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2 shadow-md">
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  {[...messages].reverse().map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                        msg.role === 'user' 
                          ? 'bg-cyan-100/20 text-cyan-100 border border-cyan-100/30' 
                          : `${selectedPersona.bgColor} ${selectedPersona.color}`
                      }`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <selectedPersona.icon className="w-4 h-4" />}
                      </div>
                      <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-md ${
                        msg.role === 'user' 
                          ? 'bg-cyan-100/10 border border-cyan-100/20 text-cyan-50 rounded-tr-sm' 
                          : 'bg-zinc-900 border border-white/10 text-white/90 rounded-tl-sm'
                      }`}>
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                        ) : (
                          <div className="markdown-body text-sm leading-relaxed prose prose-invert max-w-none">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              </motion.div>

              {/* Suggestions & Input Area */}
              {selectedPersona && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-zinc-900 border-t border-white/10 flex flex-col shrink-0"
                >
                  <div className="px-3 pt-3 pb-1 flex flex-nowrap overflow-x-auto overscroll-contain gap-2 custom-scrollbar hide-scrollbar-on-mobile">
                    {selectedPersona.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputText(sug)}
                        className={`flex-shrink-0 text-[11px] px-3 py-1.5 bg-zinc-800 hover:${selectedPersona.bgColor} border border-white/10 hover:${selectedPersona.borderColor} rounded-full text-white/70 hover:text-white transition-all whitespace-nowrap`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  <div className="p-3">
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
                      className="flex gap-2 relative"
                    >
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={`Pergunte ao ${selectedPersona.robotName}...`}
                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-100/50 transition-colors text-white placeholder:text-white/30"
                        disabled={isLoading}
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim() || isLoading}
                        className="bg-cyan-100 hover:bg-cyan-50 text-black rounded-xl px-4 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
