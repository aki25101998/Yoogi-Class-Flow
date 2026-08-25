export interface Coach {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  phone?: string;
  cccd?: string;
  level?: string;
  membership_number?: string;
  role: 'admin' | 'coach' | string;
  permissions: string[];
  status: string;
  photo_url?: string;
  created_at?: string;
  updated_at?: string;
}
