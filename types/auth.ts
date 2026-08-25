import { User } from '@supabase/supabase-js';
import { Coach } from './coach';

export interface AuthContextType {
  user: User | null;
  coach: Coach | null;
}
