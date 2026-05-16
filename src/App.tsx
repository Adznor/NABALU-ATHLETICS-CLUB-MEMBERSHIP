/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import Navigation from './components/Navigation';
import ClubInfo from './components/ClubInfo';
import RegistrationForm from './components/RegistrationForm';
import MemberList from './components/MemberList';
import AdminPanel from './components/AdminPanel';
import { ClubSettings } from './types';
import { Shield, Lock, Loader2, Key, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_SETTINGS: ClubSettings = {
  clubName: "Nabalu Athletics Club",
  mission: "Menyediakan latihan sukan berkualiti tinggi.",
  vision: "Menjadi kelab olahraga nombor satu di Sabah.",
  terms: "Saya bersetuju dengan terma dan syarat kelab.",
  registrationOpen: true,
};

const SUPER_ADMIN_EMAIL = 'g-73273737@moe-dl.edu.my';

export default function App() {
  const [activeTab, setActiveTab] = useState('info');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminViaPassword, setIsAdminViaPassword] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [settings, setSettings] = useState<ClubSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'bm' | 'en'>('bm');

  useEffect(() => {
    // Set local persistence for better mobile experience
    setPersistence(auth, browserSessionPersistence).catch(console.error);

    const unsubSettings = onSnapshot(doc(db, 'settings', 'club'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ClubSettings;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          // Ensure registrationOpen explicitly defaults if missing
          registrationOpen: data.registrationOpen !== undefined ? data.registrationOpen : true
        });
        
        // Redirect to info if registration closed and currently on register tab
        if (data.registrationOpen === false && activeTab === 'register') {
          setActiveTab('info');
        }
      }
      setLoading(false);
    });

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email === SUPER_ADMIN_EMAIL) {
        setIsAdminAuthenticated(true);
        setIsAdminViaPassword(false);
      } else if (!isAdminViaPassword) {
        setIsAdminAuthenticated(false);
      }
    });

    return () => {
      unsubSettings();
      unsubAuth();
    };
  }, [isAdminViaPassword]);

  const handleAdminLogin = async () => {
    try {
      // Force account selection to avoid automatic login with wrong account
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user.email === SUPER_ADMIN_EMAIL) {
        setIsAdminAuthenticated(true);
      } else {
        alert(`Akses dinafikan. Email anda (${user.email}) bukan email admin berdaftar ${SUPER_ADMIN_EMAIL}.`);
        await auth.signOut(); // Ensure we sign out the wrong account
        setIsAdminAuthenticated(false);
      }
    } catch (err: any) {
      console.error("Admin Login Error:", err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        alert("Pop-up log masuk telah disekat. Sila benarkan 'Pop-up' di browser anda atau tekan butang log masuk lagi. Jika anda menggunakan peranti mobile, pastikan anda membuka pautan ini di browser utama (Chrome/Safari) dan bukan dalam aplikasi chat (seperti WhatsApp/Telegram).");
      } else {
        alert("Gagal log masuk. Sila pastikan anda mempunyai sambungan internet dan pilih akaun Google yang betul.");
      }
    }
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === '880310125473') {
      setIsAdminViaPassword(true);
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
    } else {
      alert("Kata laluan admin salah.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setIsAdminViaPassword(false);
    setIsAdminAuthenticated(false);
    setIsAdminMode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-turquoise rounded-2xl flex items-center justify-center shadow-2xl mb-8 animate-bounce">
            <Shield className="text-white w-8 h-8" />
        </div>
        <Loader2 className="w-8 h-8 animate-spin text-turquoise mb-4" />
        <p className="text-gray-400 font-black text-xs uppercase tracking-[0.3em]">Memulakan Aplikasi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-turquoise/30">
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        lang={lang}
        registrationOpen={settings.registrationOpen}
      />

      <main className="pb-32">
        <AnimatePresence mode="wait">
          {isAdminMode ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {!isAdminAuthenticated ? (
                <div className="max-w-md mx-auto mt-24 bento-card text-center">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black mb-4 uppercase tracking-[0.2em] text-slate-800">Akses Admin</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-10">Gunakan akaun Google berdaftar untuk mengakses panel.</p>
                  <div className="space-y-6">
                    <button 
                      onClick={handleAdminLogin}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 mb-4"
                    >
                      Log Masuk Google
                    </button>

                    <div className="relative flex items-center my-8">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atau Guna Password</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type={showAdminPass ? "text" : "password"}
                          placeholder="Kata Laluan Admin"
                          value={adminPasswordInput}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-turquoise"
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setShowAdminPass(!showAdminPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-turquoise transition-colors"
                        >
                          {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-turquoise hover:bg-turquoise-dark text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                      >
                        <Key className="w-4 h-4" /> Log Masuk Password
                      </button>
                    </form>

                    <button 
                      type="button"
                      onClick={() => setIsAdminMode(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest w-full text-center pt-4"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <AdminPanel 
                  settings={settings!} 
                  onLogout={handleLogout} 
                  lang={lang} 
                  isAdminViaPassword={isAdminViaPassword}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="client"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {activeTab === 'info' && <ClubInfo settings={settings} lang={lang} setLang={setLang} />}
              {activeTab === 'register' && <RegistrationForm settings={settings} lang={lang} />}
              {activeTab === 'list' && <MemberList lang={lang} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>


    </div>
  );
}
