import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xokarwrqmeyqguwcezee.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhva2Fyd3JxbWV5cWd1d2NlemVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjEzMDQsImV4cCI6MjEwMjUzNzMwNH0.wZsPrTIp3mQAPX4OMk5ukGK01iGpmprNEbYFfV6Yp-o";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});
