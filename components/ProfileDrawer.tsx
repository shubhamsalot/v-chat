"use client";

import React, { useState } from "react";
import { X, User, ShieldCheck, Award, LogOut, Globe, Sparkles } from "lucide-react";
import { COUNTRIES } from "@/lib/data/countries";
import { Gender, UserAccount, UserProfile } from "@/lib/types";

interface ProfileDrawerProps {
  isOpen: boolean;
  user: UserAccount | UserProfile | null;
  onClose: () => void;
  onUpdate: (updated: Partial<UserAccount>) => void;
  onLogout: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  user,
  onClose,
  onUpdate,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [country, setCountry] = useState(user?.country || "GLOBAL");
  const [gender, setGender] = useState<Gender>(user?.gender || "all");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: (user as any).id || (user as any).uid,
          displayName,
          country,
          gender,
          bio,
          ageConfirmed: user.ageConfirmed,
          isAnonymous: user.isAnonymous,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        onUpdate(data.profile);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm h-full bg-surface border-l border-surface-border p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text">
              My Profile & Karma
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="flex items-center gap-4 p-4 rounded bg-background border border-surface-border mb-6">
            <img
              src={
                user.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                  (user as any).id || (user as any).uid
                )}`
              }
              alt="avatar"
              className="w-14 h-14 rounded-full border border-surface-border bg-surface"
            />
            <div>
              <h4 className="text-sm font-bold text-text flex items-center gap-1.5">
                <span>{user.displayName}</span>
                {user.ageConfirmed && (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono text-text-muted">
                  {user.isAnonymous ? "Guest Account" : (user as UserAccount).email || "Verified Member"}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-amber-400 font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>{(user as any).karmaScore ?? 100} Karma</span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={24}
                className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text focus:outline-none focus:border-accent"
              />
            </div>

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
                Gender
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

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Bio / Status (Optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                maxLength={100}
                placeholder="Looking for chill chats..."
                className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text placeholder:text-text-dark focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded bg-surface-muted hover:bg-surface-border border border-surface-border text-xs font-bold uppercase tracking-wider text-text transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Footer Logout */}
        <div className="pt-6 border-t border-surface-border">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded border border-danger/40 text-danger hover:bg-danger/10 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out / Reset
          </button>
        </div>
      </div>
    </div>
  );
};
