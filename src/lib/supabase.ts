import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xokarwrqmeyqguwcezee.supabase.co";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhva2Fyd3JxbWV5cWd1d2NlemVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjEzMDQsImV4cCI6MjEwMjUzNzMwNH0.wZsPrTIp3mQAPX4OMk5ukGK01iGpmprNEbYFfV6Yp-o";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

export interface SupabaseUserProfile {
  id: string;
  user_id?: string;
  username: string;
  country: string;
  gender: string;
  age_confirmed: boolean;
  is_guest: boolean;
  strike_count: number;
  is_banned: boolean;
  created_at?: string;
  email?: string;
}

/**
 * Get or create local guest profile
 */
export function getStoredGuestProfile(): SupabaseUserProfile {
  if (typeof window === "undefined") {
    return {
      id: "guest_" + Math.random().toString(36).substring(2, 9),
      username: "Stranger",
      country: "Worldwide",
      gender: "unspecified",
      age_confirmed: false,
      is_guest: true,
      strike_count: 0,
      is_banned: false,
    };
  }

  const stored = localStorage.getItem("vchat_supabase_profile");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }

  const newProfile: SupabaseUserProfile = {
    id: "guest_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    username: "Stranger",
    country: "Worldwide",
    gender: "unspecified",
    age_confirmed: false,
    is_guest: true,
    strike_count: 0,
    is_banned: false,
  };

  localStorage.setItem("vchat_supabase_profile", JSON.stringify(newProfile));
  return newProfile;
}

/**
 * Save user profile to Supabase database & local cache
 */
export async function syncSupabaseProfile(profile: SupabaseUserProfile): Promise<SupabaseUserProfile> {
  if (typeof window !== "undefined") {
    localStorage.setItem("vchat_supabase_profile", JSON.stringify(profile));
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: profile.id.includes("-") ? profile.id : undefined,
        user_id: profile.user_id || (profile.is_guest ? null : profile.id),
        username: profile.username,
        country: profile.country,
        gender: profile.gender,
        age_confirmed: profile.age_confirmed,
        is_guest: profile.is_guest,
        strike_count: profile.strike_count,
        is_banned: profile.is_banned,
        last_seen: new Date().toISOString(),
      }, { onConflict: "id" })
      .select()
      .single();

    if (data) {
      const merged = { ...profile, ...data };
      if (typeof window !== "undefined") {
        localStorage.setItem("vchat_supabase_profile", JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn("Supabase profile sync error:", err);
  }

  return profile;
}

/**
 * Supabase Email Sign Up
 */
export async function signUpWithEmail(email: string, password: string, username: string, country: string, gender: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        country,
        gender,
      },
    },
  });

  if (error) throw error;

  if (data.user) {
    const profile: SupabaseUserProfile = {
      id: data.user.id,
      user_id: data.user.id,
      username: username || email.split("@")[0],
      email: data.user.email,
      country: country || "Worldwide",
      gender: gender || "unspecified",
      age_confirmed: true,
      is_guest: false,
      strike_count: 0,
      is_banned: false,
    };
    await syncSupabaseProfile(profile);
    return profile;
  }

  return null;
}

/**
 * Supabase Email Sign In
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data.user) {
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    const profile: SupabaseUserProfile = {
      id: data.user.id,
      user_id: data.user.id,
      username: dbProfile?.username || data.user.user_metadata?.username || email.split("@")[0],
      email: data.user.email,
      country: dbProfile?.country || data.user.user_metadata?.country || "Worldwide",
      gender: dbProfile?.gender || data.user.user_metadata?.gender || "unspecified",
      age_confirmed: dbProfile?.age_confirmed ?? true,
      is_guest: false,
      strike_count: dbProfile?.strike_count || 0,
      is_banned: dbProfile?.is_banned || false,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("vchat_supabase_profile", JSON.stringify(profile));
    }
    return profile;
  }

  return null;
}

/**
 * Sign Out
 */
export async function signOutSupabase() {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    localStorage.removeItem("vchat_supabase_profile");
  }
}
