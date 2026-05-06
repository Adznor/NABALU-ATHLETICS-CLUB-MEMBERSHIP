import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Image as ImageIcon, FileText, Info, Loader2, Save, Users, LogOut } from 'lucide-react';
import { ClubSettings } from '../types';
import MemberList from './MemberList';

export default function AdminPanel({ onLogout, settings, lang }: { onLogout: () => void, settings: ClubSettings, lang: 'bm' | 'en' }) {
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');
  const [localSettings, setLocalSettings] = useState<ClubSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSeenPendingCount, setLastSeenPendingCount] = useState(0);

  useEffect(() => {
    // Listen for pending members to show notification
    const q = query(collection(db, 'members'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    // When switching to members tab, update last seen
    if (activeTab === 'members') {
      setLastSeenPendingCount(pendingCount);
    }
  }, [activeTab, pendingCount]);

  const hasNewNotification = pendingCount > lastSeenPendingCount;

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'club'), localSettings);
      alert("Tetapan telah berjaya disimpan!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/club');
      alert("Gagal menyimpan tetapan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024) {
        alert("Saiz logo terlalu besar (maks 200KB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings(prev => ({ ...prev, logoBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-2">Panel Admin</h2>
          <p className="text-gray-500 font-medium">Urus ahli dan tetapan aplikasi kelab anda.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-teal-50">
          <button 
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all relative ${
              activeTab === 'members' ? 'bg-turquoise text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" /> Ahli
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === 'settings' ? 'bg-turquoise text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" /> Tetapan
          </button>
          <div className="w-[1px] bg-slate-100 mx-2 self-stretch" />
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-6 py-3 text-red-500 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      <AnimatePresence>
        {hasNewNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-8 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer"
            onClick={() => setActiveTab('members')}
          >
            <div className="w-10 h-10 bg-turquoise rounded-full flex items-center justify-center animate-bounce">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-turquoise">Pendaftaran Baharu</p>
              <p className="font-bold text-sm">Ada {pendingCount} pendaftaran yang belum disahkan!</p>
            </div>
            <button className="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 ml-4">Lihat</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'members' ? (
          <motion.div
            key="members"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <MemberList isAdmin={true} lang={lang} />
          </motion.div>
        ) : (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-4"
          >
            {/* Logo Section */}
            <div className="lg:col-span-4 bento-card text-center flex flex-col justify-between h-fit lg:sticky lg:top-8">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-center gap-2">
                  <ImageIcon className="w-4 h-4 text-turquoise" /> Logo & Jenama
                </h3>
                <div className="w-32 h-32 mx-auto mb-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center group relative">
                  {localSettings.logoBase64 ? (
                    <img src={localSettings.logoBase64} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="text-left space-y-4">
                  <div>
                    <label className="label-bento">Nama Kelab (BM)</label>
                    <input 
                      type="text" 
                      value={localSettings.clubName}
                      onChange={(e) => setLocalSettings({ ...localSettings, clubName: e.target.value })}
                      className="input-bento font-bold"
                    />
                  </div>
                  <div>
                    <label className="label-bento">Nama Kelab (EN)</label>
                    <input 
                      type="text" 
                      value={localSettings.clubNameEn || ""}
                      onChange={(e) => setLocalSettings({ ...localSettings, clubNameEn: e.target.value })}
                      className="input-bento font-bold"
                      placeholder="Club Name in English..."
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full bg-turquoise hover:bg-turquoise-dark text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-turquoise/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest mt-8"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Tetapan
              </button>
            </div>

            {/* Details Section */}
            <div className="lg:col-span-8 bento-card">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                <FileText className="w-4 h-4 text-turquoise" /> Maklumat Aplikasi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="md:col-span-2">
                  <label className="label-bento">Misi (BM)</label>
                  <textarea 
                    value={localSettings.mission}
                    onChange={(e) => setLocalSettings({ ...localSettings, mission: e.target.value })}
                    className="input-bento min-h-[60px]"
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label-bento">Misi (EN)</label>
                  <textarea 
                    value={localSettings.missionEn || ""}
                    onChange={(e) => setLocalSettings({ ...localSettings, missionEn: e.target.value })}
                    className="input-bento min-h-[60px]"
                    placeholder="Mission in English..."
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label-bento">Visi (BM)</label>
                  <textarea 
                    value={localSettings.vision}
                    onChange={(e) => setLocalSettings({ ...localSettings, vision: e.target.value })}
                    className="input-bento min-h-[60px]"
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label-bento">Visi (EN)</label>
                  <textarea 
                    value={localSettings.visionEn || ""}
                    onChange={(e) => setLocalSettings({ ...localSettings, visionEn: e.target.value })}
                    className="input-bento min-h-[60px]"
                    placeholder="Vision in English..."
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label-bento">Terma & Syarat (Teks Ringkas)</label>
                  <textarea 
                    value={localSettings.terms}
                    onChange={(e) => setLocalSettings({ ...localSettings, terms: e.target.value })}
                    className="input-bento min-h-[60px]"
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label-bento">Link PDF Terma & Syarat (Google Drive PDF Link)</label>
                  <input 
                    type="url"
                    value={localSettings.termsPdfUrl || ""}
                    onChange={(e) => setLocalSettings({ ...localSettings, termsPdfUrl: e.target.value })}
                    className="input-bento"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label-bento">Info Akaun Bank (Untuk Pendaftaran)</label>
                  <input 
                    type="text"
                    value={localSettings.bankInfo || "MAYBANK: 1234567890 (Nabalu Athletics Club)"}
                    onChange={(e) => setLocalSettings({ ...localSettings, bankInfo: e.target.value })}
                    className="input-bento text-xs font-mono"
                    placeholder="Bank, No Akaun & Nama..."
                  />
                </div>
                <div className="md:col-span-2 border-t border-slate-50 pt-6">
                  <label className="label-bento">Terma & Syarat Pendaftaran</label>
                  <textarea 
                    value={localSettings.terms}
                    onChange={(e) => setLocalSettings({ ...localSettings, terms: e.target.value })}
                    className="input-bento min-h-[100px] text-[10px]"
                  ></textarea>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
