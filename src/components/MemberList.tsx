import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, logActivity } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, runTransaction, serverTimestamp, where, limit, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, Trash2, CheckCircle, Grid, List as ListIcon, X, FileText, ImageIcon, CreditCard, Calendar, Edit3, Save, User, Loader2, Download, AlertTriangle, MessageSquare, Clock, IdCard, Share2, ShieldCheck, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Member, MembershipType, MembershipStatus, LogEntry } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const CANCELLATION_REASONS = [
  "Belum membayar yuran keahlian",
  "Tidak membayar yuran tahunan lebih 2 tahun",
  "Berdaftar dengan kelab lain",
  "Melanggar terma dan syarat",
  "Lain-lain"
];

export default function MemberList({ 
  isAdmin = false, 
  theme,
  settings,
  searchTerm: externalSearchTerm,
  onSearchTermChange
}: { 
  isAdmin?: boolean, 
  theme: 'light' | 'dark',
  settings?: any,
  searchTerm?: string,
  onSearchTermChange?: (val: string) => void
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = onSearchTermChange || setInternalSearchTerm;

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
  const [isEmailRegistered, setIsEmailRegistered] = useState<boolean | null>(null);

  const checkEmailRegistration = async (email: string) => {
    if (!isAdmin || !email) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
      const snap = await getDocs(q);
      setIsEmailRegistered(!snap.empty);
    } catch (err) {
      console.error("Check email failed:", err);
      setIsEmailRegistered(null);
    }
  };

  useEffect(() => {
    if (selectedMemberForDetail?.email) {
      checkEmailRegistration(selectedMemberForDetail.email);
    } else {
      setIsEmailRegistered(null);
    }
  }, [selectedMemberForDetail, isAdmin]);

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

  const exportToPDF = (member: Member) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(20, 184, 166); // Turquoise
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BORANG KEAHLIAN NAC', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('NOMBOR AHLI: ' + (member.membershipId || 'PENDING'), 105, 30, { align: 'center' });
    
    // Member Info Section
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text('MAKLUMAT PERIBADI', 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 58, 190, 58);
    
    const personalInfo = [
      ['Nama Penuh', (member.fullName || '').toUpperCase()],
      ['No. Kad Pengenalan', (member.icNumber || '').toUpperCase()],
      ['Tarikh Lahir', (member.dob || '').toUpperCase()],
      ['Jantina', (member.gender || '').toUpperCase()],
      ['Jenis Keahlian', (member.membershipType || '').toUpperCase()],
      ['No. Telefon', (member.phone || '').toUpperCase()],
      ['Emel', member.email],
      ['Alamat', (member.address || '').toUpperCase()]
    ];
    
    autoTable(doc, {
      startY: 65,
      head: [],
      body: personalInfo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Guardian Info (if youth)
    if (member.membershipType === 'Ahli Remaja') {
      doc.setFontSize(14);
      doc.text('MAKLUMAT PENJAGA', 20, finalY);
      doc.line(20, finalY + 3, 190, finalY + 3);
      
      const guardianInfo = [
        ['Nama Penjaga', (member.guardianName || '-').toUpperCase()],
        ['No. Telefon Penjaga', (member.guardianPhone || '-').toUpperCase()]
      ];
      
      autoTable(doc, {
        startY: finalY + 8,
        head: [],
        body: guardianInfo,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
      });
      
      finalY = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Payment Info
    doc.setFontSize(14);
    doc.text('STATUS KEAHLIAN & YURAN', 20, finalY);
    doc.line(20, finalY + 3, 190, finalY + 3);
    
    const currentYear = new Date().getFullYear();
    const isPaidCurrent = member.annualPayments?.some(p => p.year === currentYear && p.paid);
    
    const paymentInfo = [
      ['Status Keahlian', member.status.toUpperCase()],
      ['Tarikh Pendaftaran', member.createdAt ? format(member.createdAt.toDate(), 'dd/MM/yyyy') : '-'],
      ['Yuran Pendaftaran', member.registrationFeePaid ? 'TELAH DIBAYAR' : 'BELUM DIBAYAR'],
      [`Yuran Tahunan (${currentYear})`, isPaidCurrent ? 'TELAH DIBAYAR' : 'BELUM DIBAYAR']
    ];
    
    autoTable(doc, {
      startY: finalY + 8,
      head: [],
      body: paymentInfo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Dokumen ini dijana secara digital pada ' + format(new Date(), 'dd/MM/yyyy HH:mm'), 105, 285, { align: 'center' });
    }
    
    doc.save(`Borang_Keahlian_${member.fullName.replace(/\s+/g, '_')}.pdf`);
  };

  const exportMembershipCard = async (member: Member) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54] // Standard ID card size (CR80)
    });

    // Background color
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 85.6, 54, 'F');

    // Accent bar
    doc.setFillColor(45, 212, 191); // turquoise-400
    doc.rect(0, 0, 85.6, 8, 'F');

    // Logo on card
    if (settings?.logoBase64) {
      try {
        doc.addImage(settings.logoBase64, 'JPEG', 5, 1.5, 5, 5);
      } catch (e) {
        console.error("PDF logo error:", e);
      }
    }

    // Header text
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('NABALU ATHLETICS CLUB', 42.8, 5.5, { align: 'center' });

    // Photo
    if (member.photoBase64) {
      try {
        // Try to handle photoBase64 if it includes the data prefix
        const base64 = member.photoBase64.includes('base64,') 
          ? member.photoBase64 
          : `data:image/jpeg;base64,${member.photoBase64}`;
        doc.addImage(base64, 'JPEG', 5, 12, 25, 31);
      } catch (e) {
        // Fallback
        doc.setFillColor(30, 41, 59); // lighter slate
        doc.rect(5, 12, 25, 31, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(member.fullName.substring(0, 2).toUpperCase(), 17.5, 28, { align: 'center' });
      }
    } else {
      doc.setFillColor(30, 41, 59); // lighter slate
      doc.rect(5, 12, 25, 31, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(member.fullName.substring(0, 2).toUpperCase(), 17.5, 28, { align: 'center' });
    }

    // Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(member.fullName.toUpperCase().substring(0, 30), 35, 18);

    // ID
    doc.setTextColor(45, 212, 191);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(member.membershipId || 'PENDING', 35, 25);

    // Type
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(member.membershipType.toUpperCase(), 35, 30);
    
    // Status
    doc.setTextColor(255, 255, 255);
    doc.text('STATUS: ' + member.status.toUpperCase(), 35, 35);

    // QR Code
    if (member.membershipId) {
      try {
        const qrDataUrl = await QRCode.toDataURL(member.membershipId, {
          margin: 1,
          width: 200,
          color: {
            dark: '#2dd4bf', // turquoise
            light: '#ffffff'
          }
        });
        doc.addImage(qrDataUrl, 'PNG', 62, 33, 18, 18);
      } catch (e) {
        console.error('QR generation failed', e);
      }
    } else {
      // If pending, show a placeholder for QR
      doc.setDrawColor(45, 212, 191);
      doc.setLineWidth(0.1);
      doc.rect(62, 33, 18, 18);
      doc.setTextColor(45, 212, 191);
      doc.setFontSize(4);
      doc.text('PENDING VERIFICATION', 71, 42, { align: 'center' });
    }
    
    // Member since
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(5);
    if (member.verifiedAt) {
      doc.text('BERMULA: ' + format(member.verifiedAt.toDate(), 'dd/MM/yyyy'), 35, 40);
    } else if (member.createdAt) {
      doc.text('MOHON: ' + format(member.createdAt.toDate(), 'dd/MM/yyyy'), 35, 40);
    }

    doc.save(`KAD_NAC_${member.membershipId || member.fullName.substring(0, 10)}.pdf`);
  };

  const [memberLogs, setMemberLogs] = useState<LogEntry[]>([]);

  const handleShare = async (member: Member) => {
    const text = `Profil Keahlian NAC: ${member.fullName} (${member.membershipId || 'PENDING'})`;
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Profil Keahlian NAC',
          text: text,
          url: url,
        });
      } catch (err) {
        console.error("Popup share failed:", err);
      }
    } else {
      navigator.clipboard.writeText(`${text} - ${url}`);
      alert("Pautan telah disalin ke papan klip!");
    }
  };

  useEffect(() => {
    if (!selectedMemberForDetail?.id || !isAdmin) {
      setMemberLogs([]);
      return;
    }

    const q = query(
      collection(db, 'logs'),
      where('targetMemberId', '==', selectedMemberForDetail.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMemberLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'logs'));

    return () => unsubscribe();
  }, [selectedMemberForDetail?.id, isAdmin]);

  const current = (t as any).bm;

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberList: Member[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Member;
        const id = docSnap.id;
        
        memberList.push({ id, ...data } as Member);
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
      'Email', 'Nama Penjaga', 'No. Tel Penjaga', 'Status', 
      'Yuran Pendaftaran', 'Yuran Tahunan Terkini', 'Tarikh Daftar'
    ];

    const rows = filteredMembers.map(m => [
      m.membershipId ? m.membershipId.toUpperCase() : '-',
      `"${(m.fullName || '').toUpperCase().replace(/"/g, '""')}"`,
      (m.icNumber || '').toUpperCase(),
      (m.membershipType || '').toUpperCase(),
      (m.gender || '').toUpperCase(),
      (m.dob || '').toUpperCase(),
      `"${(m.address || '').toUpperCase().replace(/"/g, '""')}"`,
      (m.phone || '').toUpperCase(),
      m.email,
      m.guardianName ? `"${m.guardianName.toUpperCase().replace(/"/g, '""')}"` : '-',
      m.guardianPhone || '-',
      (m.status === 'verified' ? 'Disahkan' : 'Menunggu').toUpperCase(),
      (m.registrationFeePaid ? 'Sudah Dibayar' : 'Belum Dibayar').toUpperCase(),
      (m.annualPayments?.some(p => p.year === new Date().getFullYear() && p.paid) ? 'Sudah Dibayar' : 'Belum Dibayar').toUpperCase(),
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
      const memberName = deletingMember.fullName;
      const memberId = deletingMember.id;
      await deleteDoc(doc(db, 'members', deletingMember.id));
      
      logActivity({
        category: 'member',
        action: 'Member Deleted',
        details: `Member ${memberName} (${memberId}) was removed by admin.`,
        targetMemberId: memberId
      });

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
          cancellationReason: null 
        });
        
        transaction.set(counterDocRef, { count: newCount }, { merge: true });

        // Log the activity
        logActivity({
          category: 'member',
          action: 'Member Verified',
          details: `Member verified with ID ${membershipId}`,
          targetMemberId: id
        });
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
        // Check for payment changes to log
        const isRegPaidChanged = originalMember?.registrationFeePaid !== editingMember.registrationFeePaid;
        const currentYear = new Date().getFullYear();
        const originalAnnualPaid = originalMember?.annualPayments?.some(p => p.year === currentYear && p.paid);
        const editingAnnualPaid = editingMember.annualPayments?.some(p => p.year === currentYear && p.paid);
        const isAnnualPaidChanged = originalAnnualPaid !== editingAnnualPaid;

        if (isRegPaidChanged && editingMember.registrationFeePaid) {
          const payDate = format(new Date(), 'dd/MM/yyyy');
          logActivity({
            category: 'payment',
            action: 'Registration Fee Paid',
            details: `Registration fee marked as PAID for ${editingMember.fullName} on ${payDate}.`,
            targetMemberId: id
          });
        }

        if (isAnnualPaidChanged && editingAnnualPaid) {
          const payDate = format(new Date(), 'dd/MM/yyyy');
          logActivity({
            category: 'payment',
            action: 'Annual Fee Paid',
            details: `Annual fee (${currentYear}) marked as PAID for ${editingMember.fullName} on ${payDate}.`,
            targetMemberId: id
          });
        }

        // Standard update
        const finalData = { ...updateData };
        if (isStatusChanged) {
          if (editingMember.status === 'cancelled') finalData.cancelledAt = serverTimestamp();
          if (editingMember.status === 'verified' && !editingMember.verifiedAt) finalData.verifiedAt = serverTimestamp();
        }
        await updateDoc(doc(db, 'members', id), finalData);
      }
      
      logActivity({
        category: 'member',
        action: 'Member Updated',
        details: `Member ${editingMember.fullName} information updated by admin.`,
        targetMemberId: id
      });

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
        {externalSearchTerm === undefined && (
          <div className={`relative flex-grow`}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={current.searchPlaceholder}
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 rounded-2xl shadow-sm focus:ring-2 focus:ring-turquoise text-sm outline-none transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-teal-50 text-slate-700'}`}
            />
          </div>
        )}
        
        <div className={`flex flex-wrap items-center gap-2 ${externalSearchTerm !== undefined ? 'w-full justify-between' : ''}`}>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-teal-50 rounded-2xl shadow-sm px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer hover:bg-slate-50 transition-colors text-slate-800"
          >
            <option value="all">{current.allStatus}</option>
            <option value="pending">{current.pending}</option>
            <option value="verified">{current.verified}</option>
            {isAdmin && <option value="cancelled">{current.cancelled}</option>}
          </select>

          <select 
            value={filterMembershipType}
            onChange={(e) => setFilterMembershipType(e.target.value)}
            className="bg-white border border-teal-50 rounded-2xl shadow-sm px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer hover:bg-slate-50 transition-colors text-slate-800"
          >
            <option value="all">{current.allTypes}</option>
            <option value="Ahli Individu">Ahli Individu</option>
            <option value="Ahli Remaja">Ahli Remaja</option>
            <option value="Ahli Kehormat">Ahli Kehormat</option>
          </select>

          <select 
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="bg-white border border-teal-50 rounded-2xl shadow-sm px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer hover:bg-slate-50 transition-colors text-slate-800"
          >
            <option value="all">{current.allGender}</option>
            <option value="Lelaki">{current.male}</option>
            <option value="Perempuan">{current.female}</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-teal-50 rounded-2xl shadow-sm px-4 py-4 text-[10px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer hover:bg-slate-50 transition-colors text-slate-800"
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
        <div className="bento-card !p-0 overflow-hidden overflow-x-auto custom-scrollbar bg-white">
          <table className="w-full text-left min-w-[800px] text-slate-800">
            <thead>
              <tr className="bg-slate-50/50 border-b border-teal-50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{current.headerMember}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{current.headerId}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{current.headerStatus}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{current.headerDate}</th>
                {isAdmin && <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Yuran</th>}
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
                            {(member.fullName || '').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{(member.fullName || '').toUpperCase()}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(member.membershipType || '').toUpperCase()}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {member.membershipId ? (
                      <span className="text-[10px] font-black font-mono bg-turquoise text-white px-2 py-1 rounded inline-block shadow-sm shadow-turquoise/20">{member.membershipId.toUpperCase()}</span>
                    ) : (
                      <span className="text-[8px] font-black italic text-slate-300 uppercase tracking-widest">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`text-[9px] font-black uppercase px-3 py-1 rounded-full inline-block ${
                      member.membershipType === 'Ahli Kehormat' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      member.status === 'verified' ? 'bg-teal-100 text-teal-600' : 
                      member.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {member.membershipType === 'Ahli Kehormat' && member.status === 'verified' ? 'KEHORMAT' :
                       member.status === 'verified' ? current.verified.toUpperCase() : 
                       member.status === 'cancelled' ? current.cancelled.toUpperCase() : 
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
                  {isAdmin && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-0.5 items-center">
                        <div className="flex items-center gap-1.5 p-1 px-2 rounded-lg bg-slate-50 border border-slate-100 shadow-sm">
                           <div className="flex flex-col items-center">
                             <span className="text-[6px] font-bold text-slate-400 mb-0.5">REG</span>
                             <div className={`w-2 h-2 rounded-full ${member.registrationFeePaid ? 'bg-teal-400' : 'bg-slate-200'}`} title="Yuran Pendaftaran" />
                           </div>
                           <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
                           <div className="flex flex-col items-center">
                             <span className="text-[6px] font-bold text-slate-400 mb-0.5">{new Date().getFullYear()}</span>
                             <div className={`w-2 h-2 rounded-full ${member.annualPayments?.some(p => p.year === new Date().getFullYear() && p.paid) ? 'bg-orange-400' : 'bg-slate-200'}`} title={`Yuran Tahunan ${new Date().getFullYear()}`} />
                           </div>
                        </div>
                      </div>
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => exportMembershipCard(member)}
                          className="w-8 h-8 rounded bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                          title="Muat Turun Kad"
                        >
                          <IdCard className="w-4 h-4" />
                        </button>
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {filteredMembers.map((member) => (
            <motion.div 
              layout
              key={member.id}
              onClick={() => !isAdmin && setSelectedMemberForDetail(member)}
              className={`bento-card !p-4 sm:!p-6 group flex flex-col items-center text-center transition-all cursor-pointer border-white/50 backdrop-blur-md shadow-lg hover:shadow-xl text-slate-800 ${
                member.membershipType === 'Ahli Remaja' 
                ? 'bg-gradient-to-br from-white via-white to-green-100/50' 
                : member.membershipType === 'Ahli Kehormat'
                ? 'bg-gradient-to-br from-white via-amber-50 to-amber-200/50 border-amber-200/50'
                : 'bg-gradient-to-br from-white via-white to-slate-200/50'
              }`}
            >
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-white mb-3 sm:mb-4 group-hover:scale-105 transition-transform shadow-md border-4 border-white/80"
              >
                {member.photoBase64 ? (
                  <img src={member.photoBase64} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-turquoise text-xl">
                    {(member.fullName || '').substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <h4 className="font-black text-slate-800 text-sm mb-1 leading-tight line-clamp-1">{(member.fullName || '').toUpperCase()}</h4>
              <p className="text-[10px] font-black font-mono text-turquoise mb-4 uppercase tracking-wider">{(member.membershipId || 'Permohonan').toUpperCase()}</p>
              
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                     member.membershipType === 'Ahli Kehormat' ? 'bg-amber-100 text-amber-700' :
                     member.status === 'verified' ? 'bg-teal-100 text-teal-600' : 
                     member.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                     'bg-orange-100 text-orange-600'
                  }`}>
                    {member.membershipType === 'Ahli Kehormat' && member.status === 'verified' ? 'KEHORMAT' :
                     member.status === 'verified' ? current.verified.toUpperCase() : 
                     member.status === 'cancelled' ? current.cancelled.toUpperCase() : 
                     current.pending.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-slate-100 shadow-sm ${
                    member.membershipType === 'Ahli Kehormat' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white/50 text-slate-400'
                  }`}>
                    {(member.membershipType || '').toUpperCase()}
                  </span>
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
                <div className="mb-4 flex gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[6px] font-black text-slate-400 uppercase mb-1">Pendaftaran</span>
                    <div className={`w-2 h-2 rounded-full ${member.registrationFeePaid ? 'bg-teal-400' : 'bg-slate-200'}`} />
                  </div>
                  <div className="w-[1px] h-4 bg-slate-200" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[6px] font-black text-slate-400 uppercase mb-1">Yuran {new Date().getFullYear()}</span>
                    <div className={`w-2 h-2 rounded-full ${member.annualPayments?.some(p => p.year === new Date().getFullYear() && p.paid) ? 'bg-orange-400' : 'bg-slate-200'}`} />
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between w-full" onClick={e => e.stopPropagation()}>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Aksi:</p>
                  <div className="flex gap-2">
                    <div 
                      onClick={() => exportMembershipCard(member)}
                      className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-[10px] cursor-pointer hover:bg-teal-500 hover:text-white transition-all shadow-sm"
                      title="Muat Turun Kad"
                    >
                      <IdCard className="w-3.5 h-3.5" />
                    </div>
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
        <div className="text-center py-24 bg-white/50 rounded-[2rem] border border-dashed border-teal-100 mt-4 text-slate-800">
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
              className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative my-8 shadow-2xl custom-scrollbar"
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
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-slate-100 border-4 border-slate-50 shadow-inner flex items-center justify-center">
                      {editingMember.photoBase64 ? (
                        <img src={editingMember.photoBase64} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[2rem]">
                      <span className="text-[8px] font-black text-white uppercase tracking-widest text-center px-2">Klik untuk Tukar Gambar</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             if (file.size > 200 * 1024) {
                               alert("Gambar terlalu besar (maks 200KB).");
                               return;
                             }
                             const reader = new FileReader();
                             reader.onloadend = () => {
                               setEditingMember({...editingMember, photoBase64: reader.result as string});
                             };
                             reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Gambar Profil Ahli</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="md:col-span-2">
                    <label className="label-bento">Nama Penuh</label>
                    <input 
                      type="text" 
                      value={editingMember.fullName || ''}
                      onChange={(e) => setEditingMember({...editingMember, fullName: e.target.value.toUpperCase()})}
                      className="input-bento font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-bento">No. KP / MyKid</label>
                    <input 
                      type="text" 
                      value={editingMember.icNumber || ''}
                      onChange={(e) => setEditingMember({...editingMember, icNumber: e.target.value.toUpperCase()})}
                      className="input-bento"
                      required
                    />
                  </div>
                      <div>
                        <label className="label-bento">Jenis Keahlian</label>
                        <select 
                          value={editingMember.membershipType || ''}
                          onChange={(e) => setEditingMember({...editingMember, membershipType: e.target.value as MembershipType})}
                          className="input-bento font-bold"
                        >
                          <option value="Ahli Individu">Ahli Individu</option>
                          <option value="Ahli Remaja">Ahli Remaja</option>
                          <option value="Ahli Kehormat">Ahli Kehormat</option>
                        </select>
                      </div>

                  <div>
                    <label className="label-bento">Status Keahlian</label>
                    <select 
                      value={editingMember.status || ''}
                      onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MembershipStatus})}
                      className="input-bento font-black text-turquoise uppercase"
                    >
                      <option value="pending">{current.pending}</option>
                      <option value="verified">{current.verified}</option>
                      <option value="cancelled">{current.cancelled}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 p-6 bg-slate-50 rounded-[2rem] border border-teal-50">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CreditCard className="w-3 h-3 text-turquoise" /> Status Pembayaran Bendahari
                    </h4>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={editingMember.registrationFeePaid}
                          onChange={(e) => setEditingMember({...editingMember, registrationFeePaid: e.target.checked, registrationFeeVerifiedAt: e.target.checked ? serverTimestamp() : null})}
                          className="w-4 h-4 rounded border-slate-300 text-turquoise focus:ring-turquoise" 
                        />
                        <span className="text-xs font-bold text-slate-600 uppercase">Yuran Pendaftaran (Sekali Sahaja)</span>
                        {editingMember.registrationFeePaid && editingMember.registrationFeeVerifiedAt && (
                          <span className="text-[8px] font-black text-teal-400">DISAHKAN</span>
                        )}
                      </label>

                      <div className="pt-4 border-t border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Yuran Tahunan (History)</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(() => {
                            const startYear = editingMember.createdAt ? editingMember.createdAt.toDate().getFullYear() : new Date().getFullYear();
                            const currentYear = new Date().getFullYear();
                            const years = [];
                            for (let y = currentYear; y >= startYear; y--) {
                              years.push(y);
                            }
                            return years.map(year => {
                              const payment = editingMember.annualPayments?.find(p => p.year === year);
                              return (
                                <div key={year} className="flex flex-col p-3 bg-white rounded-xl border border-slate-100 shadow-sm gap-2">
                                  <span className="text-[9px] font-black text-slate-400">{year}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const others = (editingMember.annualPayments || []).filter(p => p.year !== year);
                                      if (payment?.paid) {
                                        setEditingMember({...editingMember, annualPayments: others});
                                      } else {
                                        setEditingMember({...editingMember, annualPayments: [...others, { year, paid: true, verifiedAt: new Date() }]});
                                      }
                                    }}
                                    className={`w-full py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${payment?.paid ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                  >
                                    {payment?.paid ? 'Dibayar' : 'Bayar'}
                                  </button>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
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
                      value={editingMember.phone || ''}
                      onChange={(e) => setEditingMember({...editingMember, phone: e.target.value})}
                      className="input-bento"
                    />
                  </div>
                  <div>
                    <label className="label-bento">Email</label>
                    <input 
                      type="email" 
                      value={editingMember.email || ''}
                      onChange={(e) => setEditingMember({...editingMember, email: e.target.value})}
                      className="input-bento"
                    />
                  </div>
                  <div>
                    <label className="label-bento">Tarikh Lahir</label>
                    <input 
                      type="date" 
                      value={editingMember.dob || ''}
                      onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})}
                      className="input-bento"
                    />
                  </div>
                  <div>
                    <label className="label-bento">Jantina</label>
                    <select 
                      value={editingMember.gender || ''}
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
                      value={editingMember.address || ''}
                      onChange={(e) => setEditingMember({...editingMember, address: e.target.value.toUpperCase()})}
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
                          onChange={(e) => setEditingMember({...editingMember, guardianName: e.target.value.toUpperCase()})}
                          className="input-bento"
                        />
                      </div>
                      <div>
                        <label className="label-bento">No. KP Penjaga</label>
                        <input 
                          type="text" 
                          value={editingMember.guardianIc || ''}
                          onChange={(e) => setEditingMember({...editingMember, guardianIc: e.target.value.toUpperCase()})}
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

      {/* Member Detail Card Redesign (Public & Admin) */}
      <AnimatePresence>
        {selectedMemberForDetail && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setSelectedMemberForDetail(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50, rotateX: 20 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.9, y: 50, rotateX: 20 }}
              className={`w-full max-w-sm rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative border-4 border-white/20 bg-slate-900 group`}
              onClick={e => e.stopPropagation()}
            >
              {/* Card Header/Banner */}
              <div className="relative h-32 bg-gradient-to-br from-turquoise via-turquoise-dark to-slate-900">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  {settings?.logoBase64 && (
                    <img src={settings.logoBase64} alt="Logo" className="w-8 h-8 object-contain" />
                  )}
                  <p className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">
                    Nabalu Athletics Club
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedMemberForDetail(null)}
                  className="absolute top-6 right-6 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Section */}
              <div className="relative px-8 -mt-16 flex justify-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-slate-800 border-8 border-slate-900 shadow-2xl relative z-10">
                    {selectedMemberForDetail.photoBase64 ? (
                      <img src={selectedMemberForDetail.photoBase64} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-turquoise text-4xl">
                        {(selectedMemberForDetail.fullName || '').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Status Badge Over Photo */}
                  <div className={`absolute -right-2 -bottom-2 z-20 w-8 h-8 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-900 ${
                    selectedMemberForDetail.status === 'verified' ? 'bg-teal-500 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    {selectedMemberForDetail.status === 'verified' ? <ShieldCheck className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-8 pt-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-black text-white tracking-tight mb-1 uppercase">
                    {(selectedMemberForDetail.fullName || '').toUpperCase()}
                  </h2>
                  <p className="text-[10px] font-bold text-turquoise uppercase tracking-[0.3em]">
                    {(selectedMemberForDetail.membershipType || '').toUpperCase()}
                  </p>
                </div>

                {/* Membership ID Bento */}
                <div className="bg-white/5 rounded-[2rem] p-6 mb-6 border border-white/5 text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Nombor Keahlian</p>
                  <p className="text-3xl font-black font-mono text-white tracking-tighter">
                    {(selectedMemberForDetail.membershipId || 'PENDING').toUpperCase()}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Jantina</p>
                    <p className="text-xs font-bold text-slate-300 uppercase">{(selectedMemberForDetail.gender || '').toUpperCase()}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Berdaftar</p>
                    <p className="text-xs font-bold text-slate-300 uppercase">
                      {selectedMemberForDetail.createdAt ? format(selectedMemberForDetail.createdAt.toDate(), 'dd/MM/yy') : '-'}
                    </p>
                  </div>
                </div>

                {/* Admin Only Info */}
                {isAdmin && (
                  <div className="mb-8 space-y-4">
                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      isEmailRegistered 
                      ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' 
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4" />
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Status Pengguna</p>
                          <p className="text-[10px] font-black uppercase">
                            {isEmailRegistered === null ? 'Memeriksa...' : (isEmailRegistered ? 'Telah Daftar App' : 'Belum Daftar App')}
                          </p>
                        </div>
                      </div>
                      {isEmailRegistered && <CheckCircle className="w-4 h-4" />}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleShare(selectedMemberForDetail)}
                    className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => exportMembershipCard(selectedMemberForDetail)}
                      className="flex-1 px-6 py-4 bg-turquoise hover:bg-turquoise-dark text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-turquoise/20"
                    >
                      <Download className="w-4 h-4" /> Kad PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Graphic Element */}
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-turquoise/10 rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] pointer-events-none" />
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
                  Sahkan Padam
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
