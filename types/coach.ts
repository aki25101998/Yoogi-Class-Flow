export interface Coach {
  id: string;
  organization_id: string;
  organization_member_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  cccd?: string;
  level?: string;
  membership_number?: string;
  role: 'admin' | 'coach' | string;
  permissions: string[];
  status: string;
  classCount?: number;
  created_at?: string;
  updated_at?: string;
}
