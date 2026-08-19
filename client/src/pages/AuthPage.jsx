import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  UserCheck,
  GraduationCap,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Check,
  AlertCircle,
  X,
  KeyRound,
  Mail,
  IdCard,
  Users,
  ArrowRight,
} from 'lucide-react';

const ROLES_PREVIEW = [
  { role: 'ADMIN', label: 'Administrator' },
  { role: 'FACULTY', label: 'Faculty' },
  { role: 'COUNSELOR', label: 'Counselor' },
  { role: 'STUDENT', label: 'Student' },
];

function destinationForRole(role) {
  return role === 'STUDENT' ? '/student-view' : '/';
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, initializing, role } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [submitting, setSubmitting] = useState(false);

  // Log In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const isMinLength = regPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword);
  const isPasswordValid = isMinLength && hasUppercase && hasNumber && hasSpecialChar;
  const isConfirmMatch = regPassword.length > 0 && regConfirmPassword.length > 0 && regPassword === regConfirmPassword;

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate(destinationForRole(role), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, isAuthenticated, role]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(loginEmail.trim(), loginPassword);
      toast.show(`Welcome back, ${user.name}!`, 'success');
      navigate(destinationForRole(user.role), { replace: true });
    } catch (err) {
      toast.show(err.message || 'Unable to log in. Please check your credentials.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        studentId: regStudentId.trim() ? Number(regStudentId.trim()) : null,
      });
      toast.show(`Account created for ${created.name}. Please sign in to continue.`, 'success');
      setActiveTab('login');
      setLoginEmail(regEmail.trim());
      setRegPassword('');
      setRegConfirmPassword('');
    } catch (err) {
      toast.show(err.message || 'Unable to create your account.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (valid) =>
    `w-full bg-[#F8FAF9] border text-[#153A5B] rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:ring-2 ${
      valid === false
        ? 'border-[#C84C4C] focus:ring-[#C84C4C]'
        : 'border-[#D9E8E7] focus:ring-[#2A8588]'
    }`;

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-[#153A5B]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center mb-1">
          <img src="/academic-logo.png" alt="Academic Logo" className="w-20 h-20 object-contain drop-shadow-md" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#153A5B] tracking-tight">ArambhX</h1>
          <p className="text-xs font-mono font-bold text-[#2A8588] tracking-wider uppercase mt-0.5">
            Student Dropout & Intervention System
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white border border-[#D9E8E7] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="bg-[#EDF7F8] p-1.5 rounded-2xl border border-[#D9E8E7] flex items-center gap-1.5">
            <button
              type="button"
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
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center ${
                activeTab === 'register'
                  ? 'bg-[#D7EEEE] text-[#153A5B] shadow-sm border border-[#C4E2E2]'
                  : 'text-[#607580] hover:text-[#153A5B]'
              }`}
            >
              Register
            </button>
          </div>

          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5 text-xs text-[#153A5B]">
              <div>
                <label className="block text-[#153A5B] font-bold mb-1.5">
                  Email Address: <span className="text-[#C84C4C]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-[#153A5B] font-bold mb-1.5">
                  Password: <span className="text-[#C84C4C]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`${inputClass()} pr-10`}
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

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 rounded-xl text-white font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                  submitting
                    ? 'bg-[#607580]/50 cursor-wait'
                    : 'bg-[#2A8588] hover:bg-[#216B6D] shadow-[#2A8588]/20'
                }`}
              >
                <Lock size={16} />
                <span>{submitting ? 'Signing in…' : 'Log In'}</span>
              </button>

              <p className="text-center text-[11px] text-[#607580] font-medium">
                New here?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="font-extrabold text-[#2A8588] hover:underline inline-flex items-center gap-1"
                >
                  Register an account <ArrowRight size={12} />
                </button>
              </p>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs text-[#153A5B]">
              <div className="bg-[#EDF7F8] border border-[#D9E8E7] rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-[#153A5B]">
                  <ShieldCheck size={14} className="text-[#2A8588]" />
                  <span>How are roles assigned?</span>
                </div>
                <p className="text-[11px] text-[#607580] font-medium leading-relaxed">
                  Your role is decided automatically by the platform.
                  Providing your student ID links the account to your student profile and registers you as a{' '}
                  <span className="font-bold text-[#153A5B]">Student</span>. Without a student ID you are registered as{' '}
                  <span className="font-bold text-[#153A5B]">Faculty</span>. Administrator and Counselor accounts are
                  created by an existing Administrator.
                </p>
              </div>

              <div>
                <label className="block text-[#153A5B] font-bold mb-1">
                  Full Name: <span className="text-[#C84C4C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-[#153A5B] font-bold mb-1">
                  Email Address: <span className="text-[#C84C4C]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className={`${inputClass()} pr-9`}
                  />
                  <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607580]" />
                </div>
              </div>

              <div>
                <label className="block text-[#153A5B] font-bold mb-1">
                  Student ID (optional): <span className="text-[#607580] font-medium">links you to your profile</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value)}
                    placeholder="e.g. 15 (numeric database ID)"
                    className={`${inputClass()} pr-9`}
                  />
                  <IdCard size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#607580]" />
                </div>
                <p className="mt-1 text-[11px] text-[#607580]">
                  Leave blank to register as Faculty. Student registrations MUST reference a valid existing student.
                </p>
              </div>

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
                      className={`${inputClass(regPassword.length > 0 ? isPasswordValid : undefined)} pr-9`}
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
                      className={`${inputClass(regConfirmPassword.length > 0 ? isConfirmMatch : undefined)} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#607580] hover:text-[#153A5B]"
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
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

              <div className="bg-[#EDF7F8] border border-[#D9E8E7] p-3.5 rounded-2xl space-y-2">
                <span className="text-xs font-extrabold text-[#153A5B] block">Password must contain:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <Requirement ok={isMinLength} text="At least 8 characters" />
                  <Requirement ok={hasUppercase} text="At least 1 uppercase letter (A–Z)" />
                  <Requirement ok={hasNumber} text="At least 1 number (0–9)" />
                  <Requirement ok={hasSpecialChar} text="At least 1 special character (e.g. @, #, $, !)" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isPasswordValid || !isConfirmMatch}
                className={`w-full py-3.5 rounded-xl text-white font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                  submitting || !isPasswordValid || !isConfirmMatch
                    ? 'bg-[#607580]/40 cursor-not-allowed'
                    : 'bg-[#2A8588] hover:bg-[#216B6D] shadow-[#2A8588]/20'
                }`}
              >
                <UserCheck size={16} />
                <span>{submitting ? 'Creating account…' : 'Create Account'}</span>
              </button>
            </form>
          )}

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {ROLES_PREVIEW.map((r) => (
              <span
                key={r.role}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EDF7F8] border border-[#D9E8E7] text-[10px] font-bold text-[#607580]"
              >
                <GraduationCap size={11} className="text-[#2A8588]" />
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Requirement({ ok, text }) {
  return (
    <div className={`flex items-center gap-1.5 font-medium transition-colors ${ok ? 'text-[#3A8F6A] font-bold' : 'text-[#607580]'}`}>
      {ok ? (
        <Check size={14} className="text-[#3A8F6A] shrink-0 stroke-[3]" />
      ) : (
        <CircleDot size={10} className="text-[#607580] shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
}

function CircleDot({ size = 10, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className}>
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}