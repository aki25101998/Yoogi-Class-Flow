export type OrganizationRole = 'owner' | 'admin' | 'head_coach' | 'assistant_coach';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string; // references profiles.id
  role: OrganizationRole;
  status: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  permissions: string[];
  invited_by: string; // references profiles.id
  status: InvitationStatus;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface ClassCoach {
  id: string;
  organization_id: string;
  class_id: string;
  coach_id: string;
  role: 'HEAD_COACH' | 'ASSISTANT_COACH';
  created_at: string;
  updated_at: string;
}

export interface OrganizationContext {
  organization: Organization | null;
  membership: OrganizationMember | null;
  profile: any | null; // Replace with Profile type if available
  coach: any | null;   // Replace with Coach type if available
  permissions: string[];
  allMemberships?: (OrganizationMember & { organization: Organization })[];
}
