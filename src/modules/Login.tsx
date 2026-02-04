import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";
import { isDemoModeEnabled } from "../demo/demoMode";
import { api } from "../services/api";
import { getApiBase } from "../services/apiBase";
import { setAuthToken, setWorkspaceId } from "../services/authStorage";

function LexiProLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
        <svg viewBox="0 0 48 48" className="h-6 w-6 text-blue-400" role="img" aria-label="LexiPro logo">
          <path
            fill="currentColor"
            d="M24 4l16 6v12c0 10-7.5 18.5-16 22-8.5-3.5-16-12-16-22V10l16-6z"
          />
        </svg>
      </div>
      <div>
        <div className="text-lg font-bold tracking-tight text-white leading-none">LexiPro</div>
        <div className="text-[10px] font-medium text-slate-400 tracking-[0.2em] uppercase mt-1">Forensic OS</div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-300">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
        <i className={`fa-solid ${icon} text-xs`} />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

export default function Login() {
  const nav = useNavigate();
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const demoHost = host === "lexipro.online" || host === "www.lexipro.online";
  const demoPrefill =
    String(import.meta.env.VITE_DEMO_PREFILL || (demoHost ? "1" : "")) === "1";
  const demoAutoSignIn =
    String(import.meta.env.VITE_DEMO_AUTOSIGNIN || (demoHost ? "1" : "")) === "1";
  const demoEmail = String(import.meta.env.VITE_DEMO_EMAIL || "demo@lexipro.local");
  const demoPassword = String(import.meta.env.VITE_DEMO_PASSWORD || "demo1234");
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoBusy, setSsoBusy] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    setEmail((prev) => prev || demoEmail);
    setPassword((prev) => prev || demoPassword);
  }, [demoEmail, demoPassword]);

  const parseApiError = (err: any) => {
    const raw = String(err?.message || "");
    if (raw.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.error === "string") return parsed.error;
      } catch {
        // ignore
      }
    }
    if (raw.includes("MFA_REQUIRED")) return "Multi-factor authentication required.";
    if (raw.includes("MFA_INVALID")) return "Invalid multi-factor code.";
    if (raw.includes("Self-signup disabled")) return "Self-signup is disabled. Contact your admin.";
    if (raw.includes("OIDC") || raw.includes("oidc")) return "Enterprise SSO is not configured.";
    if (!raw) return "Authentication failed.";
    return raw;
  };

  const resolveWorkspace = async (fallbackId?: string) => {
    try {
      const me = await api.get("/auth/me");
      if (me?.workspaceId) {
        setWorkspaceId(String(me.workspaceId));
        return String(me.workspaceId);
      }
    } catch {
      // ignore
    }
    if (fallbackId) {
      setWorkspaceId(String(fallbackId));
      return String(fallbackId);
    }
    return null;
  };

  const normalizeCreds = (nextEmail: unknown, nextPassword: unknown) => {
    if (nextEmail && typeof nextEmail === "object") {
      const maybeEvent = nextEmail as { preventDefault?: () => void };
      if (typeof maybeEvent.preventDefault === "function") {
        maybeEvent.preventDefault();
      }
    }
    const safeEmail = typeof nextEmail === "string" ? nextEmail : email;
    const safePassword = typeof nextPassword === "string" ? nextPassword : password;
    return { safeEmail, safePassword };
  };

  const doLogin = async (nextEmail = email, nextPassword = password, nextMfaToken = mfaToken) => {
    const { safeEmail, safePassword } = normalizeCreds(nextEmail, nextPassword);
    const payload: Record<string, string> = { email: safeEmail, password: safePassword };
    const trimmedMfa = String(nextMfaToken || "").trim();
    if (trimmedMfa || mfaRequired) payload.mfaToken = trimmedMfa;
    const res = await api.post("/auth/login", payload);
    if (res?.token) {
      setAuthToken(String(res.token));
    }
    const workspaceId = await resolveWorkspace(res?.workspaceId);
    if (!workspaceId) throw new Error("Workspace assignment missing.");
    return workspaceId;
  };

  const doRegister = async (nextEmail = email, nextPassword = password) => {
    const { safeEmail, safePassword } = normalizeCreds(nextEmail, nextPassword);
    const res = await api.post("/auth/register", { email: safeEmail, password: safePassword });
    if (res?.token) {
      setAuthToken(String(res.token));
    }
    const workspaceId = await resolveWorkspace(res?.workspaceId);
    if (!workspaceId) throw new Error("Workspace assignment missing.");
    return workspaceId;
  };

  const handleLogin = async () => {
    if (busy) return;
    const nextEmail = (email || demoEmail).trim();
    const nextPassword = password || demoPassword;
    if (!nextEmail || !nextPassword) {
      setError("Email and password required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await doLogin(nextEmail, nextPassword);
      setMfaRequired(false);
      nav("/", { replace: true });
    } catch (err: any) {
      const parsed = parseApiError(err);
      if (parsed.includes("Multi-factor authentication")) {
        setMfaRequired(true);
      }
      setError(parsed);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const shouldAuto = demoAutoSignIn && isDemoModeEnabled();
    if (!shouldAuto || autoLoginAttempted || busy) return;
    if (!email || !password) return;
    setAutoLoginAttempted(true);
    handleLogin();
  }, [demoAutoSignIn, autoLoginAttempted, busy, email, password]);

  const handleRegister = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await doRegister(email, password);
      nav("/", { replace: true });
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSso = async () => {
    if (ssoBusy) return;
    setSsoBusy(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/auth/sso/status`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (data?.oidcConfigured) {
        window.location.href = `${getApiBase()}/auth/oidc/login`;
        return;
      }
      if (data?.samlConfigured) {
        setError("SAML SSO is configured. Use your IdP portal to initiate login.");
        return;
      }
      setError("Enterprise SSO is not configured.");
    } catch {
      setError("Enterprise SSO is not configured.");
    } finally {
      setSsoBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0F172A] text-slate-300 font-sans selection:bg-blue-500/30">
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-950 flex-col justify-between p-12 border-r border-white/5">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[100px]" />
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        <div className="relative z-10">
          <LexiProLogo />
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
            Truth, <span className="text-blue-400">Anchored.</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            The deterministic AI platform for forensic analysis. Every insight is
            cryptographically bound to source evidence for admissible output.
          </p>

          <div className="flex flex-col gap-3 pt-4">
            <FeatureRow icon="fa-fingerprint" text="Cryptographic Chain-of-Custody" />
            <FeatureRow icon="fa-link" text="Source-Anchored Citations" />
            <FeatureRow icon="fa-shield-halved" text="SOC2 Compliant Environment" />
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex items-center gap-4">
          <span>Copyright 2026 LexiPro Systems</span>
          <span className="h-1 w-1 rounded-full bg-slate-700" />
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            System Operational
          </span>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden mb-8">
            <LexiProLogo />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to your workspace</h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter your credentials to access the secure vault.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300">
                Email Address
                <Input
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email"
                  className="mt-1.5 w-full bg-slate-900/50 border-slate-700 focus:border-blue-500 h-11"
                  placeholder="name@firm.com"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password"
                  className="mt-1.5 w-full bg-slate-900/50 border-slate-700 focus:border-blue-500 h-11"
                  placeholder="************"
                />
              </label>
              {mfaRequired ? (
                <label className="block text-sm font-medium text-slate-300">
                  MFA Code
                  <Input
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    data-testid="login-mfa"
                    className="mt-1.5 w-full bg-slate-900/50 border-slate-700 focus:border-blue-500 h-11"
                    placeholder="123456"
                  />
                </label>
              ) : null}
            </div>

            {error ? (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                <i className="fa-solid fa-circle-exclamation mt-0.5 text-red-400" />
                <div>{error}</div>
              </div>
            ) : null}

            <Button
              variant="primary"
              onClick={handleLogin}
              disabled={busy}
              data-testid="login-submit"
              className="w-full h-11 text-sm font-semibold shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] transition-all"
            >
              {busy ? <Spinner size={16} /> : "Sign in"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleRegister}
              disabled={busy}
              className="w-full h-11 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 hover:text-white"
            >
              Create workspace account
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-700/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0F172A] px-2 text-xs uppercase text-slate-500 tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              className="w-full text-[10px] uppercase tracking-[0.25em] text-slate-500 hover:text-slate-300"
              onClick={handleSso}
              disabled={ssoBusy}
            >
              {ssoBusy ? "Checking SSO..." : "Enterprise SSO (configure)"}
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            Restricted System. Unauthorized access is prohibited and monitored.
            <br />
            Reference: 18 U.S. Code Section 1030
          </p>
        </div>
      </div>
    </div>
  );
}
