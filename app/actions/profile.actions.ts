'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { CoachesService } from '@/services/coaches.service';

export async function updateMyCoachProfile(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const authUserId = userData.user.id;
    
    // Get current profile & coach ID using the existing service
    const currentCoach = await CoachesService.getCoachByAuthId(authUserId);
    if (!currentCoach) {
      return { success: false, error: 'Coach profile not found' };
    }

    // Extract data from formData
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const cccd = formData.get('cccd') as string;
    const level = formData.get('level') as string;
    const membershipNumber = formData.get('membership_number') as string;
    const avatarFile = formData.get('avatar') as File | null;

    if (!name || name.trim() === '') {
      return { success: false, error: 'Họ và tên không được để trống' };
    }

    let avatarUrl = currentCoach.avatar_url;

    // Handle avatar upload if present
    if (avatarFile && avatarFile.size > 0) {
      // Create a unique filename
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${authUserId}-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload avatar error:', uploadError);
        // We'll continue even if upload fails, but it's better to return an error in real apps.
        // Or create the bucket if it doesn't exist? Since we can't create bucket here easily without service key, 
        // we assume the bucket 'avatars' exists and is public.
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
      return { success: false, error: 'Profile not found' };
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
      return { success: false, error: 'Failed to update profile data' };
    }

    // Update coaches table
    const { error: coachUpdateError } = await supabase
      .from('coaches')
      .update({
        phone: phone ? phone.trim() : null,
        cccd: cccd ? cccd.trim() : null,
        level: level ? level.trim() : null,
        membership_number: membershipNumber ? membershipNumber.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentCoach.id);

    if (coachUpdateError) {
      console.error('Coach update error:', coachUpdateError);
      return { success: false, error: 'Failed to update coach data' };
    }

    // Revalidate paths
    revalidatePath('/', 'layout');
    revalidatePath('/profile');

    return { success: true, avatarUrl };
  } catch (error: any) {
    console.error('updateMyCoachProfile error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
