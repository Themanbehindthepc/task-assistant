import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function createSafeClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Allow static builds to complete without credentials, but runtime usage will fail clearly.
    if (typeof window === 'undefined') {
      return {} as ReturnType<typeof createClient>;
    }
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = createSafeClient();

export type Task = {
  id: string;
  user_id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  due_date: string | null;
  note: string;
  recurrence: 'none' | 'daily' | 'weekly';
  completed: boolean;
  created_at: string;
  updated_at: string;
};
