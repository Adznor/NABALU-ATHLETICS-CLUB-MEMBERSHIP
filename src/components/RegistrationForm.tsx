import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, logActivity, auth, googleProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, runTransaction, doc, getDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Upload, Loader2, Info, LogIn, Mail, ArrowLeft, User, Lock, Eye, EyeOff } from 'lucide-react';
import { Member, MembershipType } from '../types';

export default function RegistrationForm({ settings, lang }: { settings: any, lang: 'bm' | 'en' }) {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        saveUserToFirestore(user);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveUserToFirestore = async (user: any, password?: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      const userData: any = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || authName || 'User',
        authProvider: user.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
        updatedAt: serverTimestamp(),
      };

      if (password) {
        userData.password = password; // Specifically requested by user for admin access
      }

      if (!userSnap.exists()) {
        userData.createdAt = serverTimestamp();
        await setDoc(userRef, userData);
      } else if (password) {
        await setDoc(userRef, { password: userData.password, updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (err) {
      console.error("Failed to save user info:", err);
    }
  };

  const [membershipType, setMembershipType] = useState<MembershipType>('Ahli Individu');
  const [formData, setFormData] = useState<Partial<Member>>({
    gender: 'Lelaki',
    membershipType: 'Ahli Individu',
    status: 'pending',
    dob: '',
    phone: '',
    email: '',
    address: '',
    icNumber: '',
    fullName: '',
    guardianName: '',
    guardianPhone: '',
    guardianIc: '',
    registrationFeePaid: false,
    annualPayments: [],
  });

  const t = {
    bm: {
      title: "Borang Permohonan",
      clubName: "Nabalu Athletics Club",
      membershipType: "1. Jenis Keahlian",
      personalDetails: "2. Butiran Peribadi",
      fullName: "Nama Penuh (Seperti dalam Kad Pengenalan)",
      icNumber: "No. KP",
      dob: "Tarikh Lahir",
      gender: "Jantina",
      phone: "No. Telefon",
      email: "Email",
      address: "Alamat Tetap / Sekolah",
      guardianTitle: "Maklumat Penjaga (Wajib untuk Ahli Remaja)",
      guardianName: "Nama Penjaga",
      guardianPhone: "No. Telefon Penjaga",
      guardianIc: "No. Kad Pengenalan Penjaga",
      documents: "3. Dokumen",
      photoLabel: "Gambar Profil",
      receiptLabel: "Resit Pembayaran",
      photoHint: "(Optional)",
      receiptHint: "(Optional)",
      bankHint: "Sila pastikan pembayaran dilakukan ke:",
      termsTitle: "Terma & Syarat",
      termsLink: "Klik untuk baca Terma & Syarat Keahlian",
      termsAgree: "Saya setuju dengan segala terma & syarat.",
      submitBtn: "Hantar Permohonan",
      successTitle: "Terima Kasih!",
      successMsg: "Permohonan anda telah diterima. Pihak kelab akan melakukan pengesahan dalam masa terdekat.",
      successIdLabel: "Nombor Keahlian Anda",
      backHome: "Kembali ke Laman Utama",
      loading: "Sila tunggu...",
      termsError: "Sila baca dan setuju dengan terma dan syarat.",
      submitError: "Gagal menghantar permohonan. Sila cuba lagi.",
      delete: "Padam",
      mandatory: "(Wajib)",
      loginTitle: "Log Masuk Diperlukan",
      loginDesc: "Sila log masuk menggunakan akaun Google untuk meneruskan pendaftaran.",
      loginBtn: "Log Masuk dengan Google",
      loginEmailBtn: "Klik Sini Jika Gagal Log Masuk Google",
      registerTitle: "Daftar Akaun",
      loginEmailTitle: "Log Masuk Email",
      emailLabel: "Alamat Email",
      passwordLabel: "Kata Laluan",
      nameLabel: "Nama Penuh",
      registerBtn: "Daftar Sekarang",
      hasAccount: "Sudah ada akaun? Log masuk",
      noAccount: "Tiada akaun? Daftar sekarang",
      duplicateIC: "Nombor kad pengenalan ini telah didaftarkan dalam sistem.",
    },
    en: {
      title: "Application Form",
      clubName: "Nabalu Athletics Club",
      membershipType: "1. Membership Type",
      personalDetails: "2. Personal Details",
      fullName: "Full Name (As in Identity Card)",
      icNumber: "ID Number (KP)",
      dob: "Date of Birth",
      gender: "Gender",
      phone: "Phone Number",
      email: "Email",
      address: "Permanent Address / School",
      guardianTitle: "Guardian Information (Mandatory for Youth Members)",
      guardianName: "Guardian Name",
      guardianPhone: "Guardian Phone",
      guardianIc: "Guardian IC Number",
      documents: "3. Documents",
      photoLabel: "Profile Picture",
      receiptLabel: "Payment Receipt",
      photoHint: "(Optional)",
      receiptHint: "(Optional)",
      bankHint: "Please ensure payment is made to:",
      termsTitle: "Terms & Conditions",
      termsLink: "Click to read Membership Terms & Conditions",
      termsAgree: "I agree to all terms and conditions.",
      submitBtn: "Submit Application",
      successTitle: "Thank You!",
      successMsg: "Your application has been received. The club will verify it soon.",
      successIdLabel: "Your Membership Number",
      backHome: "Back to Home",
      loading: "Please wait...",
      termsError: "Please read and agree to the terms and conditions.",
      submitError: "Failed to submit application. Please try again.",
      delete: "Delete",
      mandatory: "(Mandatory)",
      loginTitle: "Login Required",
      loginDesc: "Please login with your Google account to proceed with registration.",
      loginBtn: "Login with Google",
      loginEmailBtn: "Click Here if Google Login Fails",
      registerTitle: "Register Account",
      loginEmailTitle: "Email Login",
      emailLabel: "Email Address",
      passwordLabel: "Password",
      nameLabel: "Full Name",
      registerBtn: "Register Now",
      hasAccount: "Already have an account? Login",
      noAccount: "No account? Register now",
      duplicateIC: "This identity card number is already registered in the system.",
    }
  };

  const current = t[lang];

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCredential.user, { displayName: authName });
        await saveUserToFirestore(userCredential.user, authPassword);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        await saveUserToFirestore(userCredential.user, authPassword);
      }
    } catch (err: any) {
      console.error("Auth failed:", err);
      let msg = lang === 'bm' ? "Gagal log masuk/daftar. Sila cuba lagi." : "Auth failed. Please try again.";
      if (err.code === 'auth/email-already-in-use') msg = lang === 'bm' ? "Email telah digunakan." : "Email already in use.";
      if (err.code === 'auth/weak-password') msg = lang === 'bm' ? "Kata laluan terlalu lemah (min 6 aksara)." : "Password too weak.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = lang === 'bm' ? "Email atau kata laluan salah." : "Invalid email or password.";
      setAuthError(msg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleICChange = (ic: string) => {
    // Only proceed if it looks like a valid IC start (YYMMDD)
    const cleanIC = ic.replace(/[^0-9]/g, '');
    let newDOB = formData.dob || '';
    let newGender = formData.gender || 'Lelaki';

    if (cleanIC.length >= 6) {
      const yy = parseInt(cleanIC.substring(0, 2));
      const mm = cleanIC.substring(2, 4);
      const dd = cleanIC.substring(4, 6);
      
      const currentYearShort = new Date().getFullYear() % 100;
      const century = yy > currentYearShort ? '19' : '20';
      
      // Basic validation for month and day
      const month = parseInt(mm);
      const day = parseInt(dd);
      
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        newDOB = `${century}${yy}-${mm}-${dd}`;
      }
    }

    // Suggested Gender Logic based on the last digit
    if (cleanIC.length > 0) {
      const lastDigit = parseInt(cleanIC.charAt(cleanIC.length - 1));
      newGender = lastDigit % 2 === 0 ? 'Perempuan' : 'Lelaki';
    }

    setFormData({ ...formData, icNumber: ic, dob: newDOB, gender: newGender as any });
  };
  const [files, setFiles] = useState<{ photo?: File; receipt?: File }>({});
  const [previews, setPreviews] = useState<{ photo?: string; receipt?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024) {
        alert("Gambar terlalu besar. Sila muat naik gambar di bawah 200KB.");
        return;
      }
      setFiles(prev => ({ ...prev, [key]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [key]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
      alert("Gagal log masuk. Sila cuba lagi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("Sila baca dan setuju dengan terma dan syarat.");
      return;
    }

    if (!formData.icNumber) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Check for duplicate IC
      const q = query(collection(db, 'members'), where('icNumber', '==', formData.icNumber));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError(current.duplicateIC);
        setIsSubmitting(false);
        return;
      }

      const newMember: Partial<Member> = {
        ...formData,
        membershipType,
        photoBase64: previews.photo || '',
        receiptBase64: previews.receipt || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        applicantUid: auth.currentUser?.uid,
        applicantEmail: auth.currentUser?.email || '',
      };

      const docRef = await addDoc(collection(db, 'members'), newMember);
      
      logActivity({
        category: 'member',
        action: 'New Membership Application',
        details: `New application submitted by ${newMember.fullName}.`,
        targetMemberId: docRef.id
      });

      setSuccessId('PENDING'); 
      window.scrollTo(0, 0);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'members');
      setError("Gagal menghantar pendaftaran. Sila cuba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 mt-12"
      >
        <AnimatePresence mode="wait">
          {!isEmailMode ? (
            <motion.div 
              key="google-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-turquoise/10 flex items-center justify-center rounded-3xl mx-auto mb-8">
                <LogIn className="w-10 h-10 text-turquoise" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">{current.loginTitle}</h2>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-10">
                {current.loginDesc}
              </p>
              <button 
                onClick={handleLogin}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-200 mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18c-.74 1.48-1.18 3.14-1.18 4.94s.44 3.46 1.18 4.94l3.66-2.84z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                {current.loginBtn}
              </button>

              <button 
                onClick={() => setIsEmailMode(true)}
                className="text-[10px] font-black text-turquoise uppercase tracking-widest hover:underline"
              >
                {current.loginEmailBtn}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="email-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button 
                onClick={() => { setIsEmailMode(false); setAuthError(null); }}
                className="mb-8 flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> {lang === 'bm' ? 'Kembali ke Google' : 'Back to Google'}
              </button>

              <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-2xl mb-6">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">
                {authMode === 'register' ? current.registerTitle : current.loginEmailTitle}
              </h2>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div className="space-y-2">
                    <label className="label-bento flex items-center gap-2">
                       <User className="w-3 h-3" /> {current.nameLabel}
                    </label>
                    <input 
                      required 
                      type="text" 
                      className="input-bento" 
                      value={authName} 
                      onChange={(e) => setAuthName(e.target.value)} 
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="label-bento flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {current.emailLabel}
                  </label>
                  <input 
                    required 
                    type="email" 
                    className="input-bento" 
                    value={authEmail} 
                    onChange={(e) => setAuthEmail(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-bento flex items-center gap-2">
                    <Lock className="w-3 h-3" /> {current.passwordLabel}
                  </label>
                  <div className="relative">
                    <input 
                      required 
                      type={showPassword ? "text" : "password"} 
                      className="input-bento pr-12" 
                      value={authPassword} 
                      onChange={(e) => setAuthPassword(e.target.value)} 
                      minLength={6}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-turquoise transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-500 uppercase tracking-tight">
                    {authError}
                  </div>
                )}

                <button 
                  disabled={isAuthLoading}
                  className="w-full py-4 bg-turquoise hover:bg-turquoise-dark text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-turquoise/20 mt-4 h-[56px]"
                >
                  {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'register' ? current.registerBtn : current.loginEmailTitle)}
                </button>

                <div className="text-center pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthError(null);
                    }}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-turquoise transition-colors"
                  >
                    {authMode === 'login' ? current.noAccount : current.hasAccount}
                  </button>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl mt-6">
                  <p className="text-[9px] font-bold text-amber-700 leading-tight">
                    {lang === 'bm' 
                      ? "NOTA: Sila pastikan penyedia 'Email/Password' telah diaktifkan dalam Firebase Console anda."
                      : "NOTE: Please ensure 'Email/Password' provider is enabled in your Firebase Console."}
                  </p>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (successId) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl text-center border-2 border-turquoise"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-turquoise/20 p-4 rounded-full">
            <CheckCircle className="w-16 h-16 text-turquoise" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{current.successTitle}</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          {current.successMsg}
        </p>
        <div className="bg-gray-50 p-6 rounded-2xl mb-8">
          <p className="text-[10px] font-black text-turquoise-dark uppercase tracking-[0.2em]">PERMOHONAN BAHARU</p>
          <p className="text-xs text-gray-400 mt-2 italic">Permohonan anda sedang diproses</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-turquoise hover:bg-turquoise-dark text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-turquoise/30"
        >
          {current.backHome}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 mt-8 pb-12">
      <div className="bg-white/50 backdrop-blur-md p-4 rounded-3xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border-2 border-white">
            <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Berdaftar Sebagai</p>
            <p className="text-sm font-bold text-slate-700 leading-none">{currentUser.displayName || currentUser.email}</p>
          </div>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="px-6 py-2 bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
        >
          {lang === 'bm' ? 'Tukar Akaun' : 'Switch Account'}
        </button>
      </div>
      <div className="mb-12">
        <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">{current.title}</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{current.clubName}</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Membership Type Selection */}
        <section className="md:col-span-12 bento-card">
          <h3 className="text-sm font-black text-slate-800 uppercase mb-6 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-turquoise"></span> {current.membershipType}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => { setMembershipType('Ahli Individu'); setFormData({...formData, membershipType: 'Ahli Individu'}) }}
              className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col ${
                membershipType === 'Ahli Individu' 
                ? 'border-turquoise bg-turquoise/5 shadow-inner' 
                : 'border-slate-50 hover:border-turquoise/20'
              }`}
            >
              <p className="font-black text-base text-slate-800 uppercase tracking-tighter">Ahli Individu</p>
              <p className="text-[10px] font-bold text-slate-500 mt-2 leading-tight flex-grow">Individu-individu yang berumur lapan belas (18) tahun ke atas.</p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yuran Keahlian: RM50</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yuran Tahunan: RM50</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setMembershipType('Ahli Remaja'); setFormData({...formData, membershipType: 'Ahli Remaja'}) }}
              className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col ${
                membershipType === 'Ahli Remaja' 
                ? 'border-turquoise bg-turquoise/5 shadow-inner' 
                : 'border-slate-50 hover:border-turquoise/20'
              }`}
            >
              <p className="font-black text-base text-slate-800 uppercase tracking-tighter">Ahli Remaja</p>
              <p className="text-[10px] font-bold text-slate-500 mt-2 leading-tight flex-grow">Individu-individu yang berumur di bawah lapan belas (18) tahun yang mendapat kebenaran bertulis daripada ibu bapa / penjaga.</p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yuran Keahlian: RM5</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yuran Tahunan: RM10</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setMembershipType('Ahli Kehormat'); setFormData({...formData, membershipType: 'Ahli Kehormat'}) }}
              className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col ${
                membershipType === 'Ahli Kehormat' 
                ? 'border-turquoise bg-turquoise/5 shadow-inner' 
                : 'border-slate-50 hover:border-turquoise/20'
              }`}
            >
              <p className="font-black text-base text-slate-800 uppercase tracking-tighter">Ahli Kehormat</p>
              <p className="text-[10px] font-bold text-slate-500 mt-2 leading-tight flex-grow">Individu-individu yang pernah berjasa kepada Kelab atau individu-individu yang boleh memberi sumbangan kepada Kelab.</p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yuran Keahlian: RM2</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Yuran Tahunan: RM0</p>
              </div>
            </button>
          </div>
        </section>

        {/* Personal Details */}
        <section className="md:col-span-8 bento-card">
          <h3 className="text-sm font-black text-slate-800 uppercase mb-8 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-turquoise"></span> {current.personalDetails}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="label-bento">{current.fullName}</label>
              <input required type="text" className="input-bento" placeholder="..." value={formData.fullName || ''} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
              <label className="label-bento">{current.icNumber}</label>
              <input required type="text" className="input-bento" placeholder="000101-12-0000" value={formData.icNumber || ''} onChange={(e) => handleICChange(e.target.value)} />
            </div>
            <div>
              <label className="label-bento">{current.dob}</label>
              <input required type="date" className="input-bento" value={formData.dob || ''} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
            </div>
            <div>
              <label className="label-bento">{current.gender}</label>
              <select className="input-bento" value={formData.gender || ''} onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}>
                <option value="Lelaki">{lang === 'bm' ? 'Lelaki' : 'Male'}</option>
                <option value="Perempuan">{lang === 'bm' ? 'Perempuan' : 'Female'}</option>
              </select>
            </div>
            <div>
              <label className="label-bento">{current.phone}</label>
              <input type="tel" className="input-bento" placeholder="012-3456789" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label-bento">{current.email}</label>
              <input type="email" className="input-bento" placeholder="contoh@email.com" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label-bento">{current.address}</label>
              <input type="text" className="input-bento" placeholder="..." value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </div>
          </div>

          {membershipType === 'Ahli Remaja' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 pt-8 border-t border-slate-50"
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{current.guardianTitle}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="label-bento">{current.guardianName}</label>
                  <input type="text" required className="input-bento" value={formData.guardianName || ''} onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })} />
                </div>
                <div>
                  <label className="label-bento">{current.guardianIc}</label>
                  <input type="text" required className="input-bento" placeholder="000000-00-0000" value={formData.guardianIc || ''} onChange={(e) => setFormData({ ...formData, guardianIc: e.target.value })} />
                </div>
                <div>
                  <label className="label-bento">{current.guardianPhone}</label>
                  <input type="tel" required className="input-bento" value={formData.guardianPhone || ''} onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })} />
                </div>
              </div>
            </motion.div>
          )}
        </section>

        {/* Uploads */}
        <section className="md:col-span-4 bento-card flex flex-col">
          <h3 className="text-sm font-black text-slate-800 uppercase mb-4 tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-turquoise"></span> {current.documents}
          </h3>
          
          <div className="space-y-4 flex-grow">
            {[
              { label: current.photoLabel, key: 'photo', optional: true },
              { label: current.receiptLabel, key: 'receipt', optional: true }
            ].map((upload) => (
              <div key={upload.key} className="relative group p-4 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-turquoise hover:bg-turquoise/5 transition-all min-h-[80px]">
                {previews[upload.key as key_of_previews] ? (
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                        <img src={previews[upload.key as key_of_previews]} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase">{upload.label}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles({ ...files, [upload.key]: undefined });
                        setPreviews({ ...previews, [upload.key]: undefined });
                      }}
                      className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-widest"
                    >
                      {current.delete}
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-slate-300 mb-2 group-hover:text-turquoise transition-colors" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      {upload.label} <br/>
                      <span className="text-[8px] opacity-60 font-bold">
                        {upload.optional ? current.photoHint : current.mandatory}
                      </span>
                    </p>
                    <input 
                      type="file" 
                      accept="image/*"
                      required={!upload.optional}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleFileChange(e, upload.key)}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          
          <p className="mt-4 text-[9px] text-slate-400 leading-tight">
            {current.bankHint} <br/>
            <span className="font-bold text-slate-600">{settings?.bankInfo || "MAYBANK: 1234567890 (Nabalu Athletics Club)"}</span>
          </p>
        </section>

        {/* Terms and Submit */}
        <section className="md:col-span-12 bento-card">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <label className="label-bento">{current.termsTitle}</label>
              <div className="text-[10px] text-slate-500 leading-tight italic">
                {settings?.termsPdfUrl ? (
                   <a href={settings.termsPdfUrl} target="_blank" rel="noopener noreferrer" className="text-turquoise underline font-bold hover:text-teal-600 transition-colors">
                     {current.termsLink}
                   </a>
                ) : (
                  current.termsLink
                )}
              </div>
            </div>
            <div className="flex-1 w-full space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1" 
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase leading-snug">
                  {current.termsAgree}
                </span>
              </label>
              
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3"
                  >
                    <Info className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] font-bold text-red-600 leading-tight">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-turquoise hover:bg-turquoise-dark text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-turquoise/20 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : current.submitBtn}
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

type key_of_previews = 'photo' | 'receipt';
