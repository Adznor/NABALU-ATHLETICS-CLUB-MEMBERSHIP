import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, Trash2, CheckCircle, Grid, List as ListIcon, X, FileText, ImageIcon, CreditCard, Calendar, Edit3, Save, User, Loader2, Download, AlertTriangle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Member, MembershipType, MembershipStatus } from '../types';

const CANCELLATION_REASONS = [
  "Belum membayar yuran keahlian",
  "Tidak membayar yuran tahunan lebih 2 tahun",
  "Berdaftar dengan kelab lain",
  "Melanggar terma dan syarat",
  "Lain-lain"
];

export default function MemberList({ isAdmin = false, lang }: { isAdmin?: boolean, lang: 'bm' | 'en' }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMembershipType, setFilterMembershipType] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedImage, setSelectedImage] = useState<{ src: string, title: string } | null>(null);
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const t = {
    bm: {
      statsTotal: "Jumlah Ahli",
      statsVerified: "Disahkan",
      statsProfile: "Profil Keahlian",
      individu: "Individu",
      remaja: "Remaja",
      searchPlaceholder: "Cari nama atau No. Ahli...",
      allStatus: "Semua Status",
      pending: "Permohonan Baharu",
      verified: "Ahli Berdaftar",
      expired: "Tamat Tempoh",
      cancelled: "Dibatalkan",
      allTypes: "Semua Jenis",
      allGender: "Semua Jantina",
      male: "Lelaki",
      female: "Perempuan",
      newest: "Terbaharu",
      oldest: "Terlama",
      nameAZ: "Nama (A-Z)",
      export: "Eksport CSV",
      headerMember: "Maklumat Ahli",
      headerId: "ID Ahli",
      headerStatus: "Status",
      headerDate: "Tarikh Daftar",
      headerDateVerified: "Tarikh Disahkan",
      headerDateCancelled: "Tarikh Dibatalkan",
      headerExpiry: "Tarikh Tamat Tempoh",
      headerMedia: "Media",
      headerAction: "Aksi",
      noAhli: "No. Ahli",
      namaPenuh: "Nama Penuh",
      icNumber: "No. KP/MyKid",
      membershipId: "Jenis Keahlian",
      tarikhDaftar: "Tarikh Daftar",
      cancelReason: "Sebab",
      viewReceipt: "Lihat Resit",
      updateProfile: "Kemaskini Profil Ahli",
      cancelMember: "Batal Keahlian",
      deleteConfirm: "Adakah anda pasti mahu membuang ahli ini? Tindakan ini tidak boleh diubah.",
      save: "Simpan Perubahan",
      cancel: "Batal",
      loadingText: "Memuat Naik Senarai Ahli...",
      noMembers: "Tiada ahli ditemui.",
    },
    en: {
      statsTotal: "Total Members",
      statsVerified: "Verified",
      statsProfile: "Membership Profile",
      individu: "Individual",
      remaja: "Youth",
      searchPlaceholder: "Search name or Member ID...",
      allStatus: "All Status",
      pending: "New Application",
      verified: "Registered Member",
      expired: "Expired",
      cancelled: "Cancelled",
      allTypes: "All Types",
      allGender: "All Gender",
      male: "Male",
      female: "Female",
      newest: "Newest",
      oldest: "Oldest",
      nameAZ: "Name (A-Z)",
      export: "Export CSV",
      headerMember: "Member Info",
      headerId: "Member ID",
      headerStatus: "Status",
      headerDate: "Registration Date",
      headerDateVerified: "Verified Date",
      headerDateCancelled: "Cancelled Date",
      headerExpiry: "Expiry Date",
      headerMedia: "Media",
      headerAction: "Action",
      noAhli: "Member ID",
      namaPenuh: "Full Name",
      icNumber: "ID Number",
      membershipId: "Membership Type",
      tarikhDaftar: "Reg Date",
      cancelReason: "Reason",
      viewReceipt: "View Receipt",
      updateProfile: "Update Member Profile",
      cancelMember: "Cancel Membership",
      deleteConfirm: "Are you sure you want to delete this member? This action cannot be undone.",
      save: "Save Changes",
      cancel: "Cancel",
      loadingText: "Loading Members List...",
      noMembers: "No members found.",
    }
  };

  const current = t[lang];

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberList: Member[] = [];
      const now = new Date();
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Member;
        const id = docSnap.id;
        
        // Auto Expiry Logic (Client-side derivation + background update for Admin)
        let currentStatus = data.status;
        if (data.status === 'verified' && data.expiryDate) {
          const expDate = data.expiryDate.toDate ? data.expiryDate.toDate() : new Date(data.expiryDate);
          if (expDate < now) {
            currentStatus = 'expired';
            // Only Admin triggers the actual DB update to minimize writes
            if (isAdmin) {
              updateDoc(doc(db, 'members', id), { status: 'expired' }).catch(console.error);
            }
          }
        }
        
        memberList.push({ id, ...data, status: currentStatus } as Member);
      });
      setMembers(memberList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const stats = {
    total: members.length,
    verified: members.filter(m => m.status === 'verified').length,
    pending: members.filter(m => m.status === 'pending').length,
    ahliRemaja: members.filter(m => m.membershipType === 'Ahli Remaja').length,
    ahliIndividu: members.filter(m => m.membershipType === 'Ahli Individu').length,
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (m.membershipId && m.membershipId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' ? (isAdmin ? true : m.status !== 'cancelled') : m.status === filterStatus;
    const matchesMembership = filterMembershipType === 'all' || m.membershipType === filterMembershipType;
    const matchesGender = filterGender === 'all' || m.gender === filterGender;
    const isNotCancelledForPublic = isAdmin || m.status !== 'cancelled';

    return matchesSearch && matchesStatus && matchesMembership && matchesGender && isNotCancelledForPublic;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.fullName.localeCompare(b.fullName);
    } else if (sortBy === 'oldest') {
      const dateA = a.createdAt?.toMillis() || 0;
      const dateB = b.createdAt?.toMillis() || 0;
      return dateA - dateB;
    } else {
      // Default newest
      const dateA = a.createdAt?.toMillis() || 0;
      const dateB = b.createdAt?.toMillis() || 0;
      return dateB - dateA;
    }
  });

  const exportToCSV = () => {
    const headers = [
      'No. Ahli', 'Nama Penuh', 'No. KP/MyKid', 'Jenis Keahlian', 
      'Jantina', 'Tarikh Lahir', 'Alamat', 'No. Telefon', 
      'Email', 'Nama Penjaga', 'No. Tel Penjaga', 'Status', 'Tarikh Daftar'
    ];

    const rows = filteredMembers.map(m => [
      m.membershipId,
      `"${m.fullName.replace(/"/g, '""')}"`,
      m.icNumber,
      m.membershipType,
      m.gender,
      m.dob,
      `"${m.address.replace(/"/g, '""')}"`,
      m.phone,
      m.email,
      m.guardianName ? `"${m.guardianName.replace(/"/g, '""')}"` : '-',
      m.guardianPhone || '-',
      m.status === 'verified' ? 'Disahkan' : 'Menunggu',
      m.createdAt ? format(m.createdAt.toDate(), 'dd/MM/yyyy') : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Senarai_Ahli_NAC_${format(new Date(), 'ddMMyyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!deletingMember?.id) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'members', deletingMember.id));
      setDeletingMember(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `members/${deletingMember.id}`);
      alert("Gagal membuang ahli.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const counterDocRef = doc(db, 'counters', 'members');
        const counterDoc = await transaction.get(counterDocRef);
        
        let newCount = 1;
        if (counterDoc.exists()) {
          newCount = (counterDoc.data().count || 0) + 1;
        }
        
        const membershipId = `NAC${String(newCount).padStart(3, '0')}`;
        
        // Membership standard: 1 year from now
        const now = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(now.getFullYear() + 1);

        transaction.update(doc(db, 'members', id), { 
          status: 'verified',
          membershipId,
          membershipNumber: newCount,
          verifiedAt: serverTimestamp(),
          expiryDate: expiryDate,
          cancellationReason: null 
        });
        
        transaction.set(counterDocRef, { count: newCount }, { merge: true });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${id}`);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.id) return;

    setIsUpdating(true);
    try {
      const originalMember = members.find(m => m.id === editingMember.id);
      const isStatusChanged = originalMember?.status !== editingMember.status;
      
      const { id, ...updateData } = editingMember;

      if (isStatusChanged && editingMember.status === 'verified' && !editingMember.membershipId) {
        // Use handleVerify logic for first-time verification to ensure unique ID
        await handleVerify(id);
      } else {
        // Standard update
        const finalData = { ...updateData };
        if (isStatusChanged) {
          if (editingMember.status === 'cancelled') finalData.cancelledAt = serverTimestamp();
          if (editingMember.status === 'verified' && !editingMember.verifiedAt) finalData.verifiedAt = serverTimestamp();
        }
        await updateDoc(doc(db, 'members', id), finalData);
      }
      
      setEditingMember(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${editingMember.id}`);
      alert("Gagal mengemaskini maklumat ahli.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-turquoise border-t-transparent rounded-full mb-4"
        />
        <p className="text-slate-400 font-black tracking-widest text-[10px] uppercase">{current.loadingText}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={current.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-teal-50 rounded-2xl shadow-sm focus:ring-2 focus:ring-turquoise text-sm outline-none transition-all"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-teal-50 rounded-2xl shadow-sm px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <option value="all">{current.allStatus}</option>
            <option value="pending">{current.pending}</option>
            <option value="verified">{current.verified}</option>
            <option value="expired">{current.expired}</option>
            {isAdmin && <option value="cancelled">{current.cancelled}</option>}
          </select>

          <select 
            value={filterMembershipType}
            onChange={(e) => setFilterMembershipType(e.target.value)}
            className="bg-white border border-teal-50 rounded-2xl shadow-sm px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <option value="all">{current.allTypes}</option>
            <option value="Ahli Individu">{lang === 'bm' ? 'Ahli Individu' : 'Individual Member'}</option>
            <option value="Ahli Remaja">{lang === 'bm' ? 'Ahli Remaja' : 'Youth Member'}</option>
          </select>

          <select 
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="bg-white border border-teal-50 rounded-2xl shadow-sm px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <option value="all">{current.allGender}</option>
            <option value="Lelaki">{current.male}</option>
            <option value="Perempuan">{current.female}</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-teal-50 rounded-2xl shadow-sm px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <option value="newest">{current.newest}</option>
            <option value="oldest">{current.oldest}</option>
            <option value="name">{current.nameAZ}</option>
          </select>

          {isAdmin && (
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-white border border-teal-50 rounded-2xl shadow-sm px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-turquoise hover:bg-turquoise hover:text-white transition-all group"
            >
              <Download className="w-4 h-4 group-hover:animate-bounce" />
              {current.export}
            </button>
          )}
          
          <div className="bg-white rounded-2xl shadow-sm p-1 flex gap-1 border border-teal-50">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-turquoise text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-turquoise text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bento-card !p-0 overflow-hidden overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-teal-50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{current.headerMember}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{current.headerId}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{current.headerStatus}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{current.headerDate}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center font-mono">{current.headerExpiry}</th>
                {isAdmin && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{current.headerAction}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((member) => (
                <tr 
                  key={member.id} 
                  className={`transition-colors group cursor-pointer ${isAdmin ? 'hover:bg-turquoise/5' : 'hover:bg-slate-50'}`}
                  onClick={() => !isAdmin && setSelectedMemberForDetail(member)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0"
                      >
                        {member.photoBase64 ? (
                          <img src={member.photoBase64} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-turquoise text-xs">
                            {member.fullName.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{member.fullName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.membershipType}</p>
                          {member.isOku && <span className="bg-purple-100 text-purple-600 text-[8px] font-black px-1 rounded">OKU</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {member.membershipId ? (
                      <span className="text-[10px] font-black font-mono bg-turquoise text-white px-2 py-1 rounded inline-block shadow-sm shadow-turquoise/20">{member.membershipId}</span>
                    ) : (
                      <span className="text-[8px] font-black italic text-slate-300 uppercase tracking-widest">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`text-[9px] font-black uppercase px-3 py-1 rounded-full inline-block ${
                      member.status === 'verified' ? 'bg-teal-100 text-teal-600' : 
                      member.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      member.status === 'expired' ? 'bg-slate-200 text-slate-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {member.status === 'verified' ? current.verified.toUpperCase() : 
                       member.status === 'cancelled' ? current.cancelled.toUpperCase() : 
                       member.status === 'expired' ? current.expired.toUpperCase() :
                       current.pending.toUpperCase()}
                    </div>
                    {member.status === 'cancelled' && member.cancellationReason && (
                      <p className="text-[8px] font-bold text-red-400 mt-1 max-w-[120px] truncate" title={member.cancellationReason}>
                        {current.cancelReason}: {member.cancellationReason}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col gap-1 items-center">
                       <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                        {member.createdAt ? format(member.createdAt.toDate(), 'dd/MM/yyyy') : '-'}
                      </span>
                      {isAdmin && member.verifiedAt && (
                        <span className="text-[8px] font-bold text-teal-400 uppercase tracking-widest">
                          OK: {format(member.verifiedAt.toDate(), 'dd/MM/yyyy')}
                        </span>
                      )}
                      {isAdmin && member.cancelledAt && (
                        <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">
                          X: {format(member.cancelledAt.toDate(), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-black text-slate-400">
                      {member.expiryDate ? format(member.expiryDate.toDate ? member.expiryDate.toDate() : member.expiryDate, 'dd/MM/yyyy') : '-'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setEditingMember(member)}
                          className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          title="Kemaskini"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {member.status === 'pending' && (
                          <button 
                            onClick={() => handleVerify(member.id!)}
                            className="w-8 h-8 rounded bg-teal-100 text-teal-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                            title="Sahkan"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => setDeletingMember(member)}
                          className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          title="Padam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredMembers.map((member) => (
            <motion.div 
              layout
              key={member.id}
              onClick={() => !isAdmin && setSelectedMemberForDetail(member)}
              className={`bento-card group flex flex-col items-center text-center transition-all cursor-pointer border-white/50 backdrop-blur-md shadow-lg hover:shadow-xl ${
                member.membershipType === 'Ahli Remaja' 
                ? 'bg-gradient-to-br from-white via-white to-green-100/50' 
                : 'bg-gradient-to-br from-white via-white to-slate-200/50'
              }`}
            >
              <div 
                className="w-20 h-20 rounded-[2rem] overflow-hidden bg-white mb-4 group-hover:scale-105 transition-transform shadow-md border-4 border-white/80"
              >
                {member.photoBase64 ? (
                  <img src={member.photoBase64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-turquoise text-xl">
                    {member.fullName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <h4 className="font-black text-slate-800 text-sm mb-1 leading-tight line-clamp-1">{member.fullName}</h4>
              <p className="text-[10px] font-black font-mono text-turquoise mb-4 uppercase tracking-wider">{member.membershipId || 'Permohonan'}</p>
              
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                     member.status === 'verified' ? 'bg-teal-100 text-teal-600' : 
                     member.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                     member.status === 'expired' ? 'bg-slate-200 text-slate-600' :
                     'bg-orange-100 text-orange-600'
                  }`}>
                    {member.status === 'verified' ? current.verified.toUpperCase() : 
                     member.status === 'cancelled' ? current.cancelled.toUpperCase() : 
                     member.status === 'expired' ? current.expired.toUpperCase() :
                     current.pending.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 bg-white/50 text-slate-400 rounded text-[8px] font-black uppercase tracking-widest border border-slate-100 shadow-sm">
                    {member.membershipType}
                  </span>
                  {member.isOku && <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-[8px] font-black uppercase tracking-widest shadow-sm">OKU</span>}
                </div>
              
              {isAdmin && member.status === 'cancelled' && member.cancellationReason && (
                <div className="mb-4 p-2 bg-red-50 rounded-lg w-full">
                  <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Sebab Batal</p>
                  <p className="text-[10px] font-bold text-red-600 line-clamp-2">{member.cancellationReason}</p>
                </div>
              )}

              <div className="mb-4">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Tarikh Daftar</p>
                <p className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                  {member.createdAt ? format(member.createdAt.toDate(), 'dd/MM/yyyy') : '-'}
                </p>
              </div>

              {isAdmin && (
                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between w-full" onClick={e => e.stopPropagation()}>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Aksi:</p>
                  <div className="flex gap-2">
                    <div 
                      onClick={() => setEditingMember(member)}
                      className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] cursor-pointer hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                    >
                      ✎
                    </div>
                    {member.status === 'pending' && (
                      <div 
                        onClick={() => handleVerify(member.id!)}
                        className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-[10px] cursor-pointer hover:bg-teal-500 hover:text-white transition-all shadow-sm"
                      >
                        ✓
                      </div>
                    )}
                    <div 
                      onClick={() => setDeletingMember(member)}
                      className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-[10px] cursor-pointer hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      ×
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="text-center py-24 bg-white/50 rounded-[2rem] border border-dashed border-teal-100 mt-4">
          <Users className="w-12 h-12 text-teal-100 mx-auto mb-4" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{current.noMembers}</p>
        </div>
      )}

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] overflow-hidden max-w-2xl w-full relative p-2"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-50">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">{selectedImage.title}</h3>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="aspect-video sm:aspect-auto sm:max-h-[70vh] overflow-hidden flex items-center justify-center bg-slate-50 rounded-[1.5rem] m-2">
                <img src={selectedImage.src} alt="Viewing" className="max-w-full max-h-full object-contain" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {editingMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto"
            onClick={() => setEditingMember(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl relative my-8 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-white p-6 border-b border-slate-50 flex items-center justify-between rounded-t-[2rem]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">{current.updateProfile}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{editingMember.membershipId || 'Permohonan Baharu'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingMember(null)}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateMember} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="md:col-span-2">
                    <label className="label-bento">Nama Penuh</label>
                    <input 
                      type="text" 
                      value={editingMember.fullName}
                      onChange={(e) => setEditingMember({...editingMember, fullName: e.target.value})}
                      className="input-bento font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-bento">No. KP / MyKid</label>
                    <input 
                      type="text" 
                      value={editingMember.icNumber}
                      onChange={(e) => setEditingMember({...editingMember, icNumber: e.target.value})}
                      className="input-bento"
                      required
                    />
                  </div>
                      <div>
                        <label className="label-bento">Jenis Keahlian</label>
                        <select 
                          value={editingMember.membershipType}
                          onChange={(e) => setEditingMember({...editingMember, membershipType: e.target.value as MembershipType})}
                          className="input-bento font-bold"
                        >
                          <option value="Ahli Individu">Ahli Individu</option>
                          <option value="Ahli Remaja">Ahli Remaja</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end pb-2">
                        <label className="label-bento mb-2">Status OKU</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingMember({...editingMember, isOku: true})}
                            className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all ${editingMember.isOku ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-50 text-slate-400'}`}
                          >
                            YA
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMember({...editingMember, isOku: false})}
                            className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all ${!editingMember.isOku ? 'border-turquoise bg-turquoise/5 text-turquoise' : 'border-slate-50 text-slate-400'}`}
                          >
                            TIDAK
                          </button>
                        </div>
                      </div>

                   <div>
                    <label className="label-bento">Status Keahlian</label>
                    <select 
                      value={editingMember.status}
                      onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MembershipStatus})}
                      className="input-bento font-black text-turquoise uppercase"
                    >
                      <option value="pending">{current.pending}</option>
                      <option value="verified">{current.verified}</option>
                      <option value="expired">{current.expired}</option>
                      <option value="cancelled">{current.cancelled}</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-bento">Tarikh Tamat Tempoh</label>
                    <div className="flex gap-2">
                       <input 
                        type="date" 
                        value={editingMember.expiryDate ? (editingMember.expiryDate.toDate ? format(editingMember.expiryDate.toDate(), 'yyyy-MM-dd') : format(new Date(editingMember.expiryDate), 'yyyy-MM-dd')) : ''}
                        onChange={(e) => setEditingMember({...editingMember, expiryDate: new Date(e.target.value)})}
                        className="input-bento flex-grow font-bold"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const yearFromNow = new Date();
                          yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
                          setEditingMember({...editingMember, expiryDate: yearFromNow});
                        }}
                        className="p-3 bg-teal-50 text-teal-600 rounded-2xl hover:bg-teal-100 transition-colors"
                        title="1 Tahun dari sekarang"
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {editingMember.status === 'cancelled' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="md:col-span-2 p-6 bg-red-50 rounded-2xl border border-red-100"
                    >
                      <label className="label-bento !text-red-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Sebab Pembatalan
                      </label>
                      <select 
                        value={CANCELLATION_REASONS.includes(editingMember.cancellationReason || '') ? editingMember.cancellationReason : 'Lain-lain'}
                        onChange={(e) => setEditingMember({...editingMember, cancellationReason: e.target.value === 'Lain-lain' ? '' : e.target.value})}
                        className="input-bento bg-white focus:ring-red-400 mb-3"
                      >
                        {CANCELLATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {(!CANCELLATION_REASONS.includes(editingMember.cancellationReason || '') || editingMember.cancellationReason === 'Lain-lain') && (
                        <textarea 
                          placeholder="Nyatakan sebab..."
                          className="input-bento bg-white focus:ring-red-400 min-h-[80px]"
                          value={editingMember.cancellationReason || ''}
                          onChange={(e) => setEditingMember({...editingMember, cancellationReason: e.target.value})}
                        />
                      )}
                    </motion.div>
                  )}

                  <div>
                    <label className="label-bento">No. Telefon</label>
                    <input 
                      type="text" 
                      value={editingMember.phone}
                      onChange={(e) => setEditingMember({...editingMember, phone: e.target.value})}
                      className="input-bento"
                    />
                  </div>
                  <div>
                    <label className="label-bento">Email</label>
                    <input 
                      type="email" 
                      value={editingMember.email}
                      onChange={(e) => setEditingMember({...editingMember, email: e.target.value})}
                      className="input-bento"
                    />
                  </div>
                  <div>
                    <label className="label-bento">Tarikh Lahir</label>
                    <input 
                      type="date" 
                      value={editingMember.dob}
                      onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})}
                      className="input-bento"
                    />
                  </div>
                  <div>
                    <label className="label-bento">Jantina</label>
                    <select 
                      value={editingMember.gender}
                      onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as any})}
                      className="input-bento"
                    >
                      <option value="Lelaki">Lelaki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label-bento">Alamat Tetap</label>
                    <textarea 
                      value={editingMember.address}
                      onChange={(e) => setEditingMember({...editingMember, address: e.target.value})}
                      className="input-bento min-h-[80px]"
                    />
                  </div>
                  
                  {editingMember.membershipType === 'Ahli Remaja' && (
                    <>
                      <div className="md:col-span-2 border-t border-slate-50 pt-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Maklumat Penjaga</p>
                      </div>
                      <div>
                        <label className="label-bento">Nama Penjaga</label>
                        <input 
                          type="text" 
                          value={editingMember.guardianName || ''}
                          onChange={(e) => setEditingMember({...editingMember, guardianName: e.target.value})}
                          className="input-bento"
                        />
                      </div>
                      <div>
                        <label className="label-bento">No. Telefon Penjaga</label>
                        <input 
                          type="text" 
                          value={editingMember.guardianPhone || ''}
                          onChange={(e) => setEditingMember({...editingMember, guardianPhone: e.target.value})}
                          className="input-bento"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white py-4 border-t border-slate-50">
                  <button 
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="flex-1 px-6 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all text-center"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="flex-[2] bg-turquoise text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-turquoise/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Detail Popup (Public) */}
      <AnimatePresence>
        {selectedMemberForDetail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setSelectedMemberForDetail(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className={`w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-white/50 ${
                selectedMemberForDetail.membershipType === 'Ahli Remaja' 
                ? 'bg-gradient-to-br from-white via-white to-green-50' 
                : 'bg-gradient-to-br from-white via-white to-slate-100'
              }`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header Close */}
              <button 
                onClick={() => setSelectedMemberForDetail(null)}
                className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center text-slate-400 hover:text-turquoise transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  {/* Large Photo */}
                  <div className="w-56 h-56 md:w-64 md:h-64 rounded-[2.5rem] overflow-hidden bg-slate-50 shadow-xl border-8 border-white flex-shrink-0">
                    {selectedMemberForDetail.photoBase64 ? (
                      <img src={selectedMemberForDetail.photoBase64} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-turquoise text-6xl">
                        {selectedMemberForDetail.fullName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-grow text-center md:text-left pt-4">
                    <span className="px-3 py-1 bg-white/80 border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm mb-4 inline-block">
                      {selectedMemberForDetail.membershipType}
                    </span>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2 leading-none">
                      {selectedMemberForDetail.fullName}
                      {selectedMemberForDetail.isOku && <span className="ml-3 inline-block bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-lg border border-purple-200 align-middle">OKU</span>}
                    </h2>
                    
                    <div className="bg-turquoise text-white inline-block px-8 py-5 rounded-[2rem] shadow-2xl shadow-turquoise/30 mt-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">{current.headerId}</p>
                      <p className="text-4xl md:text-6xl font-black font-mono leading-none tracking-tighter">
                        {selectedMemberForDetail.membershipId || 'PENDING'}
                      </p>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/50 rounded-2xl border border-white/50">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{current.headerStatus}</p>
                         <p className={`text-xs font-black uppercase ${
                           selectedMemberForDetail.status === 'verified' ? 'text-teal-500' : 
                           selectedMemberForDetail.status === 'expired' ? 'text-slate-400' :
                           selectedMemberForDetail.status === 'cancelled' ? 'text-red-500' :
                           'text-orange-500'
                         }`}>
                           {selectedMemberForDetail.status === 'verified' ? current.verified : 
                            selectedMemberForDetail.status === 'expired' ? current.expired : 
                            selectedMemberForDetail.status === 'cancelled' ? current.cancelled : 
                            current.pending}
                         </p>
                      </div>
                      <div className="p-4 bg-white/50 rounded-2xl border border-white/50">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Jantina</p>
                        <p className="text-xs font-black text-slate-700 uppercase">{lang === 'bm' ? selectedMemberForDetail.gender : (selectedMemberForDetail.gender === 'Lelaki' ? 'Male' : 'Female')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200/30 flex flex-wrap gap-x-12 gap-y-6 justify-center md:justify-start">
                   <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{current.headerDate}</p>
                    <p className="text-sm font-bold text-slate-600">
                      {selectedMemberForDetail.createdAt ? format(selectedMemberForDetail.createdAt.toDate(), 'dd/MMMM/yyyy') : '-'}
                    </p>
                  </div>
                  {selectedMemberForDetail.expiryDate && (
                    <div>
                      <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">{current.headerExpiry}</p>
                      <p className="text-sm font-black text-slate-800">
                        {format(selectedMemberForDetail.expiryDate.toDate ? selectedMemberForDetail.expiryDate.toDate() : selectedMemberForDetail.expiryDate, 'dd/MMMM/yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Graphic Element */}
              <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-turquoise/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setDeletingMember(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-8 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Buang Ahli?</h3>
              <p className="text-slate-500 text-xs mb-8 font-medium leading-relaxed">
                {current.deleteConfirm}
                <br />
                <span className="font-black text-red-600 mt-2 block">{deletingMember.fullName}</span>
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingMember(null)}
                  className="flex-1 px-6 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Ya, Buang
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
