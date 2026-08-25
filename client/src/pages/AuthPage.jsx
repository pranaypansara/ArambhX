import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import {
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  Check,
  AlertCircle,
  Mail,
  IdCard,
  ArrowRight,
  User,
  Briefcase,
} from "lucide-react";

const PUBLIC_ROLES = [
  {
    role: "STUDENT",
    label: "Student",
    icon: User,
    description: "I am a student. I will link my student profile.",
  },
  {
    role: "FACULTY",
    label: "Faculty",
    icon: Briefcase,
    description: "I am a faculty/staff member.",
  },
];

function destinationForRole(role) {
  return role === "STUDENT" ? "/student-view" : "/";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, initializing, role } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("login"); // 'login' | 'register'
  const [submitting, setSubmitting] = useState(false);

  // Log In Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState(""); // 'STUDENT' | 'FACULTY'
  const [regStudentId, setRegStudentId] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const isMinLength = regPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
    regPassword,
  );
  const isPasswordValid =
    isMinLength && hasUppercase && hasNumber && hasSpecialChar;
  const isConfirmMatch =
    regPassword.length > 0 &&
    regConfirmPassword.length > 0 &&
    regPassword === regConfirmPassword;

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
      toast.show(`Welcome back, ${user.name}!`, "success");
      navigate(destinationForRole(user.role), { replace: true });
    } catch (err) {
      toast.show(
        err.message || "Unable to log in. Please check your credentials.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!regRole) {
        throw new Error("Please select a role (Student or Faculty)");
      }

      const payload = {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      };

      if (regRole === "STUDENT") {
        if (!regStudentId.trim()) {
          throw new Error("Student ID is required for Student registration");
        }
        payload.studentId = Number(regStudentId.trim());
      }

      const created = await register(payload);
      toast.show(
        `Account created for ${created.name}. Please sign in to continue.`,
        "success",
      );
      setActiveTab("login");
      setLoginEmail(regEmail.trim());
      setRegPassword("");
      setRegConfirmPassword("");
      setRegStudentId("");
      setRegRole("");
    } catch (err) {
      toast.show(err.message || "Unable to create your account.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (valid) =>
    `w-full bg-void border text-ink rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:ring-2 ${
      valid === false
        ? "border-coral-dim focus:ring-coral-dim"
        : "border-hairline focus:ring-teal"
    }`;

  return (
    <div className="min-h-screen bg-void flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-ink">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center mb-1">
          <img
            src="/academic-logo.png"
            alt="Academic Logo"
            className="w-20 h-20 object-contain drop-shadow-md"
          />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
            ArambhX
          </h1>
          <p className="text-xs font-mono font-bold text-teal tracking-wider uppercase mt-0.5">
            Student Dropout & Intervention System
          </p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-panel border border-hairline rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="bg-panel-alt p-1.5 rounded-2xl border border-hairline flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center ${
                activeTab === "login"
                  ? "bg-[var(--color-panel-active)] text-ink shadow-sm border border-[var(--color-panel-active-border)]"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center ${
                activeTab === "register"
                  ? "bg-[var(--color-panel-active)] text-ink shadow-sm border border-[var(--color-panel-active-border)]"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              Register
            </button>
          </div>

          {activeTab === "login" && (
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-5 text-xs text-ink"
            >
              <div>
                <label className="block text-ink font-bold mb-1.5">
                  Email Address: <span className="text-coral-dim">*</span>
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
                <label className="block text-ink font-bold mb-1.5">
                  Password: <span className="text-coral-dim">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`${inputClass()} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-ink"
                  >
                    {showLoginPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 rounded-xl text-white font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                  submitting
                    ? "bg-slate-500/50 cursor-wait"
                    : "bg-teal hover:bg-[var(--color-teal-dim)] shadow-teal/20"
                }`}
              >
                <Lock size={16} />
                <span>{submitting ? "Signing in…" : "Log In"}</span>
              </button>

              <p className="text-center text-[11px] text-slate-500 font-medium">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="font-extrabold text-teal hover:underline inline-flex items-center gap-1"
                >
                  Register an account <ArrowRight size={12} />
                </button>
              </p>
            </form>
          )}

          {activeTab === "register" && (
            <form
              onSubmit={handleRegisterSubmit}
              className="space-y-4 text-xs text-ink"
            >
              <div>
                <label className="block text-ink font-bold mb-2">
                  Register as: <span className="text-coral-dim">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PUBLIC_ROLES.map((r) => (
                    <button
                      type="button"
                      key={r.role}
                      onClick={() => setRegRole(r.role)}
                      className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                        regRole === r.role
                          ? "bg-[var(--color-panel-active)] border-teal shadow-sm"
                          : "bg-panel border-hairline hover:border-teal"
                      }`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-panel-alt text-teal mb-2">
                        <r.icon size={20} className="text-teal" />
                      </div>
                      <span className="font-extrabold text-ink">
                        {r.label}
                      </span>
                      <p className="text-[10px] text-slate-500 text-center">
                        {r.description}
                      </p>
                    </button>
                  ))}
                </div>
                {!regRole && (
                  <p className="text-[11px] text-coral-dim text-center mt-1">
                    Please select a role to continue
                  </p>
                )}
              </div>

              <div>
                <label className="block text-ink font-bold mb-1">
                  Full Name: <span className="text-coral-dim">*</span>
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
                <label className="block text-ink font-bold mb-1">
                  Email Address: <span className="text-coral-dim">*</span>
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
                  <Mail
                    size={15}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              {regRole === "STUDENT" && (
                <div>
                  <label className="block text-ink font-bold mb-1">
                    Student ID: <span className="text-coral-dim">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      required
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      placeholder="e.g. 15 (numeric database ID)"
                      className={`${inputClass()} pr-9`}
                    />
                    <IdCard
                      size={15}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-coral-dim">
                    Student ID is required for Student registration. It must
                    reference a valid existing student.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink font-bold mb-1">
                    Password: <span className="text-coral-dim">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter password"
                      className={`${inputClass(regPassword.length > 0 ? isPasswordValid : undefined)} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-ink"
                    >
                      {showRegPassword ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-ink font-bold mb-1">
                    Confirm Password: <span className="text-coral-dim">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`${inputClass(regConfirmPassword.length > 0 ? isConfirmMatch : undefined)} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-ink"
                    >
                      {showRegPassword ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                    </button>
                  </div>
                  {regConfirmPassword.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                      {isConfirmMatch ? (
                        <>
                          <Check
                            size={12}
                            className="text-lime stroke-[3]"
                          />
                          <span className="text-lime">
                            Passwords match
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} className="text-coral-dim" />
                          <span className="text-coral-dim">
                            Passwords do not match
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-panel-alt border border-hairline p-3.5 rounded-2xl space-y-2">
                <span className="text-xs font-extrabold text-ink block">
                  Password must contain:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <Requirement ok={isMinLength} text="At least 8 characters" />
                  <Requirement
                    ok={hasUppercase}
                    text="At least 1 uppercase letter (A–Z)"
                  />
                  <Requirement ok={hasNumber} text="At least 1 number (0–9)" />
                  <Requirement
                    ok={hasSpecialChar}
                    text="At least 1 special character (e.g. @, #, $, !)"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isPasswordValid || !isConfirmMatch}
                className={`w-full py-3.5 rounded-xl text-white font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                  submitting || !isPasswordValid || !isConfirmMatch
                    ? "bg-slate-500/40 cursor-not-allowed"
                    : "bg-teal hover:bg-[var(--color-teal-dim)] shadow-teal/20"
                }`}
              >
                <UserCheck size={16} />
                <span>
                  {submitting ? "Creating account…" : "Create Account"}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Requirement({ ok, text }) {
  return (
    <div
      className={`flex items-center gap-1.5 font-medium transition-colors ${ok ? "text-lime font-bold" : "text-slate-500"}`}
    >
      {ok ? (
        <Check size={14} className="text-lime shrink-0 stroke-[3]" />
      ) : (
        <CircleDot size={10} className="text-slate-500 shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
}

function CircleDot({ size = 10, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      className={className}
    >
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
