import React from 'react';
import { motion } from 'motion/react';
import { Shield, Users, Info, UserPlus, Lock, Sun, Moon } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, isAdminMode, setIsAdminMode, registrationOpen }: { 
  activeTab: string, 
  setActiveTab: (t: string) => void,
  isAdminMode: boolean,
  setIsAdminMode: (b: boolean) => void,
  registrationOpen?: boolean
}) {
  const tabs = [
    { id: 'info', label: 'Info Kelab', icon: <Info className="w-4 h-4" /> },
    { id: 'register', label: 'Daftar', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'list', label: 'Senarai Ahli', icon: <Users className="w-4 h-4" /> },
  ].filter(tab => tab.id !== 'register' || registrationOpen !== false);

  return (
    <nav className="fixed bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto z-[999] w-auto max-w-md mx-auto">
      <div className="bg-slate-900/80 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-2 flex items-center justify-between border border-white/10 transition-all duration-500">
        <div className="flex gap-1 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsAdminMode(false); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all duration-500 text-[10px] font-black uppercase tracking-widest ${
                activeTab === tab.id && !isAdminMode
                ? 'bg-turquoise text-white shadow-lg shadow-turquoise/20 scale-105' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="w-4 h-4">{tab.icon}</div>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <div className="w-[1px] h-6 bg-white/10 mx-3"></div>
        
        <button
          onClick={() => setIsAdminMode(!isAdminMode)}
          className={`p-3 rounded-2xl transition-all duration-500 ${
            isAdminMode 
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-105' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={isAdminMode ? "Keluar Admin" : "Akses Admin"}
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
