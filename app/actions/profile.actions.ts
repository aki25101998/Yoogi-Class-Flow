'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { CoachesService } from '@/services/coaches.service';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getExtensionFromMimeType = (mimeType: string) => {
  switch (mimeType) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    default: return 'jpg';
  }
};

const getFormString = (formData: FormData, key: string): string | null => {
  const val = formData.get(key);
  if (typeof val === 'string') return val.trim();
  return null;
};

export async function updateMyCoachProfile(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return { success: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    const authUserId = userData.user.id;
    
    // Get current profile & coach ID using the existing service
    const currentCoach = await CoachesService.getCoachByAuthId(authUserId);
    if (!currentCoach) {
      return { success: false, error: 'Không tìm thấy hồ sơ huấn luyện viên.' };
    }

    // Extract data from formData and validate type
    const name = getFormString(formData, 'name');
    const phone = getFormString(formData, 'phone');
    const cccd = getFormString(formData, 'cccd');
    const level = getFormString(formData, 'level');
    const membershipNumber = getFormString(formData, 'membership_number');
    const avatarFile = formData.get('avatar');

    if (!name || name === '') {
      return { success: false, error: 'Họ và tên không được để trống.' };
    }

    let avatarUrl = currentCoach.avatar_url;

    // Handle avatar upload if present
    if (avatarFile instanceof File && avatarFile.size > 0) {
      if (avatarFile.size > MAX_FILE_SIZE) {
        return { success: false, error: 'Ảnh đại diện không được vượt quá 2MB.' };
      }
      
      if (!ALLOWED_MIME_TYPES.includes(avatarFile.type)) {
        return { success: false, error: 'Định dạng ảnh không được hỗ trợ (chỉ chấp nhận JPG, PNG, WEBP).' };
      }

      // Create a unique filename based on mimetype instead of client filename
      const fileExt = getExtensionFromMimeType(avatarFile.type);
      const fileName = `${authUserId}-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        console.error('Upload avatar error:', uploadError);
        return { success: false, error: 'Không thể tải ảnh đại diện lên. Vui lòng thử lại.' };
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
      }
    }

    // Update profiles table
    // Fetch profile id first
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (!profile) {
      return { success: false, error: 'Không tìm thấy thông tin tài khoản.' };
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        name: name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
      return { success: false, error: 'Lỗi khi cập nhật thông tin tài khoản.' };
    }

    // Update coaches table
    const { error: coachUpdateError } = await supabase
      .from('coaches')
      .update({
        phone: phone || null,
        cccd: cccd || null,
        level: level || null,
        membership_number: membershipNumber || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentCoach.id);

    if (coachUpdateError) {
      console.error('Coach update error:', coachUpdateError);
      // Even if coach update fails but profile update succeeded, we should report error.
      // A transaction would be better, but we stick to existing architecture.
      return { success: false, error: 'Lỗi khi cập nhật thông tin huấn luyện viên.' };
    }

    // Revalidate paths
    revalidatePath('/', 'layout');
    revalidatePath('/profile');

    return { success: true, avatarUrl };
  } catch (error: any) {
    console.error('updateMyCoachProfile error:', error);
    return { success: false, error: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.' };
  }
}
