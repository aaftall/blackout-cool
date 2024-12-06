import { createClient } from '@supabase/supabase-js'

export type Database = {
  public: {
    Tables: {
      community_members: {
        Row: {
          id: string;
          community_id: string;
          user_id: string;
          user_role: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          user_id: string;
          user_role: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          user_id?: string;
          user_role?: string;
        };
      };
    };
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseKey) 