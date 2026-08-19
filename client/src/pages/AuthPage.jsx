import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  Waves,
  UserCheck,
  GraduationCap,
  RefreshCw,
  Eye,
  EyeOff,
  Upload,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  AlertCircle,
  X,
  Phone,
  Circle,
  KeyRound,
  Mail,
} from 'lucide-react';

function generateCaptcha() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user, MOCK_TEACHER, MOCK_STUDENT } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Log In Form State
  const [loginRoll, setLoginRoll] = useState('FAC-8021');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [loginRole, setLoginRole] = useState('TEACHER'); // 'TEACHER' | 'STUDENT'
  const [loginCaptchaInput, setLoginCaptchaInput] = useState('');
  const [loginCaptchaCode, setLoginCaptchaCode] = useState(generateCaptcha());
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form State
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleName, setRegMiddleName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [regRole, setRegRole] = useState('STUDENT'); // 'STUDENT' | 'TEACHER'
  const [regMotherPhone, setRegMotherPhone] = useState('');
  const [regFatherPhone, setRegFatherPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCaptchaInput, setRegCaptchaInput] = useState('');
  const [regCaptchaCode, setRegCaptchaCode] = useState(generateCaptcha());
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Real-time Password Validation State
  const isMinLength = regPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword);
  const isPasswordValid = isMinLength && hasUppercase && hasNumber && hasSpecialChar;
  const isConfirmMatch = regPassword.length > 0 && regConfirmPassword.length > 0 && regPassword === regConfirmPassword;

  // Real-time Mobile Validation State (Exactly 10 digits)
  const isMotherPhoneValid = /^\d{10}$/.test(regMotherPhone);
  const isFatherPhoneValid = /^\d{10}$/.test(regFatherPhone);

  const handleMotherPhoneChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setRegMotherPhone(cleaned);
  };

  const handleFatherPhoneChange = (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setRegFatherPhone(cleaned);
  };

  // Modal State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    setLoginCaptchaCode(generateCaptcha());
    setRegCaptchaCode(generateCaptcha());
  }, []);

  const handleRefreshLoginCaptcha = () => {
    setLoginCaptchaCode(generateCaptcha());
    setLoginCaptchaInput('');
  };

  const handleRefreshRegCaptcha = () => {
    setRegCaptchaCode(generateCaptcha());
    setRegCaptchaInput('');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.show('Photo file size must be less than 5MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        toast.show('Profile photo uploaded cleanly!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();

    if (loginCaptchaInput.toUpperCase() !== loginCaptchaCode) {
      toast.show('Invalid CAPTCHA code. Please re-enter the code.', 'error');
      handleRefreshLoginCaptcha();
      return;
    }

    // Authenticate
    const fullName = loginRole === 'TEACHER' ? 'Dr. Himani Kaur' : 'Rahul Mehta';
    const loggedUser = {
      id: loginRole === 'TEACHER' ? 'u-himani' : 's-101',
      name: fullName,
      rollNumber: loginRoll,
      role: loginRole,
      department: 'Computer Science',
      email: `${loginRoll.toLowerCase()}@university.edu`,
      avatar: avatarPreview,
    };

    login(loggedUser);
    toast.show(`Welcome back, ${fullName}! Successfully logged in.`, 'success');

    if (loginRole === 'TEACHER') {
      navigate('/');
    } else {
      navigate('/student-view');
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();

    if (!regFirstName.trim() || !regLastName.trim() || !regRoll.trim()) {
      toast.show('Please fill in all required fields marked with *', 'error');
      return;
    }

    if (!isMotherPhoneValid) {
      toast.show("Please enter a valid 10-digit mobile number for Mother's Mobile Number.", 'error');
      return;
    }

    if (!isFatherPhoneValid) {
      toast.show("Please enter a valid 10-digit mobile number for Father's Mobile Number.", 'error');
      return;
    }

    if (!isPasswordValid) {
      toast.show('Please satisfy all password requirements before creating an account.', 'error');
      return;
    }

    if (!isConfirmMatch) {
      toast.show('Confirm Password does not match Password.', 'error');
      return;
    }

    if (regCaptchaInput.toUpperCase() !== regCaptchaCode) {
      toast.show('Invalid CAPTCHA code. Please re-enter the code.', 'error');
      handleRefreshRegCaptcha();
      return;
    }

    const fullName = `${regFirstName.trim()} ${regMiddleName.trim() ? regMiddleName.trim() + ' ' : ''}${regLastName.trim()}`;
    const newUser = {
      id: `u-${Date.now()}`,
      name: fullName,
      firstName: regFirstName.trim(),
      middleName: regMiddleName.trim(),
      lastName: regLastName.trim(),
      rollNumber: regRoll.trim(),
      role: regRole,
      motherPhone: regMotherPhone,
      fatherPhone: regFatherPhone,
      department: 'Computer Science',
      email: `${regRoll.toLowerCase()}@university.edu`,
      avatar: avatarPreview,
    };

    register(newUser);
    toast.show(`Account created successfully for ${fullName}!`, 'success');

    if (regRole === 'TEACHER') {
      navigate('/');
    } else {
      navigate('/student-view');
    }
  };

  const handleQuickLogin = (persona) => {
    if (persona === 'TEACHER') {
      login(MOCK_TEACHER);
      toast.show('Logged in as Dr. Himani Kaur (Teacher)', 'success');
      navigate('/');
    } else {
      login(MOCK_STUDENT);
      toast.show('Logged in as Rahul Mehta (Student)', 'success');
      navigate('/student-view');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-[#153A5B]">
      {/* Top Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center mb-1">
          <img src="/academic-logo.png" alt="Academic Logo" className="w-20 h-20 object-contain drop-shadow-md" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#153A5B] tracking-tight">
            ArambhX
          </h1>
          <p className="text-xs font-mono font-bold text-[#2A8588] tracking-wider uppercase mt-0.5">
            Student Dropout & Intervention System
          </p>
        </div>
      </div>

      {/* Main Form Container Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white border border-[#D9E8E7] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Two Tabs Toggle */}
          <div className="bg-[#EDF7F8] p-1.5 rounded-2xl border border-[#D9E8E7] flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center ${
                activeTab === 'login'
                  ? 'bg-[#D7EEEE] text-[#153A5B] shadow-sm border border-[#C4E2E2]'
                  : 'text-[#607580] hover:text-[#153A5B]'
              }`}
            >
              Log In
            </button>

            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center ${
                activeTab === 'register'
                  ? 'bg-[#D7EEEE] text-[#153A5B] shadow-sm border border-[#C4E2E2]'
                  : 'text-[#607580] hover:text-[#153A5B]'
              }`}
            >
              Sign In / Register
            </button>
          </div>

          {/* TAB 1: LOG IN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5 text-xs text-[#153A5B]">
              
              {/* Role Selector Toggle Chips */}
              <div>
                <label className="block text-[#153A5B] font-extrabold mb-2">
                  Select Role: <span className="text-[#C84C4C]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('STUDENT');
                      setLoginRoll('2024-CS-101');
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-extrabold transition-all ${
                      loginRole === 'STUDENT'
                        ? 'bg-[#EDF7F8] border-[#2A8588] text-[#2A8588] shadow-sm'
                        : 'bg-white border-[#D9E8E7] text-[#607580] hover:border-[#2A8588]'
                    }`}
                  >
                    <GraduationCap size={16} />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('TEACHER');
                      setLoginRoll('FAC-8021');
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-extrabold transition-all ${
                      loginRole === 'TEACHER'
                        ? 'bg-[#EDF7F8] border-[#2A8588] text-[#2A8588] shadow-sm'
                        : 'bg-white border-[#D9E8E7] text-[#607580] hover:border-[#2A8588]'
                    }`}
                  >
                    <UserCheck size={16} />
                    <span>Teacher / Faculty</span>
                  </button>
                </div>
              </div>

              {/* Roll / Enrollment Number or Faculty ID */}
              <div>
                <label className="block text-[#153A5B] font-bold mb-1.5">
                  {loginRole === 'TEACHER' ? 'Faculty ID:' : 'Roll Number / Enrollment Number:'} <span className="text-[#C84C4C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={loginRoll}
                  onChange={(e) => setLoginRoll(e.target.value)}
                  placeholder={loginRole === 'TEACHER' ? 'e.g. FAC-8021' : 'e.g. 2024-CS-101'}
                  className="w-full bg-[#F8FAF9] border border-[#D9E8E7] text-[#153A5B] rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-[#2A8588] placeholder-[#607580]"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[#153A5B] font-bold">
                    Password: <span className="text-[#C84C4C]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-bold text-[#2A8588] hover:underline flex items-center gap-1"
                  >
                    <KeyRound size={12} />
                    <span>Forgot Password?</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#F8FAF9] border border-[#D9E8E7] text-[#153A5B] rounded-xl pl-3.5 pr-10 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-[#2A8588] placeholder-[#607580]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607580] hover:text-[#153A5B]"
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>


              </div>

              {/* Visually Distinct CAPTCHA Box */}
              <div className="space-y-2 bg-[#EDF7F8] border border-[#D9E8E7] p-3.5 rounded-2xl">
                <label className="block text-[#153A5B] font-bold">
                  CAPTCHA Code Verification: <span className="text-[#C84C4C]">*</span>
                </label>

                <div className="flex items-center gap-3">
                  {/* CAPTCHA Display Box */}
                  <div className="flex-1 bg-[#153A5B] text-white px-4 py-2 rounded-xl flex items-center justify-between font-mono tracking-widest text-lg font-black select-none shadow-inner">
                    <span className="line-through decoration-[#2A8588] decoration-2">{loginCaptchaCode}</span>
                    <button
                      type="button"
                      onClick={handleRefreshLoginCaptcha}
                      className="p-1 rounded-lg hover:bg-white/10 text-[#2A8588] transition"
                      title="Regenerate CAPTCHA Code"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  {/* Input Field */}
                  <input
                    type="text"
                    required
                    value={loginCaptchaInput}
                    onChange={(e) => setLoginCaptchaInput(e.target.value)}
                    placeholder="Enter code"
                    className="w-32 bg-[#FFFFFF] border border-[#D9E8E7] text-[#153A5B] rounded-xl px-3 py-2 text-center font-mono font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2A8588]"
                  />
                </div>
              </div>

              {/* Log In Primary Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#2A8588] hover:bg-[#216B6D] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#2A8588]/20 transition flex items-center justify-center gap-2"
              >
                <Lock size={16} />
                <span>Log In</span>
              </button>



            </form>
          )}

          {/* TAB 2: SIGN IN / REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs text-[#153A5B]">
              
              {/* Profile Photo Avatar Upload */}
              <div className="flex flex-col items-center justify-center space-y-2 pb-2">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-[#EDF7F8] border-2 border-[#2A8588] flex items-center justify-center overflow-hidden shadow-md">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={24} className="text-[#2A8588]" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#2A8588] text-white cursor-pointer shadow hover:scale-110 transition">
                    <Upload size={12} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-[11px] text-[#607580] font-medium">Upload Profile Photo (Optional)</span>
              </div>

              {/* Name Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">
                    First Name: <span className="text-[#C84C4C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="e.g. Aarav"
                    className="w-full bg-[#F8FAF9] border border-[#D9E8E7] text-[#153A5B] rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-[#2A8588]"
                  />
                </div>

                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">Middle Name:</label>
                  <input
                    type="text"
                    value={regMiddleName}
                    onChange={(e) => setRegMiddleName(e.target.value)}
                    placeholder="e.g. Kumar"
                    className="w-full bg-[#F8FAF9] border border-[#D9E8E7] text-[#153A5B] rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#2A8588]"
                  />
                </div>

                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">
                    Last Name: <span className="text-[#C84C4C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full bg-[#F8FAF9] border border-[#D9E8E7] text-[#153A5B] rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-[#2A8588]"
                  />
                </div>
              </div>

              {/* Roll Number & Role Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">
                    {regRole === 'TEACHER' ? 'Faculty ID:' : 'Roll / Enrollment No:'} <span className="text-[#C84C4C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regRoll}
                    onChange={(e) => setRegRoll(e.target.value)}
                    placeholder={regRole === 'TEACHER' ? 'e.g. FAC-8021' : 'e.g. 2024-CS-108'}
                    className="w-full bg-[#F8FAF9] border border-[#D9E8E7] text-[#153A5B] rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-[#2A8588]"
                  />
                </div>

                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">
                    Role: <span className="text-[#C84C4C]">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole('STUDENT')}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                        regRole === 'STUDENT'
                          ? 'bg-[#EDF7F8] border-[#2A8588] text-[#2A8588]'
                          : 'bg-white border-[#D9E8E7] text-[#607580]'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('TEACHER')}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                        regRole === 'TEACHER'
                          ? 'bg-[#EDF7F8] border-[#2A8588] text-[#2A8588]'
                          : 'bg-white border-[#D9E8E7] text-[#607580]'
                      }`}
                    >
                      Teacher
                    </button>
                  </div>
                </div>
              </div>

              {/* Mandatory Parents' 10-Digit Mobile Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">
                    Mother's Mobile Number: <span className="text-[#C84C4C]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regMotherPhone}
                    onChange={handleMotherPhoneChange}
                    placeholder="10-digit mobile number"
                    className={`w-full bg-[#F8FAF9] border text-[#153A5B] rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 ${
                      regMotherPhone.length > 0
                        ? isMotherPhoneValid
                          ? 'border-[#3A8F6A] focus:ring-[#3A8F6A]'
                          : 'border-[#C84C4C] focus:ring-[#C84C4C]'
                        : 'border-[#D9E8E7] focus:ring-[#2A8588]'
                    }`}
                  />
                  {regMotherPhone.length > 0 && !isMotherPhoneValid && (
                    <div className="mt-1 text-[11px] font-bold text-[#C84C4C] flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Please enter a valid 10-digit mobile number.</span>
                    </div>
                  )}
                  {isMotherPhoneValid && (
                    <div className="mt-1 text-[11px] font-bold text-[#3A8F6A] flex items-center gap-1">
                      <Check size={12} className="stroke-[3] shrink-0" />
                      <span>Valid 10-digit number</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">
                    Father's Mobile Number: <span className="text-[#C84C4C]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regFatherPhone}
                    onChange={handleFatherPhoneChange}
                    placeholder="10-digit mobile number"
                    className={`w-full bg-[#F8FAF9] border text-[#153A5B] rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 ${
                      regFatherPhone.length > 0
                        ? isFatherPhoneValid
                          ? 'border-[#3A8F6A] focus:ring-[#3A8F6A]'
                          : 'border-[#C84C4C] focus:ring-[#C84C4C]'
                        : 'border-[#D9E8E7] focus:ring-[#2A8588]'
                    }`}
                  />
                  {regFatherPhone.length > 0 && !isFatherPhoneValid && (
                    <div className="mt-1 text-[11px] font-bold text-[#C84C4C] flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Please enter a valid 10-digit mobile number.</span>
                    </div>
                  )}
                  {isFatherPhoneValid && (
                    <div className="mt-1 text-[11px] font-bold text-[#3A8F6A] flex items-center gap-1">
                      <Check size={12} className="stroke-[3] shrink-0" />
                      <span>Valid 10-digit number</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Passwords Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">
                    Password: <span className="text-[#C84C4C]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter password"
                      className={`w-full bg-[#F8FAF9] border text-[#153A5B] rounded-xl pl-3 pr-9 py-2 font-bold focus:outline-none focus:ring-2 ${
                        regPassword.length > 0
                          ? isPasswordValid
                            ? 'border-[#3A8F6A] focus:ring-[#3A8F6A]'
                            : 'border-[#C84C4C] focus:ring-[#C84C4C]'
                          : 'border-[#D9E8E7] focus:ring-[#2A8588]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#607580] hover:text-[#153A5B]"
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#153A5B] font-bold mb-1">
                    Confirm Password: <span className="text-[#C84C4C]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full bg-[#F8FAF9] border text-[#153A5B] rounded-xl pl-3 pr-9 py-2 font-bold focus:outline-none focus:ring-2 ${
                        regConfirmPassword.length > 0
                          ? isConfirmMatch
                            ? 'border-[#3A8F6A] focus:ring-[#3A8F6A]'
                            : 'border-[#C84C4C] focus:ring-[#C84C4C]'
                          : 'border-[#D9E8E7] focus:ring-[#2A8588]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#607580] hover:text-[#153A5B]"
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Real-time Confirm Password Feedback */}
                  {regConfirmPassword.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                      {isConfirmMatch ? (
                        <>
                          <Check size={12} className="text-[#3A8F6A] stroke-[3]" />
                          <span className="text-[#3A8F6A]">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} className="text-[#C84C4C]" />
                          <span className="text-[#C84C4C]">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* REAL-TIME PASSWORD REQUIREMENTS HELPER BOX */}
              <div className="bg-[#EDF7F8] border border-[#D9E8E7] p-3.5 rounded-2xl space-y-2">
                <span className="text-xs font-extrabold text-[#153A5B] block">
                  Password must contain:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Requirement 1: At least 6 characters */}
                  <div
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      isMinLength ? 'text-[#3A8F6A] font-bold' : 'text-[#607580]'
                    }`}
                  >
                    {isMinLength ? (
                      <Check size={14} className="text-[#3A8F6A] shrink-0 stroke-[3]" />
                    ) : (
                      <Circle size={10} className="text-[#607580] shrink-0" />
                    )}
                    <span>At least 6 characters</span>
                  </div>

                  {/* Requirement 2: At least 1 uppercase letter (A–Z) */}
                  <div
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      hasUppercase ? 'text-[#3A8F6A] font-bold' : 'text-[#607580]'
                    }`}
                  >
                    {hasUppercase ? (
                      <Check size={14} className="text-[#3A8F6A] shrink-0 stroke-[3]" />
                    ) : (
                      <Circle size={10} className="text-[#607580] shrink-0" />
                    )}
                    <span>At least 1 uppercase letter (A–Z)</span>
                  </div>

                  {/* Requirement 3: At least 1 number (0–9) */}
                  <div
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      hasNumber ? 'text-[#3A8F6A] font-bold' : 'text-[#607580]'
                    }`}
                  >
                    {hasNumber ? (
                      <Check size={14} className="text-[#3A8F6A] shrink-0 stroke-[3]" />
                    ) : (
                      <Circle size={10} className="text-[#607580] shrink-0" />
                    )}
                    <span>At least 1 number (0–9)</span>
                  </div>

                  {/* Requirement 4: At least 1 special character */}
                  <div
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      hasSpecialChar ? 'text-[#3A8F6A] font-bold' : 'text-[#607580]'
                    }`}
                  >
                    {hasSpecialChar ? (
                      <Check size={14} className="text-[#3A8F6A] shrink-0 stroke-[3]" />
                    ) : (
                      <Circle size={10} className="text-[#607580] shrink-0" />
                    )}
                    <span>At least 1 special character (e.g. @, #, $, %, !)</span>
                  </div>
                </div>
              </div>

              {/* CAPTCHA */}
              <div className="space-y-1.5 bg-[#EDF7F8] border border-[#D9E8E7] p-3 rounded-2xl">
                <label className="block text-[#153A5B] font-bold">
                  CAPTCHA Verification: <span className="text-[#C84C4C]">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#153A5B] text-white px-3 py-1.5 rounded-xl flex items-center justify-between font-mono tracking-widest text-base font-black select-none">
                    <span className="line-through decoration-[#2A8588] decoration-2">{regCaptchaCode}</span>
                    <button
                      type="button"
                      onClick={handleRefreshRegCaptcha}
                      className="p-1 text-[#2A8588]"
                      title="Regenerate CAPTCHA Code"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={regCaptchaInput}
                    onChange={(e) => setRegCaptchaInput(e.target.value)}
                    placeholder="Code"
                    className="w-28 bg-[#FFFFFF] border border-[#D9E8E7] text-[#153A5B] rounded-xl px-3 py-1.5 text-center font-mono font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2A8588]"
                  />
                </div>
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={!isPasswordValid || !isConfirmMatch || !isMotherPhoneValid || !isFatherPhoneValid}
                className={`w-full py-3.5 rounded-xl text-white font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                  isPasswordValid && isConfirmMatch && isMotherPhoneValid && isFatherPhoneValid
                    ? 'bg-[#2A8588] hover:bg-[#216B6D] shadow-[#2A8588]/20 cursor-pointer'
                    : 'bg-[#607580]/40 cursor-not-allowed'
                }`}
              >
                <UserCheck size={16} />
                <span>Create Account</span>
              </button>

            </form>
          )}

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-[#153A5B]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D9E8E7] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-[#153A5B]">
            <div className="flex items-center justify-between border-b border-[#D9E8E7] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EDF7F8] border border-[#D9E8E7] flex items-center justify-center text-[#2A8588]">
                  <KeyRound size={18} />
                </div>
                <h3 className="font-extrabold text-base text-[#153A5B]">Password Recovery & Reset</h3>
              </div>
              <button onClick={() => setShowForgotPassword(false)} className="text-[#607580] hover:text-[#153A5B] p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#607580] font-medium leading-relaxed">
              Enter your Roll / Enrollment Number or registered University Email below. A password reset link will be sent to your recovery contacts.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#153A5B] mb-1">
                Roll Number or Email: <span className="text-[#C84C4C]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. 2024-CS-101 or himani.kaur@university.edu"
                  className="w-full bg-[#F8FAF9] border border-[#D9E8E7] text-[#153A5B] rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#2A8588]"
                />
                <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607580]" />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#D9E8E7] text-[#607580] hover:bg-[#F8FAF9] font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!forgotEmail.trim()) {
                    toast.show('Please enter your Roll Number or Email', 'error');
                    return;
                  }
                  toast.show(`Password reset link sent for ${forgotEmail}`, 'success');
                  setShowForgotPassword(false);
                  setForgotEmail('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#2A8588] hover:bg-[#216B6D] text-white font-extrabold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <KeyRound size={14} />
                <span>Send Reset Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
