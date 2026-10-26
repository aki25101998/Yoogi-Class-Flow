-- 035_seed_sample_data.sql
-- Function to seed rich, cohesive sample data for testing all web features
-- Safe, idempotent, respects composite foreign keys and constraints.

CREATE OR REPLACE FUNCTION public.seed_sample_data(p_target_org_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_owner_profile_id UUID;
  v_belt_white_id UUID;
  v_belt_yellow_id UUID;
  v_belt_orange_id UUID;
  v_belt_green_id UUID;
  v_belt_blue_id UUID;
  v_belt_red_id UUID;
  v_belt_brown_id UUID;
  v_belt_black_id UUID;
  v_venue1_id UUID;
  v_venue2_id UUID;
  v_venue3_id UUID;
  v_prof1_id UUID;
  v_prof2_id UUID;
  v_prof3_id UUID;
  v_prof4_id UUID;
  v_mem1_id UUID;
  v_mem2_id UUID;
  v_mem3_id UUID;
  v_mem4_id UUID;
  v_coach1_id UUID;
  v_coach2_id UUID;
  v_coach3_id UUID;
  v_coach4_id UUID;
  v_class1_id UUID;
  v_class2_id UUID;
  v_class3_id UUID;
  v_class4_id UUID;
  v_class5_id UUID;
  v_class6_id UUID;
  v_stud1_id UUID;
  v_stud2_id UUID;
  v_stud3_id UUID;
  v_stud4_id UUID;
  v_stud5_id UUID;
  v_stud6_id UUID;
  v_stud7_id UUID;
  v_stud8_id UUID;
  v_stud9_id UUID;
  v_stud10_id UUID;
  v_stud11_id UUID;
  v_stud12_id UUID;
  v_stud13_id UUID;
  v_stud14_id UUID;
  v_stud15_id UUID;
  v_stud16_id UUID;
  v_sch1_id UUID;
  v_sch2_id UUID;
  v_sch3_id UUID;
  v_sch4_id UUID;
  v_sch5_id UUID;
  v_sch6_id UUID;
  v_sch7_id UUID;
  v_sch8_id UUID;
  v_sess1_id UUID;
  v_sess2_id UUID;
  v_sess3_id UUID;
  v_sess4_id UUID;
  v_sess5_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_current_month TEXT := TO_CHAR(v_now, 'YYYY-MM');
  v_d1 TEXT := TO_CHAR(v_now - INTERVAL '7 days', 'YYYY-MM-DD');
  v_d2 TEXT := TO_CHAR(v_now - INTERVAL '5 days', 'YYYY-MM-DD');
  v_d3 TEXT := TO_CHAR(v_now - INTERVAL '3 days', 'YYYY-MM-DD');
  v_d4 TEXT := TO_CHAR(v_now - INTERVAL '1 days', 'YYYY-MM-DD');
  v_d5 TEXT := TO_CHAR(v_now, 'YYYY-MM-DD');
BEGIN
  -- Disable audit triggers for performance and clean history
  PERFORM set_config('app.disable_audit', 'true', true);

  -- 1. Identify Target Organization
  IF p_target_org_id IS NOT NULL THEN
    v_org_id := p_target_org_id;
  ELSE
    SELECT id, owner_id INTO v_org_id, v_owner_profile_id 
    FROM public.organizations 
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;

  -- If no organization exists at all, create a demo organization
  IF v_org_id IS NULL THEN
    -- Create system profile for owner
    INSERT INTO public.profiles (email, name, avatar_url)
    VALUES ('admin@yoogiclassflow.vn', 'Võ Sư Quản Trị', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop')
    RETURNING id INTO v_owner_profile_id;

    INSERT INTO public.organizations (name, owner_id, subscription_plan, subscription_status)
    VALUES ('Học Viện Võ Thuật Yoogi', v_owner_profile_id, 'pro', 'active')
    RETURNING id INTO v_org_id;

    -- Add owner membership
    INSERT INTO public.organization_members (organization_id, user_id, role, status, permissions)
    VALUES (v_org_id, v_owner_profile_id, 'owner', 'active', '["manage_coaches", "manage_students", "manage_venues", "manage_classes", "manage_schedule", "manage_settings", "manage_attendance", "view_payroll", "manage_members", "manage_organization", "manage_tuition", "manage_finance"]'::jsonb);
  END IF;

  -- ============================================================
  -- 2. ORGANIZATION BELTS (8 Cấp Đai Chuẩn)
  -- ============================================================
  -- If belts already exist in this organization, map them to avoid violating unique_org_display_order
  IF EXISTS (SELECT 1 FROM public.organization_belts WHERE organization_id = v_org_id) THEN
    SELECT id INTO v_belt_white_id FROM public.organization_belts WHERE organization_id = v_org_id ORDER BY display_order ASC LIMIT 1 OFFSET 0;
    SELECT id INTO v_belt_yellow_id FROM public.organization_belts WHERE organization_id = v_org_id ORDER BY display_order ASC LIMIT 1 OFFSET 1;
    SELECT id INTO v_belt_orange_id FROM public.organization_belts WHERE organization_id = v_org_id ORDER BY display_order ASC LIMIT 1 OFFSET 2;
    SELECT id INTO v_belt_green_id FROM public.organization_belts WHERE organization_id = v_org_id ORDER BY display_order ASC LIMIT 1 OFFSET 3;
    SELECT id INTO v_belt_blue_id FROM public.organization_belts WHERE organization_id = v_org_id ORDER BY display_order ASC LIMIT 1 OFFSET 4;
    SELECT id INTO v_belt_red_id FROM public.organization_belts WHERE organization_id = v_org_id ORDER BY display_order ASC LIMIT 1 OFFSET 5;
    SELECT id INTO v_belt_brown_id FROM public.organization_belts WHERE organization_id = v_org_id ORDER BY display_order ASC LIMIT 1 OFFSET 6;
    SELECT id INTO v_belt_black_id FROM public.organization_belts WHERE organization_id = v_org_id ORDER BY display_order ASC LIMIT 1 OFFSET 7;

    -- Ensure fallbacks if fewer than 8 belts exist
    v_belt_yellow_id := COALESCE(v_belt_yellow_id, v_belt_white_id);
    v_belt_orange_id := COALESCE(v_belt_orange_id, v_belt_white_id);
    v_belt_green_id := COALESCE(v_belt_green_id, v_belt_white_id);
    v_belt_blue_id := COALESCE(v_belt_blue_id, v_belt_white_id);
    v_belt_red_id := COALESCE(v_belt_red_id, v_belt_white_id);
    v_belt_brown_id := COALESCE(v_belt_brown_id, v_belt_white_id);
    v_belt_black_id := COALESCE(v_belt_black_id, v_belt_white_id);
  ELSE
    INSERT INTO public.organization_belts (organization_id, name, display_order, is_active)
    VALUES (v_org_id, 'Đai Trắng (Cấp 10)', 1, true)
    RETURNING id INTO v_belt_white_id;

    INSERT INTO public.organization_belts (organization_id, name, display_order, is_active)
    VALUES (v_org_id, 'Đai Vàng (Cấp 8)', 2, true)
    RETURNING id INTO v_belt_yellow_id;

    INSERT INTO public.organization_belts (organization_id, name, display_order, is_active)
    VALUES (v_org_id, 'Đai Cam (Cấp 6)', 3, true)
    RETURNING id INTO v_belt_orange_id;

    INSERT INTO public.organization_belts (organization_id, name, display_order, is_active)
    VALUES (v_org_id, 'Đai Xanh Lá (Cấp 4)', 4, true)
    RETURNING id INTO v_belt_green_id;

    INSERT INTO public.organization_belts (organization_id, name, display_order, is_active)
    VALUES (v_org_id, 'Đai Xanh Dương (Cấp 2)', 5, true)
    RETURNING id INTO v_belt_blue_id;

    INSERT INTO public.organization_belts (organization_id, name, display_order, is_active)
    VALUES (v_org_id, 'Đai Đỏ (Cấp 1)', 6, true)
    RETURNING id INTO v_belt_red_id;

    INSERT INTO public.organization_belts (organization_id, name, display_order, is_active)
    VALUES (v_org_id, 'Đai Nâu (Cận Huyền Đai)', 7, true)
    RETURNING id INTO v_belt_brown_id;

    INSERT INTO public.organization_belts (organization_id, name, display_order, is_active)
    VALUES (v_org_id, 'Huyền Đai (1 Đẳng)', 8, true)
    RETURNING id INTO v_belt_black_id;
  END IF;

  -- ============================================================
  -- 3. VENUES (3 Địa Điểm Đẹp với Ảnh Thể Thao Chất Lượng Cao)
  -- ============================================================
  SELECT id INTO v_venue1_id FROM public.venues WHERE organization_id = v_org_id AND name = 'Yoogi Martial Arts Riverside' LIMIT 1;
  IF v_venue1_id IS NULL THEN
    INSERT INTO public.venues (organization_id, name, address, status, image_url, image_position)
    VALUES (
      v_org_id, 
      'Yoogi Martial Arts Riverside', 
      'Số 12 Tôn Thất Thuyết, Phường 1, Quận 4, TP. Hồ Chí Minh', 
      'active', 
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop', 
      '50% 45%'
    ) RETURNING id INTO v_venue1_id;
  END IF;

  SELECT id INTO v_venue2_id FROM public.venues WHERE organization_id = v_org_id AND name = 'Yoogi Sunrise Sports Complex' LIMIT 1;
  IF v_venue2_id IS NULL THEN
    INSERT INTO public.venues (organization_id, name, address, status, image_url, image_position)
    VALUES (
      v_org_id, 
      'Yoogi Sunrise Sports Complex', 
      '242 Hai Bà Trưng, Phường Tân Định, Quận 1, TP. Hồ Chí Minh', 
      'active', 
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop', 
      '50% 50%'
    ) RETURNING id INTO v_venue2_id;
  END IF;

  SELECT id INTO v_venue3_id FROM public.venues WHERE organization_id = v_org_id AND name = 'Yoogi Kickboxing & Fitness Arena' LIMIT 1;
  IF v_venue3_id IS NULL THEN
    INSERT INTO public.venues (organization_id, name, address, status, image_url, image_position)
    VALUES (
      v_org_id, 
      'Yoogi Kickboxing & Fitness Arena', 
      '88 Song Hành, Phường An Phú, Quận 2, TP. Thủ Đức, TP. Hồ Chí Minh', 
      'active', 
      'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?q=80&w=1200&auto=format&fit=crop', 
      '50% 55%'
    ) RETURNING id INTO v_venue3_id;
  END IF;

  -- ============================================================
  -- 4. COACHES (Đội Ngũ 4 Huấn Luyện Viên Đầy Đủ Thông Tin)
  -- ============================================================
  -- Coach 1: Master Hùng
  SELECT id INTO v_prof1_id FROM public.profiles WHERE email = 'tran.hung@yoogiflow.local' LIMIT 1;
  IF v_prof1_id IS NULL THEN
    INSERT INTO public.profiles (name, email, avatar_url)
    VALUES ('Trần Hùng', 'tran.hung@yoogiflow.local', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=400&auto=format&fit=crop')
    RETURNING id INTO v_prof1_id;
  END IF;

  SELECT id INTO v_mem1_id FROM public.organization_members WHERE organization_id = v_org_id AND user_id = v_prof1_id LIMIT 1;
  IF v_mem1_id IS NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_prof1_id, 'head_coach', 'active')
    RETURNING id INTO v_mem1_id;
  END IF;

  SELECT id INTO v_coach1_id FROM public.coaches WHERE organization_id = v_org_id AND organization_member_id = v_mem1_id LIMIT 1;
  IF v_coach1_id IS NULL THEN
    INSERT INTO public.coaches (organization_id, organization_member_id, nickname, phone, cccd, level, membership_number, photo_url, status)
    VALUES (
      v_org_id, v_mem1_id, 'Master Hùng', '0903123456', '079088001234', 
      'Huyền đai Đệ Ngũ đẳng (5th Dan)', 'YG-COACH-001', 
      'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=400&auto=format&fit=crop', 'active'
    ) RETURNING id INTO v_coach1_id;
  END IF;

  -- Coach 2: Coach Minh
  SELECT id INTO v_prof2_id FROM public.profiles WHERE email = 'le.minh@yoogiflow.local' LIMIT 1;
  IF v_prof2_id IS NULL THEN
    INSERT INTO public.profiles (name, email, avatar_url)
    VALUES ('Lê Hoàng Minh', 'le.minh@yoogiflow.local', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop')
    RETURNING id INTO v_prof2_id;
  END IF;

  SELECT id INTO v_mem2_id FROM public.organization_members WHERE organization_id = v_org_id AND user_id = v_prof2_id LIMIT 1;
  IF v_mem2_id IS NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_prof2_id, 'head_coach', 'active')
    RETURNING id INTO v_mem2_id;
  END IF;

  SELECT id INTO v_coach2_id FROM public.coaches WHERE organization_id = v_org_id AND organization_member_id = v_mem2_id LIMIT 1;
  IF v_coach2_id IS NULL THEN
    INSERT INTO public.coaches (organization_id, organization_member_id, nickname, phone, cccd, level, membership_number, photo_url, status)
    VALUES (
      v_org_id, v_mem2_id, 'Coach Minh', '0918234567', '079092002345', 
      'Huyền đai Đệ Tam đẳng (3rd Dan)', 'YG-COACH-002', 
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop', 'active'
    ) RETURNING id INTO v_coach2_id;
  END IF;

  -- Coach 3: Coach Lan
  SELECT id INTO v_prof3_id FROM public.profiles WHERE email = 'nguyen.lan@yoogiflow.local' LIMIT 1;
  IF v_prof3_id IS NULL THEN
    INSERT INTO public.profiles (name, email, avatar_url)
    VALUES ('Nguyễn Phương Lan', 'nguyen.lan@yoogiflow.local', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop')
    RETURNING id INTO v_prof3_id;
  END IF;

  SELECT id INTO v_mem3_id FROM public.organization_members WHERE organization_id = v_org_id AND user_id = v_prof3_id LIMIT 1;
  IF v_mem3_id IS NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_prof3_id, 'assistant_coach', 'active')
    RETURNING id INTO v_mem3_id;
  END IF;

  SELECT id INTO v_coach3_id FROM public.coaches WHERE organization_id = v_org_id AND organization_member_id = v_mem3_id LIMIT 1;
  IF v_coach3_id IS NULL THEN
    INSERT INTO public.coaches (organization_id, organization_member_id, nickname, phone, cccd, level, membership_number, photo_url, status)
    VALUES (
      v_org_id, v_mem3_id, 'Coach Lan', '0933345678', '079195003456', 
      'Huyền đai Đệ Nhị đẳng (2nd Dan)', 'YG-COACH-003', 
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop', 'active'
    ) RETURNING id INTO v_coach3_id;
  END IF;

  -- Coach 4: Coach Tuấn
  SELECT id INTO v_prof4_id FROM public.profiles WHERE email = 'tuan.anh@yoogiflow.local' LIMIT 1;
  IF v_prof4_id IS NULL THEN
    INSERT INTO public.profiles (name, email, avatar_url)
    VALUES ('Phạm Tuấn Anh', 'tuan.anh@yoogiflow.local', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop')
    RETURNING id INTO v_prof4_id;
  END IF;

  SELECT id INTO v_mem4_id FROM public.organization_members WHERE organization_id = v_org_id AND user_id = v_prof4_id LIMIT 1;
  IF v_mem4_id IS NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_org_id, v_prof4_id, 'assistant_coach', 'active')
    RETURNING id INTO v_mem4_id;
  END IF;

  SELECT id INTO v_coach4_id FROM public.coaches WHERE organization_id = v_org_id AND organization_member_id = v_mem4_id LIMIT 1;
  IF v_coach4_id IS NULL THEN
    INSERT INTO public.coaches (organization_id, organization_member_id, nickname, phone, cccd, level, membership_number, photo_url, status)
    VALUES (
      v_org_id, v_mem4_id, 'Coach Tuấn', '0977456789', '079096004567', 
      'Huyền đai Đệ Nhất đẳng (1st Dan)', 'YG-COACH-004', 
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop', 'active'
    ) RETURNING id INTO v_coach4_id;
  END IF;

  -- ============================================================
  -- 5. VENUE CLASSES (6 Lớp Học Phân Bổ Các Địa Điểm)
  -- ============================================================
  SELECT id INTO v_class1_id FROM public.venue_classes WHERE organization_id = v_org_id AND name = 'Karatedo Thiếu Nhi K01' LIMIT 1;
  IF v_class1_id IS NULL THEN
    INSERT INTO public.venue_classes (organization_id, venue_id, name, start_time, end_time, schedule_days, status)
    VALUES (v_org_id, v_venue1_id, 'Karatedo Thiếu Nhi K01', '17:30', '19:00', '[1, 3, 5]'::jsonb, 'active')
    RETURNING id INTO v_class1_id;
  END IF;

  SELECT id INTO v_class2_id FROM public.venue_classes WHERE organization_id = v_org_id AND name = 'Karatedo Thiếu Niên K02' LIMIT 1;
  IF v_class2_id IS NULL THEN
    INSERT INTO public.venue_classes (organization_id, venue_id, name, start_time, end_time, schedule_days, status)
    VALUES (v_org_id, v_venue1_id, 'Karatedo Thiếu Niên K02', '19:15', '20:45', '[1, 3, 5]'::jsonb, 'active')
    RETURNING id INTO v_class2_id;
  END IF;

  SELECT id INTO v_class3_id FROM public.venue_classes WHERE organization_id = v_org_id AND name = 'Taekwondo Năng Khiếu T01' LIMIT 1;
  IF v_class3_id IS NULL THEN
    INSERT INTO public.venue_classes (organization_id, venue_id, name, start_time, end_time, schedule_days, status)
    VALUES (v_org_id, v_venue2_id, 'Taekwondo Năng Khiếu T01', '18:00', '19:30', '[2, 4, 6]'::jsonb, 'active')
    RETURNING id INTO v_class3_id;
  END IF;

  SELECT id INTO v_class4_id FROM public.venue_classes WHERE organization_id = v_org_id AND name = 'Taekwondo Thiếu Nhi T02' LIMIT 1;
  IF v_class4_id IS NULL THEN
    INSERT INTO public.venue_classes (organization_id, venue_id, name, start_time, end_time, schedule_days, status)
    VALUES (v_org_id, v_venue2_id, 'Taekwondo Thiếu Nhi T02', '08:30', '10:00', '[6, 0]'::jsonb, 'active')
    RETURNING id INTO v_class4_id;
  END IF;

  SELECT id INTO v_class5_id FROM public.venue_classes WHERE organization_id = v_org_id AND name = 'Kickboxing & Đối Kháng B01' LIMIT 1;
  IF v_class5_id IS NULL THEN
    INSERT INTO public.venue_classes (organization_id, venue_id, name, start_time, end_time, schedule_days, status)
    VALUES (v_org_id, v_venue3_id, 'Kickboxing & Đối Kháng B01', '18:30', '20:00', '[1, 3, 5]'::jsonb, 'active')
    RETURNING id INTO v_class5_id;
  END IF;

  SELECT id INTO v_class6_id FROM public.venue_classes WHERE organization_id = v_org_id AND name = 'Võ Nhạc & Thể Lực V01' LIMIT 1;
  IF v_class6_id IS NULL THEN
    INSERT INTO public.venue_classes (organization_id, venue_id, name, start_time, end_time, schedule_days, status)
    VALUES (v_org_id, v_venue3_id, 'Võ Nhạc & Thể Lực V01', '17:00', '18:15', '[2, 4, 6]'::jsonb, 'active')
    RETURNING id INTO v_class6_id;
  END IF;

  -- ============================================================
  -- 6. CLASS COACHES (Gán HLV Trưởng và Trợ Giảng)
  -- ============================================================
  -- Class 1: Master Hùng (HEAD_COACH), Coach Tuấn (ASSISTANT_COACH)
  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class1_id AND coach_id = v_coach1_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class1_id AND UPPER(role) = 'HEAD_COACH') THEN
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class1_id, v_coach1_id, 'HEAD_COACH');
    ELSE
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class1_id, v_coach1_id, 'ASSISTANT_COACH');
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class1_id AND coach_id = v_coach4_id) THEN
    INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class1_id, v_coach4_id, 'ASSISTANT_COACH');
  END IF;

  -- Class 2: Master Hùng (HEAD_COACH)
  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class2_id AND coach_id = v_coach1_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class2_id AND UPPER(role) = 'HEAD_COACH') THEN
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class2_id, v_coach1_id, 'HEAD_COACH');
    ELSE
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class2_id, v_coach1_id, 'ASSISTANT_COACH');
    END IF;
  END IF;

  -- Class 3: Coach Minh (HEAD_COACH), Coach Lan (ASSISTANT_COACH)
  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class3_id AND coach_id = v_coach2_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class3_id AND UPPER(role) = 'HEAD_COACH') THEN
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class3_id, v_coach2_id, 'HEAD_COACH');
    ELSE
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class3_id, v_coach2_id, 'ASSISTANT_COACH');
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class3_id AND coach_id = v_coach3_id) THEN
    INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class3_id, v_coach3_id, 'ASSISTANT_COACH');
  END IF;

  -- Class 4: Coach Minh (HEAD_COACH)
  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class4_id AND coach_id = v_coach2_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class4_id AND UPPER(role) = 'HEAD_COACH') THEN
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class4_id, v_coach2_id, 'HEAD_COACH');
    ELSE
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class4_id, v_coach2_id, 'ASSISTANT_COACH');
    END IF;
  END IF;

  -- Class 5: Coach Tuấn (HEAD_COACH), Coach Lan (ASSISTANT_COACH)
  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class5_id AND coach_id = v_coach4_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class5_id AND UPPER(role) = 'HEAD_COACH') THEN
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class5_id, v_coach4_id, 'HEAD_COACH');
    ELSE
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class5_id, v_coach4_id, 'ASSISTANT_COACH');
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class5_id AND coach_id = v_coach3_id) THEN
    INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class5_id, v_coach3_id, 'ASSISTANT_COACH');
  END IF;

  -- Class 6: Coach Lan (HEAD_COACH)
  IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class6_id AND coach_id = v_coach3_id) THEN
    IF NOT EXISTS (SELECT 1 FROM public.class_coaches WHERE class_id = v_class6_id AND UPPER(role) = 'HEAD_COACH') THEN
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class6_id, v_coach3_id, 'HEAD_COACH');
    ELSE
      INSERT INTO public.class_coaches (organization_id, class_id, coach_id, role) VALUES (v_org_id, v_class6_id, v_coach3_id, 'ASSISTANT_COACH');
    END IF;
  END IF;

  -- ============================================================
  -- 7. STUDENTS (16 Học Viên Đủ Cấp Đai & Phụ Huynh)
  -- ============================================================
  SELECT id INTO v_stud1_id FROM public.students WHERE organization_id = v_org_id AND name = 'Nguyễn Gia Bảo' LIMIT 1;
  IF v_stud1_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Nguyễn Gia Bảo', '0912111222', 'Nguyễn Hữu Dũng', '0903111222', '2014-03-15', v_belt_orange_id, v_venue1_id, 'active')
    RETURNING id INTO v_stud1_id;
  END IF;

  SELECT id INTO v_stud2_id FROM public.students WHERE organization_id = v_org_id AND name = 'Trần Bảo Nam' LIMIT 1;
  IF v_stud2_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Trần Bảo Nam', '0912222333', 'Trần Văn Hưng', '0903222333', '2015-06-20', v_belt_yellow_id, v_venue1_id, 'active')
    RETURNING id INTO v_stud2_id;
  END IF;

  SELECT id INTO v_stud3_id FROM public.students WHERE organization_id = v_org_id AND name = 'Lê Mai Chi' LIMIT 1;
  IF v_stud3_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Lê Mai Chi', '0912333444', 'Lê Thị Thảo', '0903333444', '2013-11-10', v_belt_green_id, v_venue1_id, 'active')
    RETURNING id INTO v_stud3_id;
  END IF;

  SELECT id INTO v_stud4_id FROM public.students WHERE organization_id = v_org_id AND name = 'Vũ Hoàng Yến' LIMIT 1;
  IF v_stud4_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Vũ Hoàng Yến', '0912444555', 'Vũ Đức Nam', '0903444555', '2014-08-05', v_belt_white_id, v_venue1_id, 'active')
    RETURNING id INTO v_stud4_id;
  END IF;

  SELECT id INTO v_stud5_id FROM public.students WHERE organization_id = v_org_id AND name = 'Phạm Đăng Khoa' LIMIT 1;
  IF v_stud5_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Phạm Đăng Khoa', '0988111222', 'Phạm Văn Tuấn', '0908111222', '2009-04-12', v_belt_red_id, v_venue1_id, 'active')
    RETURNING id INTO v_stud5_id;
  END IF;

  SELECT id INTO v_stud6_id FROM public.students WHERE organization_id = v_org_id AND name = 'Hoàng Gia Huy' LIMIT 1;
  IF v_stud6_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Hoàng Gia Huy', '0988222333', 'Hoàng Kim Thúy', '0908222333', '2010-09-25', v_belt_brown_id, v_venue1_id, 'active')
    RETURNING id INTO v_stud6_id;
  END IF;

  SELECT id INTO v_stud7_id FROM public.students WHERE organization_id = v_org_id AND name = 'Đỗ Minh Triết' LIMIT 1;
  IF v_stud7_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Đỗ Minh Triết', '0988333444', 'Đỗ Quốc Oanh', '0908333444', '2011-01-18', v_belt_blue_id, v_venue1_id, 'active')
    RETURNING id INTO v_stud7_id;
  END IF;

  SELECT id INTO v_stud8_id FROM public.students WHERE organization_id = v_org_id AND name = 'Bùi Hà My' LIMIT 1;
  IF v_stud8_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Bùi Hà My', '0977111222', 'Bùi Xuân Hậu', '0917111222', '2012-07-30', v_belt_orange_id, v_venue2_id, 'active')
    RETURNING id INTO v_stud8_id;
  END IF;

  SELECT id INTO v_stud9_id FROM public.students WHERE organization_id = v_org_id AND name = 'Phan Đình Trí' LIMIT 1;
  IF v_stud9_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Phan Đình Trí', '0977222333', 'Phan Văn Đạt', '0917222333', '2011-12-14', v_belt_green_id, v_venue2_id, 'active')
    RETURNING id INTO v_stud9_id;
  END IF;

  SELECT id INTO v_stud10_id FROM public.students WHERE organization_id = v_org_id AND name = 'Lâm Ngọc Ánh' LIMIT 1;
  IF v_stud10_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Lâm Ngọc Ánh', '0977333444', 'Lâm Nhật Minh', '0917333444', '2013-05-22', v_belt_yellow_id, v_venue2_id, 'active')
    RETURNING id INTO v_stud10_id;
  END IF;

  SELECT id INTO v_stud11_id FROM public.students WHERE organization_id = v_org_id AND name = 'Trịnh Tuấn Khang' LIMIT 1;
  IF v_stud11_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Trịnh Tuấn Khang', '0966111222', 'Trịnh Đình Long', '0926111222', '2016-02-10', v_belt_white_id, v_venue2_id, 'active')
    RETURNING id INTO v_stud11_id;
  END IF;

  SELECT id INTO v_stud12_id FROM public.students WHERE organization_id = v_org_id AND name = 'Đoàn Thảo Nguyên' LIMIT 1;
  IF v_stud12_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Đoàn Thảo Nguyên', '0966222333', 'Đoàn Hữu Tín', '0926222333', '2015-10-18', v_belt_yellow_id, v_venue2_id, 'active')
    RETURNING id INTO v_stud12_id;
  END IF;

  SELECT id INTO v_stud13_id FROM public.students WHERE organization_id = v_org_id AND name = 'Nguyễn Quốc Huy' LIMIT 1;
  IF v_stud13_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Nguyễn Quốc Huy', '0938111222', 'Nguyễn Tấn Sang', '0938000111', '2005-08-14', v_belt_red_id, v_venue3_id, 'active')
    RETURNING id INTO v_stud13_id;
  END IF;

  SELECT id INTO v_stud14_id FROM public.students WHERE organization_id = v_org_id AND name = 'Võ Trọng Nghĩa' LIMIT 1;
  IF v_stud14_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Võ Trọng Nghĩa', '0938222333', 'Võ Hồng Phong', '0938000222', '2006-03-29', v_belt_brown_id, v_venue3_id, 'active')
    RETURNING id INTO v_stud14_id;
  END IF;

  SELECT id INTO v_stud15_id FROM public.students WHERE organization_id = v_org_id AND name = 'Mai Thùy Linh' LIMIT 1;
  IF v_stud15_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Mai Thùy Linh', '0938333444', 'Mai Văn Hòa', '0938000333', '2007-11-03', v_belt_orange_id, v_venue3_id, 'active')
    RETURNING id INTO v_stud15_id;
  END IF;

  SELECT id INTO v_stud16_id FROM public.students WHERE organization_id = v_org_id AND name = 'Đặng Kim Ngân' LIMIT 1;
  IF v_stud16_id IS NULL THEN
    INSERT INTO public.students (organization_id, name, phone, parent_name, parent_phone, dob, current_belt_id, venue_id, status)
    VALUES (v_org_id, 'Đặng Kim Ngân', '0938444555', 'Đặng Thu Trang', '0938000444', '2008-01-16', v_belt_green_id, v_venue3_id, 'active')
    RETURNING id INTO v_stud16_id;
  END IF;

  -- ============================================================
  -- 8. CLASS STUDENTS (Phân Bổ Học Viên Vào Các Lớp)
  -- ============================================================
  -- Class 1 (Karatedo K01): stud1, stud2, stud3, stud4
  INSERT INTO public.class_students (organization_id, class_id, student_id, status)
  VALUES 
    (v_org_id, v_class1_id, v_stud1_id, 'active'),
    (v_org_id, v_class1_id, v_stud2_id, 'active'),
    (v_org_id, v_class1_id, v_stud3_id, 'active'),
    (v_org_id, v_class1_id, v_stud4_id, 'active')
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Class 2 (Karatedo K02): stud5, stud6, stud7
  INSERT INTO public.class_students (organization_id, class_id, student_id, status)
  VALUES 
    (v_org_id, v_class2_id, v_stud5_id, 'active'),
    (v_org_id, v_class2_id, v_stud6_id, 'active'),
    (v_org_id, v_class2_id, v_stud7_id, 'active')
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Class 3 (Taekwondo T01): stud8, stud9, stud10
  INSERT INTO public.class_students (organization_id, class_id, student_id, status)
  VALUES 
    (v_org_id, v_class3_id, v_stud8_id, 'active'),
    (v_org_id, v_class3_id, v_stud9_id, 'active'),
    (v_org_id, v_class3_id, v_stud10_id, 'active')
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Class 4 (Taekwondo T02): stud11, stud12
  INSERT INTO public.class_students (organization_id, class_id, student_id, status)
  VALUES 
    (v_org_id, v_class4_id, v_stud11_id, 'active'),
    (v_org_id, v_class4_id, v_stud12_id, 'active')
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Class 5 (Kickboxing B01): stud13, stud14
  INSERT INTO public.class_students (organization_id, class_id, student_id, status)
  VALUES 
    (v_org_id, v_class5_id, v_stud13_id, 'active'),
    (v_org_id, v_class5_id, v_stud14_id, 'active')
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- Class 6 (Võ Nhạc V01): stud15, stud16
  INSERT INTO public.class_students (organization_id, class_id, student_id, status)
  VALUES 
    (v_org_id, v_class6_id, v_stud15_id, 'active'),
    (v_org_id, v_class6_id, v_stud16_id, 'active')
  ON CONFLICT (class_id, student_id) DO NOTHING;

  -- ============================================================
  -- 9. SCHEDULES & SCHEDULE COACHES (Lịch Học Định Kỳ)
  -- ============================================================
  -- Schedule 1: Class 1, Thứ 2 (day 1), 17:30 - 19:00
  SELECT id INTO v_sch1_id FROM public.schedules WHERE organization_id = v_org_id AND class_id = v_class1_id AND day_of_week = 1 LIMIT 1;
  IF v_sch1_id IS NULL THEN
    INSERT INTO public.schedules (organization_id, venue_id, class_id, coach_id, day_of_week, start_time, end_time, rate, rate_type, status)
    VALUES (v_org_id, v_venue1_id, v_class1_id, v_coach1_id, 1, '17:30', '19:00', 250000, 'per_session', 'active')
    RETURNING id INTO v_sch1_id;
  END IF;

  INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id, role)
  VALUES (v_org_id, v_sch1_id, v_coach1_id, 'HEAD_COACH')
  ON CONFLICT (schedule_id, coach_id) DO NOTHING;

  -- Schedule 2: Class 1, Thứ 4 (day 3), 17:30 - 19:00
  SELECT id INTO v_sch2_id FROM public.schedules WHERE organization_id = v_org_id AND class_id = v_class1_id AND day_of_week = 3 LIMIT 1;
  IF v_sch2_id IS NULL THEN
    INSERT INTO public.schedules (organization_id, venue_id, class_id, coach_id, day_of_week, start_time, end_time, rate, rate_type, status)
    VALUES (v_org_id, v_venue1_id, v_class1_id, v_coach1_id, 3, '17:30', '19:00', 250000, 'per_session', 'active')
    RETURNING id INTO v_sch2_id;
  END IF;

  INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id, role)
  VALUES (v_org_id, v_sch2_id, v_coach1_id, 'HEAD_COACH')
  ON CONFLICT (schedule_id, coach_id) DO NOTHING;

  -- Schedule 3: Class 1, Thứ 6 (day 5), 17:30 - 19:00
  SELECT id INTO v_sch3_id FROM public.schedules WHERE organization_id = v_org_id AND class_id = v_class1_id AND day_of_week = 5 LIMIT 1;
  IF v_sch3_id IS NULL THEN
    INSERT INTO public.schedules (organization_id, venue_id, class_id, coach_id, day_of_week, start_time, end_time, rate, rate_type, status)
    VALUES (v_org_id, v_venue1_id, v_class1_id, v_coach1_id, 5, '17:30', '19:00', 250000, 'per_session', 'active')
    RETURNING id INTO v_sch3_id;
  END IF;

  INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id, role)
  VALUES (v_org_id, v_sch3_id, v_coach1_id, 'HEAD_COACH')
  ON CONFLICT (schedule_id, coach_id) DO NOTHING;

  -- Schedule 4: Class 2, Thứ 2 (day 1), 19:15 - 20:45
  SELECT id INTO v_sch4_id FROM public.schedules WHERE organization_id = v_org_id AND class_id = v_class2_id AND day_of_week = 1 LIMIT 1;
  IF v_sch4_id IS NULL THEN
    INSERT INTO public.schedules (organization_id, venue_id, class_id, coach_id, day_of_week, start_time, end_time, rate, rate_type, status)
    VALUES (v_org_id, v_venue1_id, v_class2_id, v_coach1_id, 1, '19:15', '20:45', 250000, 'per_session', 'active')
    RETURNING id INTO v_sch4_id;
  END IF;

  INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id, role)
  VALUES (v_org_id, v_sch4_id, v_coach1_id, 'HEAD_COACH')
  ON CONFLICT (schedule_id, coach_id) DO NOTHING;

  -- Schedule 5: Class 3, Thứ 3 (day 2), 18:00 - 19:30
  SELECT id INTO v_sch5_id FROM public.schedules WHERE organization_id = v_org_id AND class_id = v_class3_id AND day_of_week = 2 LIMIT 1;
  IF v_sch5_id IS NULL THEN
    INSERT INTO public.schedules (organization_id, venue_id, class_id, coach_id, day_of_week, start_time, end_time, rate, rate_type, status)
    VALUES (v_org_id, v_venue2_id, v_class3_id, v_coach2_id, 2, '18:00', '19:30', 220000, 'per_session', 'active')
    RETURNING id INTO v_sch5_id;
  END IF;

  INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id, role)
  VALUES (v_org_id, v_sch5_id, v_coach2_id, 'HEAD_COACH')
  ON CONFLICT (schedule_id, coach_id) DO NOTHING;

  -- Schedule 6: Class 4, Thứ 7 (day 6), 08:30 - 10:00
  SELECT id INTO v_sch6_id FROM public.schedules WHERE organization_id = v_org_id AND class_id = v_class4_id AND day_of_week = 6 LIMIT 1;
  IF v_sch6_id IS NULL THEN
    INSERT INTO public.schedules (organization_id, venue_id, class_id, coach_id, day_of_week, start_time, end_time, rate, rate_type, status)
    VALUES (v_org_id, v_venue2_id, v_class4_id, v_coach2_id, 6, '08:30', '10:00', 250000, 'per_session', 'active')
    RETURNING id INTO v_sch6_id;
  END IF;

  INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id, role)
  VALUES (v_org_id, v_sch6_id, v_coach2_id, 'HEAD_COACH')
  ON CONFLICT (schedule_id, coach_id) DO NOTHING;

  -- Schedule 7: Class 5, Thứ 4 (day 3), 18:30 - 20:00
  SELECT id INTO v_sch7_id FROM public.schedules WHERE organization_id = v_org_id AND class_id = v_class5_id AND day_of_week = 3 LIMIT 1;
  IF v_sch7_id IS NULL THEN
    INSERT INTO public.schedules (organization_id, venue_id, class_id, coach_id, day_of_week, start_time, end_time, rate, rate_type, status)
    VALUES (v_org_id, v_venue3_id, v_class5_id, v_coach4_id, 3, '18:30', '20:00', 300000, 'per_session', 'active')
    RETURNING id INTO v_sch7_id;
  END IF;

  INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id, role)
  VALUES (v_org_id, v_sch7_id, v_coach4_id, 'HEAD_COACH')
  ON CONFLICT (schedule_id, coach_id) DO NOTHING;

  -- Schedule 8: Class 6, Thứ 5 (day 4), 17:00 - 18:15
  SELECT id INTO v_sch8_id FROM public.schedules WHERE organization_id = v_org_id AND class_id = v_class6_id AND day_of_week = 4 LIMIT 1;
  IF v_sch8_id IS NULL THEN
    INSERT INTO public.schedules (organization_id, venue_id, class_id, coach_id, day_of_week, start_time, end_time, rate, rate_type, status)
    VALUES (v_org_id, v_venue3_id, v_class6_id, v_coach3_id, 4, '17:00', '18:15', 200000, 'per_session', 'active')
    RETURNING id INTO v_sch8_id;
  END IF;

  INSERT INTO public.schedule_coaches (organization_id, schedule_id, coach_id, role)
  VALUES (v_org_id, v_sch8_id, v_coach3_id, 'HEAD_COACH')
  ON CONFLICT (schedule_id, coach_id) DO NOTHING;

  -- ============================================================
  -- 10. CLASS SESSIONS, SESSION COACHES, & ATTENDANCE
  -- ============================================================
  -- Session 1: Lớp 1 (K01) ngày v_d1 (7 ngày trước) - Approved
  SELECT id INTO v_sess1_id FROM public.class_sessions WHERE organization_id = v_org_id AND schedule_id = v_sch1_id AND date = v_d1 LIMIT 1;
  IF v_sess1_id IS NULL THEN
    INSERT INTO public.class_sessions (organization_id, schedule_id, class_id, coach_id, date, start_time, end_time, status, calculated_salary)
    VALUES (v_org_id, v_sch1_id, v_class1_id, v_coach1_id, v_d1, '17:30', '19:00', 'approved', 290000)
    RETURNING id INTO v_sess1_id;
  END IF;

  INSERT INTO public.session_coaches (organization_id, session_id, coach_id, status, calculated_salary)
  VALUES (v_org_id, v_sess1_id, v_coach1_id, 'checked_in', 290000)
  ON CONFLICT (session_id, coach_id) DO NOTHING;

  -- Attendance for Session 1:
  INSERT INTO public.student_session_attendance (organization_id, session_id, student_id, status, note)
  VALUES 
    (v_org_id, v_sess1_id, v_stud1_id, 'present', 'Tập luyện hăng hái, tấn chuẩn'),
    (v_org_id, v_sess1_id, v_stud2_id, 'present', 'Thực hiện tốt đòn đấm Oi-tsuki'),
    (v_org_id, v_sess1_id, v_stud3_id, 'late', 'Đến muộn 10 phút do kẹt xe'),
    (v_org_id, v_sess1_id, v_stud4_id, 'excused', 'Phụ huynh xin phép bận thi học kỳ')
  ON CONFLICT (session_id, student_id) DO NOTHING;

  -- Session 2: Lớp 1 (K01) ngày v_d2 (5 ngày trước) - Approved
  SELECT id INTO v_sess2_id FROM public.class_sessions WHERE organization_id = v_org_id AND schedule_id = v_sch2_id AND date = v_d2 LIMIT 1;
  IF v_sess2_id IS NULL THEN
    INSERT INTO public.class_sessions (organization_id, schedule_id, class_id, coach_id, date, start_time, end_time, status, calculated_salary)
    VALUES (v_org_id, v_sch2_id, v_class1_id, v_coach1_id, v_d2, '17:30', '19:00', 'approved', 290000)
    RETURNING id INTO v_sess2_id;
  END IF;

  INSERT INTO public.session_coaches (organization_id, session_id, coach_id, status, calculated_salary)
  VALUES (v_org_id, v_sess2_id, v_coach1_id, 'checked_in', 290000)
  ON CONFLICT (session_id, coach_id) DO NOTHING;

  INSERT INTO public.student_session_attendance (organization_id, session_id, student_id, status, note)
  VALUES 
    (v_org_id, v_sess2_id, v_stud1_id, 'present', 'Hoàn thành bài quyền Heian Shodan'),
    (v_org_id, v_sess2_id, v_stud2_id, 'present', 'Đúng giờ, trang phục võ phục chỉnh tề'),
    (v_org_id, v_sess2_id, v_stud3_id, 'present', 'Rất tiến bộ'),
    (v_org_id, v_sess2_id, v_stud4_id, 'present', 'Đi học đầy đủ')
  ON CONFLICT (session_id, student_id) DO NOTHING;

  -- Session 3: Lớp 3 (T01) ngày v_d3 (3 ngày trước) - Approved
  SELECT id INTO v_sess3_id FROM public.class_sessions WHERE organization_id = v_org_id AND schedule_id = v_sch5_id AND date = v_d3 LIMIT 1;
  IF v_sess3_id IS NULL THEN
    INSERT INTO public.class_sessions (organization_id, schedule_id, class_id, coach_id, date, start_time, end_time, status, calculated_salary)
    VALUES (v_org_id, v_sch5_id, v_class3_id, v_coach2_id, v_d3, '18:00', '19:30', 'approved', 250000)
    RETURNING id INTO v_sess3_id;
  END IF;

  INSERT INTO public.session_coaches (organization_id, session_id, coach_id, status, calculated_salary)
  VALUES (v_org_id, v_sess3_id, v_coach2_id, 'checked_in', 250000)
  ON CONFLICT (session_id, coach_id) DO NOTHING;

  INSERT INTO public.student_session_attendance (organization_id, session_id, student_id, status, note)
  VALUES 
    (v_org_id, v_sess3_id, v_stud8_id, 'present', 'Đá vòng cầu Ap Chagi uy lực'),
    (v_org_id, v_sess3_id, v_stud9_id, 'present', 'Thể lực tốt'),
    (v_org_id, v_sess3_id, v_stud10_id, 'absent', 'Vắng không phép')
  ON CONFLICT (session_id, student_id) DO NOTHING;

  -- Session 4: Lớp 5 (B01) ngày v_d4 (1 ngày trước) - Checked-in
  SELECT id INTO v_sess4_id FROM public.class_sessions WHERE organization_id = v_org_id AND schedule_id = v_sch7_id AND date = v_d4 LIMIT 1;
  IF v_sess4_id IS NULL THEN
    INSERT INTO public.class_sessions (organization_id, schedule_id, class_id, coach_id, date, start_time, end_time, status, calculated_salary)
    VALUES (v_org_id, v_sch7_id, v_class5_id, v_coach4_id, v_d4, '18:30', '20:00', 'checked_in', 320000)
    RETURNING id INTO v_sess4_id;
  END IF;

  INSERT INTO public.session_coaches (organization_id, session_id, coach_id, status, calculated_salary)
  VALUES (v_org_id, v_sess4_id, v_coach4_id, 'checked_in', 320000)
  ON CONFLICT (session_id, coach_id) DO NOTHING;

  INSERT INTO public.student_session_attendance (organization_id, session_id, student_id, status, note)
  VALUES 
    (v_org_id, v_sess4_id, v_stud13_id, 'present', 'Đối kháng tích cực, phòng thủ kín kẽ'),
    (v_org_id, v_sess4_id, v_stud14_id, 'present', 'Tốc độ ra đòn jab-cross ấn tượng')
  ON CONFLICT (session_id, student_id) DO NOTHING;

  -- Session 5: Lớp 1 (K01) ngày hôm nay (v_d5) - Checked-in
  SELECT id INTO v_sess5_id FROM public.class_sessions WHERE organization_id = v_org_id AND schedule_id = v_sch1_id AND date = v_d5 LIMIT 1;
  IF v_sess5_id IS NULL THEN
    INSERT INTO public.class_sessions (organization_id, schedule_id, class_id, coach_id, date, start_time, end_time, status, calculated_salary)
    VALUES (v_org_id, v_sch1_id, v_class1_id, v_coach1_id, v_d5, '17:30', '19:00', 'checked_in', 290000)
    RETURNING id INTO v_sess5_id;
  END IF;

  INSERT INTO public.session_coaches (organization_id, session_id, coach_id, status, calculated_salary)
  VALUES (v_org_id, v_sess5_id, v_coach1_id, 'checked_in', 290000)
  ON CONFLICT (session_id, coach_id) DO NOTHING;

  INSERT INTO public.student_session_attendance (organization_id, session_id, student_id, status, note)
  VALUES 
    (v_org_id, v_sess5_id, v_stud1_id, 'present', 'Có mặt đúng giờ'),
    (v_org_id, v_sess5_id, v_stud2_id, 'present', 'Có mặt đúng giờ'),
    (v_org_id, v_sess5_id, v_stud3_id, 'present', 'Có mặt đúng giờ'),
    (v_org_id, v_sess5_id, v_stud4_id, 'present', 'Có mặt đúng giờ')
  ON CONFLICT (session_id, student_id) DO NOTHING;

  -- ============================================================
  -- 11. SALARY RULES (Quy Tắc Lương Salary Engine v2.0)
  -- ============================================================
  INSERT INTO public.salary_rules (
    organization_id, name, description, calculation_type, scope_type, 
    merge_mode, priority, amount, status
  )
  VALUES (
    v_org_id, 'Lương Cứng Buổi Dạy Chuẩn', 'Lương cố định chi trả cho HLV mỗi ca giảng dạy hoàn thành', 
    'FIXED_PER_SESSION', 'ORGANIZATION', 'ADD', 10, 250000, 'active'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.salary_rules (
    organization_id, name, description, calculation_type, scope_type, 
    merge_mode, priority, amount, status
  )
  VALUES (
    v_org_id, 'Thưởng Sĩ Số Học Viên Có Mặt', 'Thưởng thêm 10.000đ cho mỗi học viên có mặt trong buổi học', 
    'PER_STUDENT', 'ORGANIZATION', 'ADD', 10, 10000, 'active'
  )
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 12. PAYROLL PERIODS (Kỳ Lương Tháng)
  -- ============================================================
  INSERT INTO public.payroll_periods (
    organization_id, month, status, total_amount, coach_count, session_count
  )
  VALUES (
    v_org_id, v_current_month, 'calculated', 6250000, 4, 18
  )
  ON CONFLICT (organization_id, month) DO UPDATE 
  SET total_amount = 6250000, coach_count = 4, session_count = 18;

  -- ============================================================
  -- 13. TUITION (Học Phí Học Viên Đủ Trạng Thái: Paid, Partial, Unpaid)
  -- ============================================================
  -- Paid (Đã hoàn tất)
  INSERT INTO public.tuition (organization_id, student_id, class_id, amount, paid_amount, due_date, status)
  VALUES 
    (v_org_id, v_stud1_id, v_class1_id, 1000000, 1000000, v_current_month, 'paid'),
    (v_org_id, v_stud2_id, v_class1_id, 1000000, 1000000, v_current_month, 'paid'),
    (v_org_id, v_stud5_id, v_class2_id, 1200000, 1200000, v_current_month, 'paid'),
    (v_org_id, v_stud6_id, v_class2_id, 1200000, 1200000, v_current_month, 'paid'),
    (v_org_id, v_stud8_id, v_class3_id, 900000, 900000, v_current_month, 'paid'),
    (v_org_id, v_stud9_id, v_class3_id, 900000, 900000, v_current_month, 'paid'),
    (v_org_id, v_stud13_id, v_class5_id, 1500000, 1500000, v_current_month, 'paid'),
    (v_org_id, v_stud15_id, v_class6_id, 800000, 800000, v_current_month, 'paid')
  ON CONFLICT DO NOTHING;

  -- Partial (Nộp một phần)
  INSERT INTO public.tuition (organization_id, student_id, class_id, amount, paid_amount, due_date, status)
  VALUES 
    (v_org_id, v_stud3_id, v_class1_id, 1000000, 500000, v_current_month, 'partial'),
    (v_org_id, v_stud7_id, v_class2_id, 1200000, 600000, v_current_month, 'partial'),
    (v_org_id, v_stud10_id, v_class3_id, 900000, 450000, v_current_month, 'partial'),
    (v_org_id, v_stud14_id, v_class5_id, 1500000, 800000, v_current_month, 'partial')
  ON CONFLICT DO NOTHING;

  -- Unpaid (Chưa thanh toán)
  INSERT INTO public.tuition (organization_id, student_id, class_id, amount, paid_amount, due_date, status)
  VALUES 
    (v_org_id, v_stud4_id, v_class1_id, 1000000, 0, v_current_month, 'unpaid'),
    (v_org_id, v_stud11_id, v_class4_id, 850000, 0, v_current_month, 'unpaid'),
    (v_org_id, v_stud12_id, v_class4_id, 850000, 0, v_current_month, 'unpaid'),
    (v_org_id, v_stud16_id, v_class6_id, 800000, 0, v_current_month, 'unpaid')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 14. FINANCE TRANSACTIONS (Sổ Quỹ Thu Chi Thực Tế)
  -- ============================================================
  -- Thu (Income)
  INSERT INTO public.finance_transactions (organization_id, type, category, amount, date, description)
  VALUES 
    (v_org_id, 'income', 'Học phí', 5200000, TO_CHAR(v_now - INTERVAL '15 days', 'YYYY-MM-DD'), 'Thu học phí đợt 1 Lớp Karatedo K01 & K02'),
    (v_org_id, 'income', 'Học phí', 4150000, TO_CHAR(v_now - INTERVAL '10 days', 'YYYY-MM-DD'), 'Thu học phí Lớp Taekwondo T01 & T02'),
    (v_org_id, 'income', 'Học phí', 3800000, TO_CHAR(v_now - INTERVAL '6 days', 'YYYY-MM-DD'), 'Thu học phí Lớp Kickboxing B01 & Võ Nhạc'),
    (v_org_id, 'income', 'Võ phục & Dụng cụ', 2450000, TO_CHAR(v_now - INTERVAL '8 days', 'YYYY-MM-DD'), 'Tiền bán võ phục Karatedo, Taekwondo và băng quấn tay'),
    (v_org_id, 'income', 'Khác', 1500000, TO_CHAR(v_now - INTERVAL '4 days', 'YYYY-MM-DD'), 'Lệ phí thi nâng cấp đai Quý 4 cho học viên');

  -- Chi (Expense)
  INSERT INTO public.finance_transactions (organization_id, type, category, amount, date, description)
  VALUES 
    (v_org_id, 'expense', 'Mặt bằng', 15000000, TO_CHAR(v_now - INTERVAL '20 days', 'YYYY-MM-DD'), 'Chi tiền thuê mặt bằng cơ sở Riverside tháng này'),
    (v_org_id, 'expense', 'Trang thiết bị', 4200000, TO_CHAR(v_now - INTERVAL '14 days', 'YYYY-MM-DD'), 'Mua bổ sung đệm mút EVA, bao cát 1m2 và đích đấm tập luyện'),
    (v_org_id, 'expense', 'Lương HLV', 5000000, TO_CHAR(v_now - INTERVAL '12 days', 'YYYY-MM-DD'), 'Tạm ứng lương giảng dạy HLV Master Hùng & Coach Minh'),
    (v_org_id, 'expense', 'Vận hành', 780000, TO_CHAR(v_now - INTERVAL '7 days', 'YYYY-MM-DD'), 'Chi nước uống Lavie và vật tư tủ thuốc sơ cứu chấn thương'),
    (v_org_id, 'expense', 'Marketing', 1200000, TO_CHAR(v_now - INTERVAL '3 days', 'YYYY-MM-DD'), 'Chi phí in standee và tờ rơi tuyển sinh khóa mới');

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'venues_seeded', 3,
    'coaches_seeded', 4,
    'classes_seeded', 6,
    'students_seeded', 16,
    'belts_seeded', 8,
    'schedules_seeded', 8,
    'sessions_seeded', 5,
    'tuitions_seeded', 16,
    'transactions_seeded', 10,
    'message', 'Dữ liệu mẫu cho toàn bộ hệ thống đã được nạp thành công!'
  );
END;
$$;

-- Allow authenticated users to execute the seed function
GRANT EXECUTE ON FUNCTION public.seed_sample_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_sample_data(UUID) TO service_role;

-- Automatically run for existing organization if any exists
SELECT public.seed_sample_data();
