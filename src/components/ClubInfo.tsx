import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Globe, Users, User, Users2, TrendingUp, BarChart3, Sun, Moon } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Member } from '../types';

export default function ClubInfo({ settings, theme, setTheme, onRegisterClick }: { settings: any, theme: 'light' | 'dark', setTheme: (t: 'light' | 'dark') => void, onRegisterClick: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberList: Member[] = [];
      snapshot.forEach((docSnap) => {
        memberList.push({ id: docSnap.id, ...docSnap.data() } as Member);
      });
      setMembers(memberList);
      setLoadingStats(false);
    });
    return () => unsubscribe();
  }, []);

  const current = {
    clubName: settings?.clubName || "Nabalu Athletics Club",
    missionTitle: "Misi Kami",
    visionTitle: "Visi Kami",
    mission: settings?.mission || "Melahirkan jaguh olahraga yang berdaya saing tinggi di peringkat antarabangsa.",
    vision: settings?.vision || "Menjadi pusat kecemerlangan olahraga paling inovatif di Borneo.",
    statsTitle: "Statistik Keahlian",
    statsSubtitle: "Analisis data pendaftaran ahli kelab terkini",
    totalApps: "Jumlah Permohonan",
    totalVerified: "Ahli Berdaftar",
    individu: "Ahli Individu",
    remaja: "Ahli Remaja",
    male: "Lelaki",
    female: "Perempuan",
    ratio: "Nisbah Jantina",
  };

  // Stats Logic
  const registered = members.filter(m => m.status === 'verified');
  const totalAppsCount = members.length;
  const verifiedCount = registered.filter(m => m.membershipType !== 'Ahli Kehormat').length;

  const individu = registered.filter(m => m.membershipType === 'Ahli Individu');
  const remaja = registered.filter(m => m.membershipType === 'Ahli Remaja');
  const kehormat = registered.filter(m => m.membershipType === 'Ahli Kehormat');

  const totalOverall = registered.length;

  const individuStats = {
    count: individu.length,
    male: individu.filter(m => m.gender === 'Lelaki').length,
    female: individu.filter(m => m.gender === 'Perempuan').length,
    percentage: totalOverall > 0 ? (individu.length / totalOverall * 100).toFixed(1) : '0'
  };

  const remajaStats = {
    count: remaja.length,
    male: remaja.filter(m => m.gender === 'Lelaki').length,
    female: remaja.filter(m => m.gender === 'Perempuan').length,
    percentage: totalOverall > 0 ? (remaja.length / totalOverall * 100).toFixed(1) : '0'
  };

  const kehormatStats = {
    count: kehormat.length,
    male: kehormat.filter(m => m.gender === 'Lelaki').length,
    female: kehormat.filter(m => m.gender === 'Perempuan').length,
    percentage: totalOverall > 0 ? (kehormat.length / totalOverall * 100).toFixed(1) : '0'
  };

  const getPercent = (count: number, total: number) => {
    if (total === 0) return '0%';
    return (count / total * 100).toFixed(1) + '%';
  };

  return (
    <div className="relative max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-24 overflow-hidden">
      {/* Background Watermark Logo */}
      {settings?.logoBase64 && (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] ${theme === 'dark' ? 'opacity-[0.03]' : 'opacity-[0.05]'} pointer-events-none -z-10 rotate-12`}>
          <img src={settings.logoBase64} alt="" className="w-full h-full object-contain" />
        </div>
      )}
      
      <section className="space-y-12">
        <div className="flex flex-col items-center text-center space-y-12">
          {/* Theme Toggle Above Logo */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
              theme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-400 border-slate-100 shadow-sm'
            } border`}
          >
            {theme === 'light' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
            {theme === 'light' ? 'Mod Gelap' : 'Mod Terang'}
          </motion.button>

          {/* Large Logo Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group mt-8"
          >
            <div className={`absolute -inset-4 ${theme === 'dark' ? 'bg-turquoise/10' : 'bg-turquoise/20'} rounded-[4rem] blur-2xl group-hover:bg-turquoise/30 transition-all duration-700 opacity-50`} />
            <div className={`relative w-64 h-64 md:w-80 md:h-80 rounded-[3.5rem] ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} shadow-2xl flex items-center justify-center border overflow-hidden transform group-hover:scale-[1.02] transition-transform duration-500`}>
              {settings?.logoBase64 ? (
                <img 
                  src={settings.logoBase64} 
                  alt="NAC Logo" 
                  className="w-48 h-48 md:w-60 md:h-60 object-contain p-8" 
                />
              ) : (
                <Shield className="w-32 h-32 text-turquoise" />
              )}
            </div>
          </motion.div>

          {/* Club Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className={`text-4xl md:text-6xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2 italic`}>
              {current.clubName}
            </h1>
            <div className="h-2 w-24 bg-turquoise mx-auto rounded-full mb-8" />

            {/* Red Action Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRegisterClick}
              className="px-10 py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(220,38,38,0.4)] flex items-center gap-3 transition-all mx-auto"
            >
              <Users2 className="w-5 h-5" />
              Daftar Ahli Sekarang
            </motion.button>
          </motion.div>

          {/* Vision & Mission Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-12">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`bento-card p-10 flex flex-col items-center text-center group transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-turquoise/30' : 'bg-white border-slate-50 hover:border-turquoise/20 border-2'}`}
            >
              <div className="w-12 h-12 bg-turquoise/10 rounded-2xl flex items-center justify-center mb-6 text-turquoise font-black group-hover:scale-110 transition-transform">
                V
              </div>
              <h3 className="text-[10px] font-black text-turquoise uppercase tracking-[0.3em] mb-4">{current.visionTitle}</h3>
              <p className={`text-lg font-bold italic leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                "{current.vision}"
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={`bento-card p-10 flex flex-col items-center text-center group transition-all ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-white font-black group-hover:scale-110 transition-transform">
                M
              </div>
              <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-4">{current.missionTitle}</h3>
              <p className="text-lg font-bold text-white italic leading-relaxed">
                "{current.mission}"
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`pt-24 border-t ${theme === 'dark' ? 'border-slate-900' : 'border-slate-100'}`}>
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-turquoise/10 text-turquoise rounded-full mb-4"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">{current.statsTitle}</span>
          </motion.div>
          <h2 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{current.statsTitle}</h2>
          <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-xs font-bold mt-2 uppercase tracking-wide`}>{current.statsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`bento-card border-none flex flex-col items-center justify-center p-6 transition-colors text-center ${theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}>
            <div className={`w-10 h-10 ${theme === 'dark' ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-white text-slate-400 border border-slate-100'} rounded-xl flex items-center justify-center shadow-sm mb-3`}>
              <Users className="w-5 h-5" />
            </div>
            <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{current.totalApps}</p>
            <p className={`text-2xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{totalAppsCount}</p>
          </div>

          <div className="bento-card border-none bg-turquoise/5 flex flex-col items-center justify-center p-6 hover:bg-turquoise/10 transition-colors text-center">
            <div className="w-10 h-10 bg-turquoise text-white rounded-xl flex items-center justify-center shadow-lg shadow-turquoise/20 mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <p className="text-[8px] font-black text-turquoise-dark uppercase tracking-widest leading-none mb-1">{current.totalVerified}</p>
            <p className="text-2xl font-black text-turquoise tracking-tighter">{verifiedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          {/* Membership Type Breakdown Cards - Individu */}
          <div className={`bento-card border-2 p-6 space-y-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'}`}>
            <div className="flex items-center justify-between">
                <h4 className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{current.individu}</h4>
                <span className="text-[10px] font-black text-turquoise bg-turquoise/10 px-2 py-0.5 rounded-lg">{individuStats.percentage}%</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{individuStats.count}</span>
              <span className={`text-[8px] font-black uppercase pb-1 tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>AHLI</span>
            </div>
            <div className="flex gap-2">
              <div className={`flex-1 p-2 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50/50'}`}>
                <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-1">{current.male}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600">{individuStats.male}</span>
                  <span className="text-[8px] font-bold text-blue-300">{getPercent(individuStats.male, individuStats.count)}</span>
                </div>
              </div>
              <div className={`flex-1 p-2 rounded-xl ${theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-50/50'}`}>
                <p className="text-[7px] font-black text-pink-400 uppercase tracking-widest mb-1">{current.female}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-pink-600">{individuStats.female}</span>
                  <span className="text-[8px] font-bold text-pink-300">{getPercent(individuStats.female, individuStats.count)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Type Breakdown Cards - Remaja */}
          <div className={`bento-card border-2 p-6 space-y-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'}`}>
            <div className="flex items-center justify-between">
                <h4 className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{current.remaja}</h4>
                <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">{remajaStats.percentage}%</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{remajaStats.count}</span>
              <span className={`text-[8px] font-black uppercase pb-1 tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>AHLI</span>
            </div>
            <div className="flex gap-2">
              <div className={`flex-1 p-2 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50/50'}`}>
                <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-1">{current.male}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600">{remajaStats.male}</span>
                  <span className="text-[8px] font-bold text-blue-300">{getPercent(remajaStats.male, remajaStats.count)}</span>
                </div>
              </div>
              <div className={`flex-1 p-2 rounded-xl ${theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-50/50'}`}>
                <p className="text-[7px] font-black text-pink-400 uppercase tracking-widest mb-1">{current.female}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-pink-600">{remajaStats.female}</span>
                  <span className="text-[8px] font-bold text-pink-300">{getPercent(remajaStats.female, remajaStats.count)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Type Breakdown Cards - Kehormat */}
          <div className={`bento-card border-2 p-6 space-y-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'}`}>
            <div className="flex items-center justify-between">
                <h4 className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Ahli Kehormat</h4>
                <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">{kehormatStats.percentage}%</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{kehormatStats.count}</span>
              <span className={`text-[8px] font-black uppercase pb-1 tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>AHLI</span>
            </div>
            <div className="flex gap-2">
              <div className={`flex-1 p-2 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50/50'}`}>
                <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-1">{current.male}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600">{kehormatStats.male}</span>
                  <span className="text-[8px] font-bold text-blue-300">{getPercent(kehormatStats.male, kehormatStats.count)}</span>
                </div>
              </div>
              <div className={`flex-1 p-2 rounded-xl ${theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-50/50'}`}>
                <p className="text-[7px] font-black text-pink-400 uppercase tracking-widest mb-1">{current.female}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-pink-600">{kehormatStats.female}</span>
                  <span className="text-[8px] font-bold text-pink-300">{getPercent(kehormatStats.female, kehormatStats.count)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
);
}
