import React from 'react';
import { LayoutDashboard, ListOrdered } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'transactions', icon: ListOrdered, label: 'Transações' },
  ];

  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-max max-w-[95vw]">
      <div className="flex items-center gap-2 md:gap-4 p-2 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl rounded-full">
        {/* Logo */}
        <div className="flex items-center gap-2 pl-2 md:pl-4">
          <span className="font-sans font-semibold text-base md:text-lg tracking-tight text-white pr-2">
            money<span className="text-cyan-100">Sense</span>
          </span>
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 pr-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative p-2.5 md:p-3 rounded-full transition-colors ${isActive ? 'text-cyan-100' : 'text-white/50 hover:text-cyan-50 hover:bg-white/5'}`}
                title={tab.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-cyan-100/20 rounded-full shadow-[0_0_15px_rgba(207,250,254,0.1)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 w-5 h-5" />
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
