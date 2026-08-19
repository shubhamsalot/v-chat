"use client";

import React, { useState } from "react";
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Globe, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  CheckCircle2,
  AlertCircle 
} from "lucide-react";
import { 
  signUpWithEmail, 
  signInWithEmail, 
  SupabaseUserProfile, 
  syncSupabaseProfile 
} from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: SupabaseUserProfile) => void;
  currentProfile: SupabaseUserProfile | null;
}

export const COUNTRIES = [
  "Worldwide",
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "India",
  "Australia",
  "Brazil",
  "Japan",
  "South Korea",
  "Italy",
  "Spain",
  "Netherlands",
  "Turkey",
  "Mexico",
  "Philippines",
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentProfile,
}) => {
  const [tab, setTab] = useState<"signin" | "signup" | "guest">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(currentProfile?.username || "Stranger");
  const [country, setCountry] = useState(currentProfile?.country || "Worldwide");
  const [gender, setGender] = useState(currentProfile?.gender || "unspecified");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "signup") {
        if (!email || !password) {
          throw new Error("Email and password are required.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        const profile = await signUpWithEmail(email, password, username, country, gender);
        if (profile) {
          onSuccess(profile);
          onClose();
        }
      } else if (tab === "signin") {
        if (!email || !password) {
          throw new Error("Email and password are required.");
        }
        const profile = await signInWithEmail(email, password);
        if (profile) {
          onSuccess(profile);
          onClose();
        }
      } else {
        // Save guest profile
        if (currentProfile) {
          const updated: SupabaseUserProfile = {
            ...currentProfile,
            username: username || "Stranger",
            country,
            gender,
          };
          const synced = await syncSupabaseProfile(updated);
          onSuccess(synced);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#141417] border border-[#2A2A35] rounded-[8px] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#24242C]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-[4px] bg-[#FF4B2B] flex items-center justify-center text-white font-black text-base">
              V
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F2F2F0] tracking-tight">
                {tab === "signup" ? "Create V-Chat Account" : tab === "signin" ? "Sign In to V-Chat" : "Guest Profile"}
              </h2>
              <p className="text-[11px] text-[#80808A]">Powered by Supabase Auth & Database</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#70707A] hover:text-[#F2F2F0] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Tabs */}
        <div className="flex items-center bg-[#0D0D0F] p-1 rounded-[6px] border border-[#202028] mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab("signup"); setError(null); }}
            className={`flex-1 py-1.5 rounded-[4px] transition-all flex items-center justify-center space-x-1.5 ${
              tab === "signup" ? "bg-[#FF4B2B] text-white shadow-sm" : "text-[#80808A] hover:text-[#D0D0D8]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab("signin"); setError(null); }}
            className={`flex-1 py-1.5 rounded-[4px] transition-all flex items-center justify-center space-x-1.5 ${
              tab === "signin" ? "bg-[#FF4B2B] text-white shadow-sm" : "text-[#80808A] hover:text-[#D0D0D8]"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab("guest"); setError(null); }}
            className={`flex-1 py-1.5 rounded-[4px] transition-all flex items-center justify-center space-x-1.5 ${
              tab === "guest" ? "bg-[#25252E] text-white shadow-sm" : "text-[#80808A] hover:text-[#D0D0D8]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Guest Info</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-[4px] flex items-start space-x-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab !== "guest" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#A0A0AA] mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-[#0D0D0F] border border-[#2A2A35] rounded-[4px] px-3.5 py-2 text-xs text-[#F2F2F0] placeholder-[#50505A] focus:outline-none focus:border-[#FF4B2B]"
                  />
                  <Mail className="w-4 h-4 text-[#50505A] absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A0A0AA] mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0D0D0F] border border-[#2A2A35] rounded-[4px] px-3.5 py-2 text-xs text-[#F2F2F0] placeholder-[#50505A] focus:outline-none focus:border-[#FF4B2B]"
                  />
                  <Lock className="w-4 h-4 text-[#50505A] absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#A0A0AA] mb-1">Display Name</label>
            <input
              type="text"
              required
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Stranger"
              className="w-full bg-[#0D0D0F] border border-[#2A2A35] rounded-[4px] px-3.5 py-2 text-xs text-[#F2F2F0] placeholder-[#50505A] focus:outline-none focus:border-[#FF4B2B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#A0A0AA] mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-[#0D0D0F] border border-[#2A2A35] rounded-[4px] px-2.5 py-2 text-xs text-[#F2F2F0] focus:outline-none focus:border-[#FF4B2B]"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-[#141417] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A0A0AA] mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-[#0D0D0F] border border-[#2A2A35] rounded-[4px] px-2.5 py-2 text-xs text-[#F2F2F0] focus:outline-none focus:border-[#FF4B2B]"
              >
                <option value="unspecified" className="bg-[#141417]">Unspecified</option>
                <option value="male" className="bg-[#141417]">Male</option>
                <option value="female" className="bg-[#141417]">Female</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-[4px] bg-[#FF4B2B] hover:bg-[#E03E20] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {tab === "signup" ? "Create Account & Save" : tab === "signin" ? "Sign In" : "Save Profile"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
