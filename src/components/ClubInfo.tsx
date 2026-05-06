import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Globe, Users, User, Users2, TrendingUp, BarChart3 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Member } from '../types';

export default function ClubInfo({ settings, lang, setLang }: { settings: any, lang: 'bm' | 'en', setLang: (l: 'bm' | 'en') => void }) {
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

  const content = {
    bm: {
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
    },
    en: {
      clubName: settings?.clubNameEn || settings?.clubName || "Nabalu Athletics Club",
      missionTitle: "Our Mission",
      visionTitle: "Our Vision",
      mission: settings?.missionEn || settings?.mission || "Producing high-competitive athletics champions at the international level.",
      vision: settings?.visionEn || settings?.vision || "To be the most innovative athletics excellence center in Borneo.",
      statsTitle: "Membership Statistics",
      statsSubtitle: "Latest club membership data analysis",
      totalApps: "Total Applications",
      totalVerified: "Registered Members",
      individu: "Individual Members",
      remaja: "Youth Members",
      male: "Male",
      female: "Female",
      ratio: "Gender Ratio",
    }
  };

  const current = content[lang];

  // Stats Logic
  const registered = members.filter(m => m.status === 'verified');
  const totalAppsCount = members.length;
  const verifiedCount = registered.length;

  const individu = registered.filter(m => m.membershipType === 'Ahli Individu');
  const remaja = registered.filter(m => m.membershipType === 'Ahli Remaja');
  const totalOku = registered.filter(m => m.isOku);

  const individuStats = {
    count: individu.length,
    male: individu.filter(m => m.gender === 'Lelaki').length,
    female: individu.filter(m => m.gender === 'Perempuan').length,
    oku: individu.filter(m => m.isOku).length,
    percentage: verifiedCount > 0 ? (individu.length / verifiedCount * 100).toFixed(1) : '0'
  };

  const remajaStats = {
    count: remaja.length,
    male: remaja.filter(m => m.gender === 'Lelaki').length,
    female: remaja.filter(m => m.gender === 'Perempuan').length,
    oku: remaja.filter(m => m.isOku).length,
    percentage: verifiedCount > 0 ? (remaja.length / verifiedCount * 100).toFixed(1) : '0'
  };

  const getPercent = (count: number, total: number) => {
    if (total === 0) return '0%';
    return (count / total * 100).toFixed(1) + '%';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-24">
      {/* ... (Hero section remains mostly same) ... */}
      <section className="space-y-12">
        <div className="flex justify-center">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
            <button 
              onClick={() => setLang('bm')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'bm' ? 'bg-white text-turquoise shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              BM
            </button>
            <button 
              onClick={() => setLang('en')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'en' ? 'bg-white text-turquoise shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-12">
          {/* Large Logo Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group"
          >
            <div className="absolute -inset-4 bg-turquoise/20 rounded-[4rem] blur-2xl group-hover:bg-turquoise/30 transition-all duration-700 opacity-50" />
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-[3.5rem] bg-white shadow-2xl flex items-center justify-center border border-slate-100 overflow-hidden transform group-hover:scale-[1.02] transition-transform duration-500">
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
            key={`name-${lang}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 mb-2 italic">
              {current.clubName}
            </h1>
            <div className="h-2 w-24 bg-turquoise mx-auto rounded-full" />
          </motion.div>

          {/* Vision & Mission Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
            <motion.div 
              key={`vision-${lang}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bento-card border-2 border-slate-50 p-10 flex flex-col items-center text-center group hover:border-turquoise/20 transition-all"
            >
              <div className="w-12 h-12 bg-turquoise/10 rounded-2xl flex items-center justify-center mb-6 text-turquoise font-black group-hover:scale-110 transition-transform">
                V
              </div>
              <h3 className="text-[10px] font-black text-turquoise uppercase tracking-[0.3em] mb-4">{current.visionTitle}</h3>
              <p className="text-lg font-bold text-slate-700 italic leading-relaxed">
                "{current.vision}"
              </p>
            </motion.div>

            <motion.div 
              key={`mission-${lang}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bento-card bg-slate-900 p-10 flex flex-col items-center text-center group hover:bg-slate-800 transition-all"
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
      <section className="pt-24 border-t border-slate-100">
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
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{current.statsTitle}</h2>
          <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-wide">{current.statsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bento-card border-none bg-slate-50 flex items-center gap-4 p-5 hover:bg-slate-100 transition-colors">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{current.totalApps}</p>
              <p className="text-xl font-black text-slate-800 tracking-tighter">{totalAppsCount}</p>
            </div>
          </div>

          <div className="bento-card border-none bg-turquoise/5 flex items-center gap-4 p-5 hover:bg-turquoise/10 transition-colors">
            <div className="w-10 h-10 bg-turquoise text-white rounded-xl flex items-center justify-center shadow-lg shadow-turquoise/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[8px] font-black text-turquoise-dark uppercase tracking-widest leading-none mb-1">{current.totalVerified}</p>
              <p className="text-xl font-black text-turquoise tracking-tighter">{verifiedCount}</p>
            </div>
          </div>

          <div className="bento-card border-none bg-purple-50 flex items-center gap-4 p-5 hover:bg-purple-100/50 transition-colors">
            <div className="w-10 h-10 bg-purple-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[8px] font-black text-purple-600 uppercase tracking-widest leading-none mb-1">JUMLAH OKU</p>
              <p className="text-xl font-black text-purple-700 tracking-tighter">{totalOku.length}</p>
            </div>
          </div>

          {/* Membership Type Breakdown Cards - Individu */}
          <div className="bento-card border-2 border-slate-50 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{current.individu}</h4>
                <span className="text-[10px] font-black text-turquoise bg-turquoise/10 px-2 py-0.5 rounded-lg">{individuStats.percentage}%</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-slate-800">{individuStats.count}</span>
              <span className="text-[8px] font-black text-slate-300 uppercase pb-1 tracking-widest">AHLI</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-blue-50/50 p-2 rounded-xl">
                <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-1">{current.male}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600">{individuStats.male}</span>
                  <span className="text-[8px] font-bold text-blue-300">{getPercent(individuStats.male, individuStats.count)}</span>
                </div>
              </div>
              <div className="flex-1 bg-pink-50/50 p-2 rounded-xl">
                <p className="text-[7px] font-black text-pink-400 uppercase tracking-widest mb-1">{current.female}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-pink-600">{individuStats.female}</span>
                  <span className="text-[8px] font-bold text-pink-300">{getPercent(individuStats.female, individuStats.count)}</span>
                </div>
              </div>
              <div className="flex-1 bg-purple-50/50 p-2 rounded-xl">
                <p className="text-[7px] font-black text-purple-400 uppercase tracking-widest mb-1">OKU</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-600">{individuStats.oku}</span>
                  <span className="text-[8px] font-bold text-purple-300">{getPercent(individuStats.oku, individuStats.count)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Type Breakdown Cards - Remaja */}
          <div className="bento-card border-2 border-slate-50 col-span-1 md:col-span-2 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{current.remaja}</h4>
                <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">{remajaStats.percentage}%</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-slate-800">{remajaStats.count}</span>
              <span className="text-[8px] font-black text-slate-300 uppercase pb-1 tracking-widest">AHLI</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-blue-50/50 p-2 rounded-xl">
                <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-1">{current.male}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600">{remajaStats.male}</span>
                  <span className="text-[8px] font-bold text-blue-300">{getPercent(remajaStats.male, remajaStats.count)}</span>
                </div>
              </div>
              <div className="flex-1 bg-pink-50/50 p-2 rounded-xl">
                <p className="text-[7px] font-black text-pink-400 uppercase tracking-widest mb-1">{current.female}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-pink-600">{remajaStats.female}</span>
                  <span className="text-[8px] font-bold text-pink-300">{getPercent(remajaStats.female, remajaStats.count)}</span>
                </div>
              </div>
              <div className="flex-1 bg-purple-50/50 p-2 rounded-xl">
                <p className="text-[7px] font-black text-purple-400 uppercase tracking-widest mb-1">OKU</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-600">{remajaStats.oku}</span>
                  <span className="text-[8px] font-bold text-purple-300">{getPercent(remajaStats.oku, remajaStats.count)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
