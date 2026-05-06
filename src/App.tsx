/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import Navigation from './components/Navigation';
import ClubInfo from './components/ClubInfo';
import RegistrationForm from './components/RegistrationForm';
import MemberList from './components/MemberList';
import AdminPanel from './components/AdminPanel';
import { ClubSettings } from './types';
import { Shield, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_SETTINGS: ClubSettings = {
  clubName: "Nabalu Athletics Club",
  mission: "Menyediakan latihan sukan berkualiti tinggi.",
  vision: "Menjadi kelab olahraga nombor satu di Sabah.",
  terms: "Saya bersetuju dengan terma dan syarat kelab.",
};

export default function App() {
  const [activeTab, setActiveTab] = useState('info');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [settings, setSettings] = useState<ClubSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'bm' | 'en'>('bm');

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'club'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as ClubSettings);
      }
      setLoading(false);
    });

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'g-73273737@moe-dl.edu.my') {
        setIsAdminAuthenticated(true);
      } else {
        setIsAdminAuthenticated(false);
      }
    });

    return () => {
      unsubSettings();
      unsubAuth();
    };
  }, []);

  const handleAdminLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== 'g-73273737@moe-dl.edu.my') {
        alert("Akses dinafikan. Email anda bukan admin berdaftar.");
        await auth.signOut();
      }
    } catch (err) {
      console.error(err);
      alert("Gagal log masuk.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
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
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                    >
                      Log Masuk Google
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsAdminMode(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest w-full text-center"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <AdminPanel settings={settings!} onLogout={handleLogout} lang={lang} />
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
