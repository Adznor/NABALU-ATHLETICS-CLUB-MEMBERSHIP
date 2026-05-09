import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType, logActivity } from '../lib/firebase';
import { doc, setDoc, query, collection, where, onSnapshot, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Image as ImageIcon, FileText, Info, Loader2, Save, Users, LogOut, UserPlus, Shield, Search, Clock, Activity, CreditCard, Trash2, Lock, X, Download, AlertTriangle } from 'lucide-react';
import { ClubSettings, LogEntry } from '../types';
import MemberList from './MemberList';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel({ onLogout, settings, lang }: { onLogout: () => void, settings: ClubSettings, lang: 'bm' | 'en' }) {
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'logs'>('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSettings, setLocalSettings] = useState<ClubSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSeenPendingCount, setLastSeenPendingCount] = useState(0);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('all');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const SUPER_ADMIN_EMAIL = 'g-73273737@moe-dl.edu.my';

  useEffect(() => {
    if (activeTab !== 'logs') return;

    setLogsLoading(true);
    const q = query(
      collection(db, 'logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry)));
      setLogsLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'logs'));

    return () => unsubscribe();
  }, [activeTab]);

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

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) || 
                         log.details.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
                         (log.adminEmail && log.adminEmail.toLowerCase().includes(logSearchTerm.toLowerCase())) ||
                         (log.targetMemberId && log.targetMemberId.toLowerCase().includes(logSearchTerm.toLowerCase()));
    
    const matchesCategory = logCategoryFilter === 'all' || log.category === logCategoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const exportLogsToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('REKOD LOG AKTIVITI SISTEM', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(settings.clubName.toUpperCase(), 105, 30, { align: 'center' });
    
    // Table
    const tableData = filteredLogs.map(log => [
      log.timestamp ? format(log.timestamp.toDate(), 'dd/MM/yyyy HH:mm') : '-',
      log.category.toUpperCase(),
      log.action,
      log.details,
      log.adminEmail || 'SYSTEM'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Tarikh', 'Kategori', 'Tindakan', 'Butiran', 'Admin']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 40 },
        3: { cellWidth: 60 },
        4: { cellWidth: 40 }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Muka Surat ${i} daripada ${pageCount}`, 105, 285, { align: 'center' });
      doc.text('Dijana pada: ' + format(new Date(), 'dd/MM/yyyy HH:mm'), 190, 285, { align: 'right' });
    }

    doc.save(`Activity_Logs_${format(new Date(), 'ddMMyyyy')}.pdf`);
  };

  const hasNewNotification = pendingCount > lastSeenPendingCount;

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'club'), localSettings);
      
      logActivity({
        category: 'system',
        action: 'Settings Updated',
        details: 'Club profile and settings were modified by admin.'
      });
      
      alert("Tetapan telah berjaya disimpan!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/club');
      alert("Gagal menyimpan tetapan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSystem = async () => {
    if (resetPassword !== 'Adzeem1312') {
      alert("Kata laluan salah!");
      return;
    }

    setIsResetting(true);
    try {
      // 1. Delete all members
      const memberSnapshot = await getDocs(collection(db, 'members'));
      const batchSize = 100; 
      
      for (let i = 0; i < memberSnapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = memberSnapshot.docs.slice(i, i + batchSize);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // 2. Clear logs
      const logSnapshot = await getDocs(collection(db, 'logs'));
      for (let i = 0; i < logSnapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = logSnapshot.docs.slice(i, i + batchSize);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // 3. Reset counters
      await setDoc(doc(db, 'counters', 'members'), { count: 0 });

      // 4. Log the reset
      await logActivity({
        category: 'system',
        action: 'System Full Reset',
        details: 'Seluruh sistem telah disifar semula oleh super admin.'
      });

      alert("Penyifaran semula berjaya!");
      setShowResetModal(false);
      setResetPassword('');
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan penyifaran semula sistem. Sila cuba lagi.");
    } finally {
      setIsResetting(false);
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
        <div className="flex flex-wrap bg-white p-1 rounded-2xl shadow-sm border border-teal-50 gap-1">
          <button 
            onClick={() => setActiveTab('members')}
            className={`flex-1 min-w-fit flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all relative ${
              activeTab === 'members' ? 'bg-turquoise text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" /> Ahli
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[7px] font-black border border-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex-1 min-w-fit flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === 'settings' ? 'bg-turquoise text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" /> Tetapan
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex-1 min-w-fit flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4" /> Log Aktiviti
          </button>
          <div className="hidden md:block w-[1px] bg-slate-100 mx-1 self-stretch" />
          <button 
            onClick={onLogout}
            className="flex-1 min-w-fit flex items-center gap-2 px-6 py-3 text-red-500 hover:bg-red-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
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
            <div className="mb-6 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text"
                placeholder={lang === 'bm' ? "Cari nama atau No. Ahli..." : "Search name or Member ID..."}
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-teal-50 rounded-[2rem] shadow-sm px-12 py-5 outline-none focus:ring-2 focus:ring-turquoise font-bold text-slate-700 transition-all"
              />
            </div>
            <MemberList 
              isAdmin={true} 
              lang={lang} 
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
            />
          </motion.div>
        ) : activeTab === 'logs' ? (
          <motion.div 
            key="logs"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bento-card border-none bg-white p-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Log Aktiviti Keseluruhan</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit log untuk semua tindakan sistem</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari log..."
                    value={logSearchTerm}
                    onChange={(e) => setLogSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                  />
                </div>
                <select
                  value={logCategoryFilter}
                  onChange={(e) => setLogCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="member">Ahli</option>
                  <option value="payment">Bayaran</option>
                  <option value="system">Sistem</option>
                </select>
                <button
                  onClick={exportLogsToPDF}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                  <Download className="w-4 h-4" /> Cetak Log
                </button>
              </div>
            </div>

            {logsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest">Memuatkan Log...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                <Activity className="w-12 h-12" />
                <p className="text-xs font-black uppercase tracking-widest">Tiada rekod aktiviti ditemui</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        log.category === 'member' ? 'bg-turquoise/10 text-turquoise' :
                        log.category === 'payment' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {log.category === 'payment' ? <CreditCard className="w-5 h-5" /> : 
                         log.category === 'member' ? <Users className="w-5 h-5" /> : 
                         <Settings className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{log.action}</p>
                        <p className="text-xs text-slate-500 font-medium">{log.details}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Admin: {log.adminEmail}</span>
                          {log.targetMemberId && (
                            <span className="text-[8px] font-black text-turquoise uppercase tracking-widest bg-turquoise/5 px-1.5 py-0.5 rounded">ID Ahli: {log.targetMemberId}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-slate-400">
                        {log.timestamp ? format(log.timestamp.toDate(), 'dd MMM yyyy, HH:mm:ss') : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    <label className="label-bento">Nama Kelab</label>
                    <input 
                      type="text" 
                      value={localSettings.clubName || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, clubName: e.target.value })}
                      className="input-bento font-bold"
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
                  <label className="label-bento">Misi</label>
                  <textarea 
                    value={localSettings.mission || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, mission: e.target.value })}
                    className="input-bento min-h-[60px]"
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label-bento">Visi</label>
                  <textarea 
                    value={localSettings.vision || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, vision: e.target.value })}
                    className="input-bento min-h-[60px]"
                  ></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="label-bento">Terma & Syarat (Teks Ringkas)</label>
                  <textarea 
                    value={localSettings.terms || ''}
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
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${localSettings.registrationOpen ? 'bg-turquoise text-white shadow-turquoise/20' : 'bg-slate-200 text-slate-400 shadow-slate-200/20'}`}>
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Status Pendaftaran Keahlian</h4>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${localSettings.registrationOpen ? 'text-turquoise' : 'text-slate-400'}`}>
                          {localSettings.registrationOpen ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, registrationOpen: !prev.registrationOpen }))}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all focus:outline-none shadow-inner ${localSettings.registrationOpen ? 'bg-turquoise' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${localSettings.registrationOpen ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                {auth.currentUser?.email === SUPER_ADMIN_EMAIL && (
                  <div className="md:col-span-2 border-t border-red-50 pt-8 mt-4">
                    <div className="p-6 bg-red-50 rounded-[2rem] border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-red-800 uppercase tracking-tight">Sifar Semula Sistem</h4>
                          <p className="text-[9px] font-black uppercase tracking-widest text-red-400">Padam semua ahli, log dan reset ID (Tindakan kekal)</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowResetModal(true)}
                        className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all shadow-lg shadow-red-200 text-[10px] uppercase tracking-widest"
                      >
                        Reset Aplikasi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowResetModal(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Pengesahan Reset Sistem</h3>
              <p className="text-xs text-slate-500 font-medium mb-8">Tindakan ini akan memadam SEMUA rekod secara kekal. <br/>Sila masukkan kata laluan <b>Adzeem1312</b>.</p>
              
              <div className="space-y-4">
                <input 
                  type="password"
                  value={resetPassword || ''}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Masukkan kata laluan..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-500 font-bold text-center"
                />
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setShowResetModal(false);
                      setResetPassword('');
                    }}
                    className="flex-1 px-4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    disabled={isResetting || !resetPassword}
                    onClick={handleResetSystem}
                    className="flex-1 px-4 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-200 disabled:opacity-50"
                  >
                    {isResetting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Sahkan Reset"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
