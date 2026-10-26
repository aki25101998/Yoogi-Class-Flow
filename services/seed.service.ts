import { SupabaseClient } from '@supabase/supabase-js';

export async function seedFallbackSampleData(
  supabase: SupabaseClient,
  orgId: string,
  coachId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // 1. Belts (Check if organization already has belts)
    const { data: existingBelts } = await supabase
      .from('organization_belts')
      .select('id, name, display_order')
      .eq('organization_id', orgId)
      .order('display_order', { ascending: true });

    let belts = existingBelts || [];
    if (belts.length === 0) {
      const beltsData = [
        { organization_id: orgId, name: 'Đai Trắng (Cấp 10)', display_order: 1, is_active: true },
        { organization_id: orgId, name: 'Đai Vàng (Cấp 8)', display_order: 2, is_active: true },
        { organization_id: orgId, name: 'Đai Cam (Cấp 6)', display_order: 3, is_active: true },
        { organization_id: orgId, name: 'Đai Xanh Lá (Cấp 4)', display_order: 4, is_active: true },
        { organization_id: orgId, name: 'Đai Xanh Dương (Cấp 2)', display_order: 5, is_active: true },
        { organization_id: orgId, name: 'Đai Đỏ (Cấp 1)', display_order: 6, is_active: true },
        { organization_id: orgId, name: 'Đai Nâu (Cận Huyền Đai)', display_order: 7, is_active: true },
        { organization_id: orgId, name: 'Huyền Đai (1 Đẳng)', display_order: 8, is_active: true },
      ];
      const { data: insertedBelts } = await supabase.from('organization_belts').insert(beltsData).select();
      belts = insertedBelts || [];
    }

    const getBeltId = (namePrefix: string) => belts.find(b => b.name.includes(namePrefix))?.id || belts[0]?.id;

    // 2. Venues
    const venuesToInsert = [
      {
        organization_id: orgId,
        name: 'Yoogi Martial Arts Riverside',
        address: 'Số 12 Tôn Thất Thuyết, Phường 1, Quận 4, TP. Hồ Chí Minh',
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop',
        image_position: '50% 45%'
      },
      {
        organization_id: orgId,
        name: 'Yoogi Sunrise Sports Complex',
        address: '242 Hai Bà Trưng, Phường Tân Định, Quận 1, TP. Hồ Chí Minh',
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
        image_position: '50% 50%'
      },
      {
        organization_id: orgId,
        name: 'Yoogi Kickboxing & Fitness Arena',
        address: '88 Song Hành, Phường An Phú, Quận 2, TP. Thủ Đức, TP. Hồ Chí Minh',
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?q=80&w=1200&auto=format&fit=crop',
        image_position: '50% 55%'
      }
    ];

    for (const v of venuesToInsert) {
      const { data: existing } = await supabase.from('venues').select('id').eq('organization_id', orgId).eq('name', v.name).single();
      if (!existing) {
        await supabase.from('venues').insert([v]);
      }
    }

    const { data: venues } = await supabase.from('venues').select('id, name').eq('organization_id', orgId);
    const v1Id = venues?.find(v => v.name.includes('Riverside'))?.id;
    const v2Id = venues?.find(v => v.name.includes('Sunrise'))?.id;
    const v3Id = venues?.find(v => v.name.includes('Kickboxing'))?.id;

    // 3. Classes
    const classesToInsert = [
      { organization_id: orgId, venue_id: v1Id, name: 'Karatedo Thiếu Nhi K01', start_time: '17:30', end_time: '19:00', schedule_days: [1, 3, 5], status: 'active' },
      { organization_id: orgId, venue_id: v1Id, name: 'Karatedo Thiếu Niên K02', start_time: '19:15', end_time: '20:45', schedule_days: [1, 3, 5], status: 'active' },
      { organization_id: orgId, venue_id: v2Id, name: 'Taekwondo Năng Khiếu T01', start_time: '18:00', end_time: '19:30', schedule_days: [2, 4, 6], status: 'active' },
      { organization_id: orgId, venue_id: v2Id, name: 'Taekwondo Thiếu Nhi T02', start_time: '08:30', end_time: '10:00', schedule_days: [6, 0], status: 'active' },
      { organization_id: orgId, venue_id: v3Id, name: 'Kickboxing & Đối Kháng B01', start_time: '18:30', end_time: '20:00', schedule_days: [1, 3, 5], status: 'active' },
      { organization_id: orgId, venue_id: v3Id, name: 'Võ Nhạc & Thể Lực V01', start_time: '17:00', end_time: '18:15', schedule_days: [2, 4, 6], status: 'active' }
    ];

    for (const c of classesToInsert) {
      if (!c.venue_id) continue;
      const { data: existing } = await supabase.from('venue_classes').select('id').eq('organization_id', orgId).eq('name', c.name).single();
      if (!existing) {
        await supabase.from('venue_classes').insert([c]);
      }
    }

    const { data: classes } = await supabase.from('venue_classes').select('id, name').eq('organization_id', orgId);
    const c1Id = classes?.find(c => c.name.includes('K01'))?.id;
    const c2Id = classes?.find(c => c.name.includes('K02'))?.id;
    const c3Id = classes?.find(c => c.name.includes('T01'))?.id;
    const c4Id = classes?.find(c => c.name.includes('T02'))?.id;
    const c5Id = classes?.find(c => c.name.includes('B01'))?.id;
    const c6Id = classes?.find(c => c.name.includes('V01'))?.id;

    // 4. Class Coaches (if user is coach)
    if (coachId && classes) {
      for (const cls of classes) {
        await supabase.from('class_coaches').upsert({
          organization_id: orgId,
          class_id: cls.id,
          coach_id: coachId,
          role: 'HEAD_COACH'
        }, { onConflict: 'class_id,coach_id' });
      }
    }

    // 5. Students
    const studentsToInsert = [
      { organization_id: orgId, name: 'Nguyễn Gia Bảo', phone: '0912111222', parent_name: 'Nguyễn Hữu Dũng', parent_phone: '0903111222', dob: '2014-03-15', current_belt_id: getBeltId('Cam'), venue_id: v1Id, status: 'active' },
      { organization_id: orgId, name: 'Trần Bảo Nam', phone: '0912222333', parent_name: 'Trần Văn Hưng', parent_phone: '0903222333', dob: '2015-06-20', current_belt_id: getBeltId('Vàng'), venue_id: v1Id, status: 'active' },
      { organization_id: orgId, name: 'Lê Mai Chi', phone: '0912333444', parent_name: 'Lê Thị Thảo', parent_phone: '0903333444', dob: '2013-11-10', current_belt_id: getBeltId('Xanh Lá'), venue_id: v1Id, status: 'active' },
      { organization_id: orgId, name: 'Vũ Hoàng Yến', phone: '0912444555', parent_name: 'Vũ Đức Nam', parent_phone: '0903444555', dob: '2014-08-05', current_belt_id: getBeltId('Trắng'), venue_id: v1Id, status: 'active' },
      { organization_id: orgId, name: 'Phạm Đăng Khoa', phone: '0988111222', parent_name: 'Phạm Văn Tuấn', parent_phone: '0908111222', dob: '2009-04-12', current_belt_id: getBeltId('Đỏ'), venue_id: v1Id, status: 'active' },
      { organization_id: orgId, name: 'Hoàng Gia Huy', phone: '0988222333', parent_name: 'Hoàng Kim Thúy', parent_phone: '0908222333', dob: '2010-09-25', current_belt_id: getBeltId('Nâu'), venue_id: v1Id, status: 'active' },
      { organization_id: orgId, name: 'Đỗ Minh Triết', phone: '0988333444', parent_name: 'Đỗ Quốc Oanh', parent_phone: '0908333444', dob: '2011-01-18', current_belt_id: getBeltId('Xanh Dương'), venue_id: v1Id, status: 'active' },
      { organization_id: orgId, name: 'Bùi Hà My', phone: '0977111222', parent_name: 'Bùi Xuân Hậu', parent_phone: '0917111222', dob: '2012-07-30', current_belt_id: getBeltId('Cam'), venue_id: v2Id, status: 'active' },
      { organization_id: orgId, name: 'Phan Đình Trí', phone: '0977222333', parent_name: 'Phan Văn Đạt', parent_phone: '0917222333', dob: '2011-12-14', current_belt_id: getBeltId('Xanh Lá'), venue_id: v2Id, status: 'active' },
      { organization_id: orgId, name: 'Lâm Ngọc Ánh', phone: '0977333444', parent_name: 'Lâm Nhật Minh', parent_phone: '0917333444', dob: '2013-05-22', current_belt_id: getBeltId('Vàng'), venue_id: v2Id, status: 'active' },
      { organization_id: orgId, name: 'Trịnh Tuấn Khang', phone: '0966111222', parent_name: 'Trịnh Đình Long', parent_phone: '0926111222', dob: '2016-02-10', current_belt_id: getBeltId('Trắng'), venue_id: v2Id, status: 'active' },
      { organization_id: orgId, name: 'Đoàn Thảo Nguyên', phone: '0966222333', parent_name: 'Đoàn Hữu Tín', parent_phone: '0926222333', dob: '2015-10-18', current_belt_id: getBeltId('Vàng'), venue_id: v2Id, status: 'active' },
      { organization_id: orgId, name: 'Nguyễn Quốc Huy', phone: '0938111222', parent_name: 'Nguyễn Tấn Sang', parent_phone: '0938000111', dob: '2005-08-14', current_belt_id: getBeltId('Đỏ'), venue_id: v3Id, status: 'active' },
      { organization_id: orgId, name: 'Võ Trọng Nghĩa', phone: '0938222333', parent_name: 'Võ Hồng Phong', parent_phone: '0938000222', dob: '2006-03-29', current_belt_id: getBeltId('Nâu'), venue_id: v3Id, status: 'active' },
      { organization_id: orgId, name: 'Mai Thùy Linh', phone: '0938333444', parent_name: 'Mai Văn Hòa', parent_phone: '0938000333', dob: '2007-11-03', current_belt_id: getBeltId('Cam'), venue_id: v3Id, status: 'active' },
      { organization_id: orgId, name: 'Đặng Kim Ngân', phone: '0938444555', parent_name: 'Đặng Thu Trang', parent_phone: '0938000444', dob: '2008-01-16', current_belt_id: getBeltId('Xanh Lá'), venue_id: v3Id, status: 'active' }
    ];

    for (const s of studentsToInsert) {
      const { data: existing } = await supabase.from('students').select('id').eq('organization_id', orgId).eq('name', s.name).single();
      if (!existing) {
        await supabase.from('students').insert([s]);
      }
    }

    const { data: students } = await supabase.from('students').select('id, name').eq('organization_id', orgId);

    // 6. Class Students
    if (students && students.length >= 16) {
      const classStudentMappings = [
        { class_id: c1Id, student_ids: [students[0].id, students[1].id, students[2].id, students[3].id] },
        { class_id: c2Id, student_ids: [students[4].id, students[5].id, students[6].id] },
        { class_id: c3Id, student_ids: [students[7].id, students[8].id, students[9].id] },
        { class_id: c4Id, student_ids: [students[10].id, students[11].id] },
        { class_id: c5Id, student_ids: [students[12].id, students[13].id] },
        { class_id: c6Id, student_ids: [students[14].id, students[15].id] }
      ];

      for (const mapping of classStudentMappings) {
        if (!mapping.class_id) continue;
        for (const sId of mapping.student_ids) {
          await supabase.from('class_students').upsert({
            organization_id: orgId,
            class_id: mapping.class_id,
            student_id: sId,
            status: 'active'
          }, { onConflict: 'class_id,student_id' });
        }
      }
    }

    // 7. Tuition
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (students && students.length >= 16 && c1Id) {
      const tuitionList = [
        { organization_id: orgId, student_id: students[0].id, class_id: c1Id, amount: 1000000, paid_amount: 1000000, due_date: currentMonth, status: 'paid' },
        { organization_id: orgId, student_id: students[1].id, class_id: c1Id, amount: 1000000, paid_amount: 1000000, due_date: currentMonth, status: 'paid' },
        { organization_id: orgId, student_id: students[2].id, class_id: c1Id, amount: 1000000, paid_amount: 500000, due_date: currentMonth, status: 'partial' },
        { organization_id: orgId, student_id: students[3].id, class_id: c1Id, amount: 1000000, paid_amount: 0, due_date: currentMonth, status: 'unpaid' },
        { organization_id: orgId, student_id: students[4].id, class_id: c2Id, amount: 1200000, paid_amount: 1200000, due_date: currentMonth, status: 'paid' },
        { organization_id: orgId, student_id: students[5].id, class_id: c2Id, amount: 1200000, paid_amount: 1200000, due_date: currentMonth, status: 'paid' },
        { organization_id: orgId, student_id: students[6].id, class_id: c2Id, amount: 1200000, paid_amount: 600000, due_date: currentMonth, status: 'partial' },
        { organization_id: orgId, student_id: students[7].id, class_id: c3Id, amount: 900000, paid_amount: 900000, due_date: currentMonth, status: 'paid' },
        { organization_id: orgId, student_id: students[8].id, class_id: c3Id, amount: 900000, paid_amount: 900000, due_date: currentMonth, status: 'paid' },
        { organization_id: orgId, student_id: students[9].id, class_id: c3Id, amount: 900000, paid_amount: 450000, due_date: currentMonth, status: 'partial' },
        { organization_id: orgId, student_id: students[10].id, class_id: c4Id, amount: 850000, paid_amount: 0, due_date: currentMonth, status: 'unpaid' },
        { organization_id: orgId, student_id: students[11].id, class_id: c4Id, amount: 850000, paid_amount: 0, due_date: currentMonth, status: 'unpaid' },
        { organization_id: orgId, student_id: students[12].id, class_id: c5Id, amount: 1500000, paid_amount: 1500000, due_date: currentMonth, status: 'paid' },
        { organization_id: orgId, student_id: students[13].id, class_id: c5Id, amount: 1500000, paid_amount: 800000, due_date: currentMonth, status: 'partial' },
        { organization_id: orgId, student_id: students[14].id, class_id: c6Id, amount: 800000, paid_amount: 800000, due_date: currentMonth, status: 'paid' },
        { organization_id: orgId, student_id: students[15].id, class_id: c6Id, amount: 800000, paid_amount: 0, due_date: currentMonth, status: 'unpaid' }
      ];

      for (const t of tuitionList) {
        const { data: existing } = await supabase.from('tuition').select('id').eq('organization_id', orgId).eq('student_id', t.student_id).eq('due_date', t.due_date).single();
        if (!existing) {
          await supabase.from('tuition').insert([t]);
        }
      }
    }

    // 8. Finance Transactions
    const today = new Date().toISOString().slice(0, 10);
    const financeTransactions = [
      { organization_id: orgId, type: 'income', category: 'Học phí', amount: 5200000, date: today, description: 'Thu học phí đợt 1 Lớp Karatedo K01 & K02' },
      { organization_id: orgId, type: 'income', category: 'Học phí', amount: 4150000, date: today, description: 'Thu học phí Lớp Taekwondo T01 & T02' },
      { organization_id: orgId, type: 'income', category: 'Học phí', amount: 3800000, date: today, description: 'Thu học phí Lớp Kickboxing B01 & Võ Nhạc' },
      { organization_id: orgId, type: 'income', category: 'Võ phục & Dụng cụ', amount: 2450000, date: today, description: 'Tiền bán võ phục Karatedo, Taekwondo và băng quấn tay' },
      { organization_id: orgId, type: 'expense', category: 'Mặt bằng', amount: 15000000, date: today, description: 'Chi tiền thuê mặt bằng cơ sở Riverside tháng này' },
      { organization_id: orgId, type: 'expense', category: 'Trang thiết bị', amount: 4200000, date: today, description: 'Mua bổ sung đệm mút EVA, bao cát 1m2 và đích đấm tập luyện' },
      { organization_id: orgId, type: 'expense', category: 'Lương HLV', amount: 5000000, date: today, description: 'Tạm ứng lương giảng dạy HLV' },
      { organization_id: orgId, type: 'expense', category: 'Vận hành', amount: 780000, date: today, description: 'Chi nước uống Lavie và vật tư tủ thuốc sơ cứu chấn thương' }
    ];

    for (const tx of financeTransactions) {
      await supabase.from('finance_transactions').insert([tx]);
    }

    return {
      success: true,
      message: 'Đã nạp thành công bộ dữ liệu mẫu (Cấp đai, Chi nhánh, Lớp học, Học viên, Học phí, Sổ quỹ)! Để nạp thêm đầy đủ 4 HLV và buổi học điểm danh chi tiết, hãy chạy file migration 035_seed_sample_data.sql trong Supabase SQL Editor.'
    };
  } catch (error: any) {
    console.error('Seed fallback error:', error);
    return { success: false, error: error.message };
  }
}
