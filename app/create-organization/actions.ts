'use server';

import { createClient } from '@/utils/supabase/server';
import { createOrganization } from '@/services/organization.service';
import { FOUNDER_EMAIL, isFounderEmail } from '@/services/platform-admin.service';

export async function createOrganizationAction(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Chưa xác thực người dùng.' };
  }

  // Only founder can use this direct creator, otherwise redirect to founder contact
  if (!isFounderEmail(user.email)) {
    return { 
      success: false, 
      error: `Chức năng tạo trung tâm tự do đã bị khóa. Vui lòng liên hệ Nhà sáng lập (${FOUNDER_EMAIL}) để được kích hoạt trung tâm.` 
    };
  }

  return await createOrganization(name);
}
