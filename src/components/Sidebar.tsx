import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ListOrdered, 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed,
  onLogout
}: SidebarProps) {

  const sidebarVariants = {
    expanded: { width: 260 },
    collapsed: { width: 80 }
  };

  const transition = { type: "spring" as const, stiffness: 400, damping: 35 };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transações', icon: ListOrdered },
  ];

  return (
    <motion.aside
      initial={false}
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={sidebarVariants}
      transition={transition}
      className="z-50 bg-zinc-900 border-r border-white/5 flex flex-col fixed inset-y-0 left-0 h-screen"
    >
      {/* Logo Section */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 overflow-hidden gap-3">
        <div className="w-8 flex justify-center shrink-0">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-6 h-6 text-cyan-100"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              key="logo-text"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-zalando font-black text-xl tracking-tight text-white whitespace-nowrap"
            >
              money<span className="text-cyan-100">Sense.</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center p-3.5 rounded-2xl transition-all relative group gap-4
              ${activeTab === item.id 
                ? 'bg-cyan-100/10 text-cyan-100' 
                : 'text-white/40 hover:text-white hover:bg-zinc-800'
              }
            `}
          >
            <div className="w-6 flex justify-center shrink-0">
              <item.icon className={`w-5 h-5 transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {activeTab === item.id && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute left-0 w-1 h-6 bg-cyan-100 rounded-r-full"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* User & Settings Section */}
      <div className="p-3 border-t border-white/5 space-y-1">
        {/* User Profile */}
        <div className="w-full flex items-center p-3.5 rounded-2xl group gap-4">
          <div className="w-6 flex justify-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
              <User className="w-4 h-4 text-cyan-100" />
            </div>
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-1 items-center justify-between overflow-hidden"
              >
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-xs font-bold text-white whitespace-nowrap">Usuário</span>
                  <span className="text-[10px] text-white/30 whitespace-nowrap">Premium</span>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings Button */}
        <button className="w-full flex items-center p-3.5 rounded-2xl text-white/40 hover:text-white hover:bg-zinc-800 transition-all group gap-4">
          <div className="w-6 flex justify-center shrink-0">
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                Configurações
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-800 border border-white/10 rounded-full items-center justify-center text-white/50 hover:text-white hover:border-cyan-100/50 transition-all shadow-xl z-50 flex"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
}
