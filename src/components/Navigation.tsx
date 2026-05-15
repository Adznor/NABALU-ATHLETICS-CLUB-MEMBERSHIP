import React from 'react';
import { motion } from 'motion/react';
import { Shield, Users, Info, UserPlus, Lock } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, isAdminMode, setIsAdminMode, lang, registrationOpen }: { 
  activeTab: string, 
  setActiveTab: (t: string) => void,
  isAdminMode: boolean,
  setIsAdminMode: (b: boolean) => void,
  lang: 'bm' | 'en',
  registrationOpen?: boolean
}) {
  const tabs = [
    { id: 'info', label: lang === 'bm' ? 'Info Kelab' : 'Club Info', icon: <Info className="w-4 h-4" /> },
    { id: 'register', label: lang === 'bm' ? 'Daftar' : 'Register', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'list', label: lang === 'bm' ? 'Senarai Ahli' : 'Members', icon: <Users className="w-4 h-4" /> },
  ].filter(tab => tab.id !== 'register' || registrationOpen !== false);

  return (
    <nav className="fixed bottom-0 sm:bottom-8 left-0 sm:left-1/2 sm:-translate-x-1/2 z-50 px-0 sm:px-4 w-full sm:max-w-md">
      <div className="bg-slate-900/80 sm:bg-slate-900/90 shadow-2xl shadow-slate-900/40 rounded-t-[2rem] sm:rounded-[2.5rem] p-3 sm:p-2 flex items-center justify-between border-t sm:border border-white/10 backdrop-blur-2xl transition-all">
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
