"use client";

import React, { useState } from "react";
import { X, Lock, Mail, User, ShieldCheck, Sparkles, Check, AlertCircle } from "lucide-react";
import { COUNTRIES } from "@/lib/data/countries";
import { Gender, UserAccount } from "@/lib/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: UserAccount) => void;
}

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Luna",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Shadow",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Nova",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Spark",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo",
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [tab, setTab] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("GLOBAL");
  const [gender, setGender] = useState<Gender>("all");
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_OPTIONS[0]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const endpoint = tab === "signup" ? "/api/auth/register" : "/api/auth/login";
      const body =
        tab === "signup"
          ? { email, password, displayName, country, gender, avatarUrl }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Authentication failed. Please check credentials.");
        setLoading(false);
        return;
      }

      onSuccess(data.account);
      onClose();
    } catch (err: any) {
      setErrorMessage("Network error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-surface border border-surface-border rounded-md shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tab Switcher */}
        <div className="flex border-b border-surface-border mb-6">
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setErrorMessage(null);
            }}
            className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              tab === "signup"
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMessage(null);
            }}
            className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              tab === "login"
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            Sign In
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded bg-danger/10 border border-danger/40 text-danger text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && (
            <>
              {/* Avatar Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-text-muted mb-2">
                  Choose Avatar
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {AVATAR_OPTIONS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="avatar"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-10 h-10 rounded-full border-2 p-0.5 cursor-pointer bg-background transition-all ${
                        avatarUrl === url
                          ? "border-accent scale-105"
                          : "border-surface-border opacity-70 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-text-dark" />
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={24}
                  className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text placeholder:text-text-dark focus:outline-none focus:border-accent"
                />
              </div>

              {/* Country & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text focus:outline-none focus:border-accent"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    Your Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text focus:outline-none focus:border-accent"
                  >
                    <option value="all">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-text-dark" />
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text placeholder:text-text-dark focus:outline-none focus:border-accent"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-text-dark" />
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text placeholder:text-text-dark focus:outline-none focus:border-accent"
            />
          </div>

          {tab === "signup" && (
            <div className="flex items-center gap-2 text-[11px] text-text-muted bg-background p-2.5 rounded border border-surface-border">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
              <span>Creating an account automatically certifies you are 18+ and unlocks karma stats & history.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? "Processing..." : tab === "signup" ? "Create Free Account" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};
