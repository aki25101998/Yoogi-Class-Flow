import { getDb } from './auth.js';

const supabase = getDb(); // Actually returns supabaseClient now

// Helper to handle errors uniformly
function handleDbError(error, context) {
  if (error) {
    console.error(`DB Error in ${context}:`, error);
    throw error;
  }
}

// ============ COACHES ============

export async function getCoaches() {
  const { data, error } = await supabase.from('coaches').select('*').eq('status', 'active');
  handleDbError(error, 'getCoaches');
  return data || [];
}

export async function getAllCoaches() {
  const { data, error } = await supabase.from('coaches').select('*');
  handleDbError(error, 'getAllCoaches');
  return data || [];
}

export async function getCoach(id) {
  const { data, error } = await supabase.from('coaches').select('*').eq('id', id).single();
  if (error && error.code === 'PGRST116') return null; // Not found
  handleDbError(error, 'getCoach');
  return data;
}

export async function addCoach(data) {
  const coachData = {
    name: data.name,
    email: data.email.toLowerCase().trim(),
    phone: data.phone || '',
    cccd: data.cccd || '',
    level: data.level || '',
    membership_number: data.membershipNumber || '',
    role: data.role || 'coach',
    permissions: data.permissions || {},
    status: 'active',
    photo_url: ''
  };
  const { data: newDoc, error } = await supabase.from('coaches').insert([coachData]).select('id').single();
  handleDbError(error, 'addCoach');
  return newDoc.id;
}

export async function updateCoach(id, data) {
  const updateData = { ...data, updated_at: new Date().toISOString() };
  if (updateData.membershipNumber) {
    updateData.membership_number = updateData.membershipNumber;
    delete updateData.membershipNumber;
  }
  const { error } = await supabase.from('coaches').update(updateData).eq('id', id);
  handleDbError(error, 'updateCoach');
}

export async function deleteCoach(id) {
  await updateCoach(id, { status: 'inactive' });
}

export async function findCoachByEmail(email) {
  const { data, error } = await supabase.from('coaches').select('*').eq('email', email.toLowerCase().trim());
  handleDbError(error, 'findCoachByEmail');
  return (data && data.length > 0) ? data[0] : null;
}

// ============ VENUES ============

export async function getVenues() {
  const { data, error } = await supabase.from('venues').select('*').eq('status', 'active');
  handleDbError(error, 'getVenues');
  return data || [];
}

export async function getVenue(id) {
  const { data, error } = await supabase.from('venues').select('*').eq('id', id).single();
  if (error && error.code === 'PGRST116') return null;
  handleDbError(error, 'getVenue');
  return data;
}

export async function addVenue(data) {
  const venueData = {
    name: data.name,
    address: data.address || '',
    status: 'active'
  };
  const { data: newDoc, error } = await supabase.from('venues').insert([venueData]).select('id').single();
  handleDbError(error, 'addVenue');
  return newDoc.id;
}

export async function updateVenue(id, data) {
  const { error } = await supabase.from('venues').update(data).eq('id', id);
  handleDbError(error, 'updateVenue');
}

export async function deleteVenue(id) {
  await updateVenue(id, { status: 'inactive' });
}

// ============ VENUE COACHES (sub-collection) ============

export async function getVenueCoaches(venueId) {
  const { data, error } = await supabase.from('venue_coaches').select('*').eq('venue_id', venueId).eq('status', 'active');
  handleDbError(error, 'getVenueCoaches');
  return (data || []).map(d => ({ ...d, venueId: d.venue_id, coachId: d.coach_id, rateType: d.rate_type, scheduleDays: d.schedule_days, startTime: d.start_time, endTime: d.end_time }));
}

export async function getAllVenueCoaches() {
  const { data, error } = await supabase.from('venue_coaches').select('*');
  handleDbError(error, 'getAllVenueCoaches');
  return (data || []).map(d => ({ ...d, venueId: d.venue_id, coachId: d.coach_id, rateType: d.rate_type, scheduleDays: d.schedule_days, startTime: d.start_time, endTime: d.end_time }));
}

export async function getVenuesForCoach(coachId) {
  const venues = await getVenues();
  const { data, error } = await supabase.from('venue_coaches').select('*').eq('coach_id', coachId);
  handleDbError(error, 'getVenuesForCoach');
  
  const results = [];
  for (const venue of venues) {
    const match = data?.find(e => e.venue_id === venue.id);
    if (match) {
      const vc = { ...match, venueId: match.venue_id, coachId: match.coach_id, rateType: match.rate_type, scheduleDays: match.schedule_days, startTime: match.start_time, endTime: match.end_time };
      results.push({ venueId: venue.id, venue, venueCoach: vc });
    }
  }
  return results;
}

export async function getVenueCoachByCoachId(venueId, coachId) {
  const { data, error } = await supabase.from('venue_coaches').select('*').eq('venue_id', venueId).eq('coach_id', coachId);
  handleDbError(error, 'getVenueCoachByCoachId');
  if (!data || data.length === 0) return null;
  const match = data[0];
  return { ...match, venueId: match.venue_id, coachId: match.coach_id, rateType: match.rate_type, scheduleDays: match.schedule_days, startTime: match.start_time, endTime: match.end_time };
}

export async function addVenueCoach(venueId, data) {
  const vcData = {
    venue_id: venueId,
    coach_id: data.coachId,
    rate_type: data.rateType || 'per_session',
    rate: Number(data.rate) || 0,
    schedule_days: data.scheduleDays || [],
    start_time: data.startTime || '18:00',
    end_time: data.endTime || '20:00',
    status: 'active'
  };
  const { data: newDoc, error } = await supabase.from('venue_coaches').insert([vcData]).select('id').single();
  handleDbError(error, 'addVenueCoach');
  return newDoc.id;
}

export async function updateVenueCoach(venueId, venueCoachId, data) {
  const updateData = { updated_at: new Date().toISOString() };
  if (data.rateType !== undefined) updateData.rate_type = data.rateType;
  if (data.rate !== undefined) updateData.rate = data.rate;
  if (data.scheduleDays !== undefined) updateData.schedule_days = data.scheduleDays;
  if (data.startTime !== undefined) updateData.start_time = data.startTime;
  if (data.endTime !== undefined) updateData.end_time = data.endTime;
  if (data.status !== undefined) updateData.status = data.status;
  
  const { error } = await supabase.from('venue_coaches').update(updateData).eq('id', venueCoachId);
  handleDbError(error, 'updateVenueCoach');
}

export async function removeVenueCoach(venueId, venueCoachId) {
  await updateVenueCoach(venueId, venueCoachId, { status: 'inactive' });
}

// ============ VENUE CLASSES (sub-collection) ============

export async function getVenueClasses(venueId) {
  const { data, error } = await supabase.from('venue_classes').select('*').eq('venue_id', venueId).eq('status', 'active');
  handleDbError(error, 'getVenueClasses');
  return (data || []).map(d => ({ ...d, venueId: d.venue_id, scheduleDays: d.schedule_days, startTime: d.start_time, endTime: d.end_time }));
}

export async function getAllVenueClasses() {
  const { data, error } = await supabase.from('venue_classes').select('*').eq('status', 'active');
  handleDbError(error, 'getAllVenueClasses');
  return (data || []).map(d => ({ ...d, venueId: d.venue_id, scheduleDays: d.schedule_days, startTime: d.start_time, endTime: d.end_time }));
}

export async function addVenueClass(venueId, data) {
  const classData = {
    venue_id: venueId,
    name: data.name || '',
    start_time: data.startTime || '18:00',
    end_time: data.endTime || '20:00',
    schedule_days: data.scheduleDays || [],
    status: 'active'
  };
  const { data: newDoc, error } = await supabase.from('venue_classes').insert([classData]).select('id').single();
  handleDbError(error, 'addVenueClass');
  return newDoc.id;
}

export async function updateVenueClass(venueId, classId, data) {
  const updateData = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.startTime !== undefined) updateData.start_time = data.startTime;
  if (data.endTime !== undefined) updateData.end_time = data.endTime;
  if (data.scheduleDays !== undefined) updateData.schedule_days = data.scheduleDays;
  if (data.status !== undefined) updateData.status = data.status;
  
  const { error } = await supabase.from('venue_classes').update(updateData).eq('id', classId);
  handleDbError(error, 'updateVenueClass');
}

export async function removeVenueClass(venueId, classId) {
  await updateVenueClass(venueId, classId, { status: 'inactive' });
}

export async function getSchedulesFromVenueCoaches(filters = {}) {
  let allVC;
  if (filters.venueId) {
    allVC = await getVenueCoaches(filters.venueId);
  } else {
    allVC = await getAllVenueCoaches();
  }

  if (filters.coachId) {
    allVC = allVC.filter(vc => vc.coachId === filters.coachId);
  }

  const schedules = [];
  for (const vc of allVC) {
    const days = vc.scheduleDays || [];
    for (const day of days) {
      if (filters.dayOfWeek && day !== filters.dayOfWeek) continue;
      schedules.push({
        id: `${vc.id}_${day}`,
        venueCoachId: vc.id,
        coachId: vc.coachId,
        venueId: vc.venueId,
        dayOfWeek: day,
        startTime: vc.startTime,
        endTime: vc.endTime,
        rateType: vc.rateType,
        rate: vc.rate,
        status: 'active'
      });
    }
  }
  return schedules;
}

export async function getSchedulesByCoachVC(coachId) {
  return getSchedulesFromVenueCoaches({ coachId });
}

// ============ SCHEDULES (legacy) ============

export async function getSchedules(filters = {}) {
  let query = supabase.from('schedules').select('*').eq('status', 'active');
  if (filters.coachId) query = query.eq('coach_id', filters.coachId);
  if (filters.venueId) query = query.eq('venue_id', filters.venueId);
  if (filters.dayOfWeek) query = query.eq('day_of_week', filters.dayOfWeek);
  
  const { data, error } = await query;
  handleDbError(error, 'getSchedules');
  return (data || []).map(d => ({ ...d, coachId: d.coach_id, venueId: d.venue_id, dayOfWeek: d.day_of_week, startTime: d.start_time, endTime: d.end_time, rateType: d.rate_type }));
}

export async function getSchedulesByCoach(coachId) {
  return getSchedules({ coachId });
}

export async function getSchedulesByDay(dayOfWeek) {
  return getSchedules({ dayOfWeek });
}

export async function addSchedule(data) {
  const scheduleData = {
    coach_id: data.coachId,
    venue_id: data.venueId,
    day_of_week: Number(data.dayOfWeek),
    start_time: data.startTime,
    end_time: data.endTime,
    rate_type: data.rateType || 'per_session',
    rate: Number(data.rate) || 0,
    status: 'active'
  };
  const { data: newDoc, error } = await supabase.from('schedules').insert([scheduleData]).select('id').single();
  handleDbError(error, 'addSchedule');
  return newDoc.id;
}

export async function updateSchedule(id, data) {
  const updateData = {};
  if (data.dayOfWeek !== undefined) updateData.day_of_week = Number(data.dayOfWeek);
  if (data.rate !== undefined) updateData.rate = Number(data.rate);
  if (data.startTime !== undefined) updateData.start_time = data.startTime;
  if (data.endTime !== undefined) updateData.end_time = data.endTime;
  if (data.rateType !== undefined) updateData.rate_type = data.rateType;
  if (data.status !== undefined) updateData.status = data.status;
  
  const { error } = await supabase.from('schedules').update(updateData).eq('id', id);
  handleDbError(error, 'updateSchedule');
}

export async function deleteSchedule(id) {
  await updateSchedule(id, { status: 'inactive' });
}

// ============ ATTENDANCE ============

export async function getAttendanceByDate(date) {
  const { data, error } = await supabase.from('attendance').select('*').eq('date', date);
  handleDbError(error, 'getAttendanceByDate');
  return (data || []).map(d => ({ ...d, coachId: d.coach_id, scheduleId: d.schedule_id, venueCoachId: d.venue_coach_id, venueId: d.venue_id, checkInTime: d.check_in_time, checkInBy: d.check_in_by, approvedBy: d.approved_by, approvedAt: d.approved_at, isSubstitution: d.is_substitution, originalCoachId: d.original_coach_id }));
}

export async function getAttendanceByCoachMonth(coachId, yearMonth) {
  const startDate = `${yearMonth}-01`;
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  
  const { data, error } = await supabase.from('attendance')
    .select('*')
    .eq('coach_id', coachId)
    .gte('date', startDate)
    .lte('date', endDate);
    
  handleDbError(error, 'getAttendanceByCoachMonth');
  return (data || []).map(d => ({ ...d, coachId: d.coach_id, scheduleId: d.schedule_id, venueCoachId: d.venue_coach_id, venueId: d.venue_id, checkInTime: d.check_in_time, checkInBy: d.check_in_by, approvedBy: d.approved_by, approvedAt: d.approved_at, isSubstitution: d.is_substitution, originalCoachId: d.original_coach_id }));
}

export async function getAttendanceByMonth(yearMonth) {
  const startDate = `${yearMonth}-01`;
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  
  const { data, error } = await supabase.from('attendance')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  handleDbError(error, 'getAttendanceByMonth');
  return (data || []).map(d => ({ ...d, coachId: d.coach_id, scheduleId: d.schedule_id, venueCoachId: d.venue_coach_id, venueId: d.venue_id, checkInTime: d.check_in_time, checkInBy: d.check_in_by, approvedBy: d.approved_by, approvedAt: d.approved_at, isSubstitution: d.is_substitution, originalCoachId: d.original_coach_id }));
}

export async function checkIn({ coachId, scheduleId, venueId, venueCoachId, date, checkInBy, note = '', isSubstitution = false, originalCoachId = '' }) {
  const record = {
    coach_id: coachId,
    schedule_id: scheduleId || null,
    venue_coach_id: venueCoachId || null,
    venue_id: venueId || null,
    date,
    check_in_by: checkInBy || coachId,
    status: 'checked_in',
    earnings: 0,
    note: note || '',
    is_substitution: isSubstitution || false,
    original_coach_id: originalCoachId || null
  };
  
  if (checkInBy && checkInBy !== coachId) {
    record.status = 'approved';
    record.approved_by = checkInBy;
    record.approved_at = new Date().toISOString();
  }
  
  const { data: ref, error } = await supabase.from('attendance').insert([record]).select('id, status, venue_coach_id, venue_id, schedule_id').single();
  handleDbError(error, 'checkIn');
  
  if (ref.status === 'approved') {
    let earnings = 0;
    if (ref.venue_coach_id && ref.venue_id) {
      const { data: vcDoc } = await supabase.from('venue_coaches').select('*').eq('id', ref.venue_coach_id).single();
      if (vcDoc) earnings = calculateEarnings(vcDoc);
    }
    if (!earnings && ref.schedule_id) {
      const { data: schedule } = await supabase.from('schedules').select('*').eq('id', ref.schedule_id).single();
      if (schedule) earnings = calculateEarnings(schedule);
    }
    if (earnings) {
      await supabase.from('attendance').update({ earnings }).eq('id', ref.id);
    }
  }
  
  return ref.id;
}

function calculateEarnings(schedule) {
  let total = 0;
  if (schedule.rate_type === 'per_session') total += Number(schedule.rate || 0);
  return total; // Simplification since students is not on schedule anymore
}

export async function checkInV2({ coachId, classId, date, checkInBy }) {
  const { data: salaryConfig } = await supabase.from('teacher_salaries').select('*').eq('coach_id', coachId).single();
  
  const record = {
    coach_id: coachId,
    class_id: classId || null,
    date,
    check_in_by: checkInBy || coachId,
    status: 'checked_in',
    calculated_salary: 0,
    salary_config_snapshot: salaryConfig || null
  };
  
  if (checkInBy && checkInBy !== coachId) {
    record.status = 'approved';
    record.approved_by = checkInBy;
    record.approved_at = new Date().toISOString();
    record.calculated_salary = await calculateV2Earnings(coachId, classId, date, salaryConfig);
  }
  
  const { data: ref, error } = await supabase.from('teacher_salary_sessions').insert([record]).select('id').single();
  handleDbError(error, 'checkInV2');
  return ref.id;
}

export async function approveAttendanceV2(sessionId, adminId) {
  const { data: session } = await supabase.from('teacher_salary_sessions').select('*').eq('id', sessionId).single();
  if (!session) throw new Error('Session not found');
  
  const earnings = await calculateV2Earnings(session.coach_id, session.class_id, session.date, session.salary_config_snapshot);
  
  await supabase.from('teacher_salary_sessions').update({
    status: 'approved',
    approved_by: adminId,
    approved_at: new Date().toISOString(),
    calculated_salary: earnings
  }).eq('id', sessionId);
}

export async function rejectAttendanceV2(sessionId, adminId) {
  await supabase.from('teacher_salary_sessions').update({
    status: 'rejected',
    rejected_by: adminId,
    rejected_at: new Date().toISOString(),
    calculated_salary: 0
  }).eq('id', sessionId);
}

async function calculateV2Earnings(coachId, classId, date, salaryConfig) {
  if (!salaryConfig) return 0;
  let earnings = 0;
  if (salaryConfig.per_session) earnings += Number(salaryConfig.per_session);
  if (salaryConfig.per_student && classId) {
    const { data: attSnap } = await supabase.from('student_attendance')
      .select('*')
      .eq('class_id', classId)
      .eq('date', date);
    if (attSnap && attSnap.length > 0) {
      const records = attSnap[0].records || [];
      const presentCount = records.filter(r => r.status === 'present').length;
      earnings += presentCount * Number(salaryConfig.per_student);
    }
  }
  return earnings;
}

export async function approveAttendance(attendanceId, adminId) {
  const { data: att } = await supabase.from('attendance').select('*').eq('id', attendanceId).single();
  if (!att) throw new Error('Record not found');
  
  let earnings = 0;
  if (att.venue_coach_id) {
    const { data: vcDoc } = await supabase.from('venue_coaches').select('*').eq('id', att.venue_coach_id).single();
    if (vcDoc) earnings = calculateEarnings(vcDoc);
  }
  if (!earnings && att.schedule_id) {
    const { data: schedule } = await supabase.from('schedules').select('*').eq('id', att.schedule_id).single();
    if (schedule) earnings = calculateEarnings(schedule);
  }
  
  await supabase.from('attendance').update({
    status: 'approved',
    approved_by: adminId,
    approved_at: new Date().toISOString(),
    earnings
  }).eq('id', attendanceId);
}

export async function rejectAttendance(attendanceId, adminId, reason = '') {
  await supabase.from('attendance').update({
    status: 'rejected',
    approved_by: adminId,
    approved_at: new Date().toISOString(),
    note: reason
  }).eq('id', attendanceId);
}

export async function updateAttendance(id, data) {
  const updateData = { ...data };
  if (data.checkInTime) updateData.check_in_time = data.checkInTime;
  if (data.checkInBy) updateData.check_in_by = data.checkInBy;
  if (data.approvedBy) updateData.approved_by = data.approvedBy;
  if (data.approvedAt) updateData.approved_at = data.approvedAt;
  if (data.venueCoachId) updateData.venue_coach_id = data.venueCoachId;
  if (data.originalCoachId) updateData.original_coach_id = data.originalCoachId;
  if (data.scheduleId) updateData.schedule_id = data.scheduleId;
  if (data.isSubstitution !== undefined) updateData.is_substitution = data.isSubstitution;
  
  await supabase.from('attendance').update(updateData).eq('id', id);
}

export async function deleteAttendanceRecord(id) {
  await supabase.from('attendance').delete().eq('id', id);
}

export async function calculateMonthlyPayroll(yearMonth) {
  const [attendance, coaches] = await Promise.all([
    getAttendanceByMonth(yearMonth),
    getAllCoaches()
  ]);
  
  const coachMap = {};
  coaches.forEach(c => { coachMap[c.id] = c; });
  const payroll = {};
  
  attendance.filter(a => a.status === 'approved').forEach(a => {
    if (!payroll[a.coachId]) {
      const coach = coachMap[a.coachId];
      payroll[a.coachId] = {
        coachId: a.coachId,
        coachName: coach?.name || 'Unknown',
        coachEmail: coach?.email || '',
        totalSessions: 0,
        totalEarnings: 0,
        records: []
      };
    }
    payroll[a.coachId].totalSessions++;
    payroll[a.coachId].totalEarnings += (a.earnings || 0);
    payroll[a.coachId].records.push(a);
  });
  return Object.values(payroll).sort((a, b) => b.totalEarnings - a.totalEarnings);
}

export async function calculateCoachPayroll(coachId, yearMonth) {
  const attendance = await getAttendanceByCoachMonth(coachId, yearMonth);
  const approved = attendance.filter(a => a.status === 'approved');
  return {
    coachId,
    totalSessions: approved.length,
    totalEarnings: approved.reduce((sum, a) => sum + (a.earnings || 0), 0),
    records: approved,
    allRecords: attendance
  };
}
// ============ STUDENTS ============

export async function getAllStudents() {
  const { data, error } = await supabase.from('students').select('*');
  if (error) console.error(error);
  return data || [];
}

export async function getStudentsByVenue(venueId) {
  const { data, error } = await supabase.from('students').select('*').eq('venue_id', venueId).eq('status', 'active');
  if (error) console.error(error);
  return (data || []).map(d => ({ ...d, venueId: d.venue_id, classId: d.class_id, beltRank: d.belt_rank, parentPhone: d.parent_phone }));
}

export async function addStudent(data) {
  const studentData = {
    name: data.name,
    dob: data.dob || '',
    belt_rank: data.beltRank || '',
    weight: Number(data.weight) || 0,
    height: Number(data.height) || 0,
    parent_phone: data.parentPhone || '',
    venue_id: data.venueId || null,
    class_id: data.classId || null,
    status: 'active'
  };
  const { data: newDoc, error } = await supabase.from('students').insert([studentData]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function updateStudent(id, data) {
  const updateData = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.dob !== undefined) updateData.dob = data.dob;
  if (data.beltRank !== undefined) updateData.belt_rank = data.beltRank;
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.height !== undefined) updateData.height = data.height;
  if (data.parentPhone !== undefined) updateData.parent_phone = data.parentPhone;
  if (data.venueId !== undefined) updateData.venue_id = data.venueId;
  if (data.classId !== undefined) updateData.class_id = data.classId;
  if (data.status !== undefined) updateData.status = data.status;
  
  await supabase.from('students').update(updateData).eq('id', id);
}

export async function deleteStudent(id) {
  await updateStudent(id, { status: 'inactive' });
}

// ============ STUDENT ATTENDANCE ============

export async function submitStudentAttendance(studentIds, venueId, date, coachId) {
  const records = studentIds.map(studentId => ({
    student_id: studentId,
    venue_id: venueId,
    date,
    is_present: true,
    marked_by_coach_id: coachId
  }));
  const { error } = await supabase.from('student_attendance').insert(records);
  if (error) throw error;
}

// ============ SETTINGS ============

export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 'general').single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data.value || data;
  
  const defaultSettings = {
    beltRanks: ["Đai trắng", "Đai vàng", "Đai xanh", "Đai đỏ", "Đai đen", "Đai đen 1 đẳng", "Đai đen 2 đẳng", "Đai đen 3 đẳng"]
  };
  await supabase.from('settings').insert([{ id: 'general', value: defaultSettings }]);
  return defaultSettings;
}

export async function updateSettings(data) {
  const { data: existing } = await supabase.from('settings').select('*').eq('id', 'general').single();
  let val = existing ? existing.value : {};
  val = { ...val, ...data };
  await supabase.from('settings').upsert({ id: 'general', value: val });
}

// ==========================================
// V2 SCHEMA (CENTER MANAGEMENT SYSTEM)
// ==========================================

export async function getUserAccounts() {
  const { data } = await supabase.from('user_accounts').select('*');
  return data || [];
}

export async function addUserAccount(data) {
  const { data: newDoc, error } = await supabase.from('user_accounts').insert([data]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function getClassesV2() {
  const { data } = await supabase.from('classes').select('*').eq('status', 'active');
  return data || [];
}

export async function addClassV2(data) {
  const { data: newDoc, error } = await supabase.from('classes').insert([{ ...data, status: 'active' }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function updateClassV2(id, data) {
  await supabase.from('classes').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function getShifts() {
  const { data } = await supabase.from('shifts').select('*').eq('status', 'active');
  return data || [];
}

export async function addShift(data) {
  const { data: newDoc, error } = await supabase.from('shifts').insert([{ ...data, status: 'active' }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function getClassSchedules(classId) {
  const { data } = await supabase.from('class_schedules').select('*').eq('class_id', classId);
  return (data || []).map(d => ({ ...d, classId: d.class_id }));
}

export async function addClassSchedule(data) {
  const { data: newDoc, error } = await supabase.from('class_schedules').insert([{ ...data, class_id: data.classId }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function getClassTeachers(classId) {
  const { data } = await supabase.from('class_teachers').select('*').eq('class_id', classId).eq('status', 'active');
  return (data || []).map(d => ({ ...d, classId: d.class_id, coachId: d.coach_id }));
}

export async function addClassTeacher(data) {
  const { data: newDoc, error } = await supabase.from('class_teachers').insert([{ ...data, class_id: data.classId, coach_id: data.coachId, status: 'active' }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function getClassStudents(classId) {
  const { data } = await supabase.from('class_students').select('*').eq('class_id', classId).eq('status', 'active');
  return (data || []).map(d => ({ ...d, classId: d.class_id, studentId: d.student_id }));
}

export async function addClassStudent(data) {
  const { data: newDoc, error } = await supabase.from('class_students').insert([{ ...data, class_id: data.classId, student_id: data.studentId, status: 'active' }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function getClassHolidays(classId) {
  const { data } = await supabase.from('class_holidays').select('*').eq('class_id', classId);
  return (data || []).map(d => ({ ...d, classId: d.class_id }));
}

export async function getStudentAttendanceV2(classId, date) {
  let query = supabase.from('student_attendance').select('*').eq('class_id', classId);
  if (date) query = query.eq('date', date);
  const { data } = await query;
  return (data || []).map(d => ({ ...d, classId: d.class_id }));
}

export async function addStudentAttendanceV2(data) {
  const { data: newDoc, error } = await supabase.from('student_attendance').insert([{ ...data, class_id: data.classId }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function getStudentEvaluations(studentId) {
  const { data } = await supabase.from('student_evaluations').select('*').eq('student_id', studentId);
  return (data || []).map(d => ({ ...d, studentId: d.student_id }));
}

export async function addStudentEvaluation(data) {
  const { data: newDoc, error } = await supabase.from('student_evaluations').insert([{ ...data, student_id: data.studentId }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function getClassTests(classId) {
  const { data } = await supabase.from('class_tests').select('*').eq('class_id', classId);
  return (data || []).map(d => ({ ...d, classId: d.class_id }));
}

export async function addClassTest(data) {
  const { data: newDoc, error } = await supabase.from('class_tests').insert([{ ...data, class_id: data.classId }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

export async function getStudentTestGrades(testId) {
  const { data } = await supabase.from('student_test_grades').select('*').eq('test_id', testId);
  return (data || []).map(d => ({ ...d, testId: d.test_id, studentId: d.student_id }));
}

export async function addStudentTestGrade(data) {
  const { data: newDoc, error } = await supabase.from('student_test_grades').insert([{ ...data, test_id: data.testId, student_id: data.studentId }]).select('id').single();
  if (error) throw error;
  return newDoc.id;
}

// ==========================================
// PHASE 3 SCHEMA (FINANCE)
// ==========================================

export async function getTuitionPayments() {
  const { data } = await supabase.from('tuition_payments').select('*');
  return data || [];
}
export async function addTuitionPayment(data) {
  const { data: newDoc } = await supabase.from('tuition_payments').insert([data]).select('id').single();
  return newDoc.id;
}

export async function getTuitionAdjustments() {
  const { data } = await supabase.from('tuition_adjustments').select('*');
  return data || [];
}
export async function addTuitionAdjustment(data) {
  const { data: newDoc } = await supabase.from('tuition_adjustments').insert([data]).select('id').single();
  return newDoc.id;
}

export async function getFinanceCategories() {
  const { data } = await supabase.from('finance_categories').select('*');
  return data || [];
}
export async function addFinanceCategory(data) {
  const { data: newDoc } = await supabase.from('finance_categories').insert([data]).select('id').single();
  return newDoc.id;
}

export async function getFinanceTransactions() {
  const { data } = await supabase.from('finance_transactions').select('*');
  return data || [];
}
export async function addFinanceTransaction(data) {
  const { data: newDoc } = await supabase.from('finance_transactions').insert([data]).select('id').single();
  return newDoc.id;
}

// ==========================================
// PHASE 4 SCHEMA (TEACHER & SALARY)
// ==========================================

export async function getTeacherSalaries() {
  const { data } = await supabase.from('teacher_salaries').select('*');
  return (data || []).map(d => ({ ...d, coachId: d.coach_id, perSession: d.per_session, perStudent: d.per_student }));
}

export async function getTeacherSalary(coachId) {
  const { data } = await supabase.from('teacher_salaries').select('*').eq('coach_id', coachId).single();
  if (!data) return null;
  return { ...data, coachId: data.coach_id, perSession: data.per_session, perStudent: data.per_student };
}

export async function addTeacherSalary(data) {
  const insData = { ...data, coach_id: data.coachId, per_session: data.perSession, per_student: data.perStudent };
  const { data: newDoc } = await supabase.from('teacher_salaries').insert([insData]).select('id').single();
  return newDoc.id;
}

export async function updateTeacherSalary(id, data) {
  const updateData = { updated_at: new Date().toISOString() };
  if (data.perSession !== undefined) updateData.per_session = data.perSession;
  if (data.perStudent !== undefined) updateData.per_student = data.perStudent;
  if (data.baseSalary !== undefined) updateData.base_salary = data.baseSalary;
  await supabase.from('teacher_salaries').update(updateData).eq('id', id);
}

export async function getTeacherSalarySessions() {
  const { data } = await supabase.from('teacher_salary_sessions').select('*');
  return (data || []).map(d => ({ ...d, coachId: d.coach_id, classId: d.class_id, checkInTime: d.check_in_time, checkInBy: d.check_in_by, calculatedSalary: d.calculated_salary, salaryConfigSnapshot: d.salary_config_snapshot, approvedBy: d.approved_by, approvedAt: d.approved_at, rejectedBy: d.rejected_by, rejectedAt: d.rejected_at }));
}

export async function getTeacherSalarySessionsByDate(date) {
  const { data } = await supabase.from('teacher_salary_sessions').select('*').eq('date', date);
  return (data || []).map(d => ({ ...d, coachId: d.coach_id, classId: d.class_id, checkInTime: d.check_in_time, checkInBy: d.check_in_by, calculatedSalary: d.calculated_salary, salaryConfigSnapshot: d.salary_config_snapshot, approvedBy: d.approved_by, approvedAt: d.approved_at, rejectedBy: d.rejected_by, rejectedAt: d.rejected_at }));
}

export async function addTeacherSalarySession(data) {
  const insData = {
    coach_id: data.coachId,
    class_id: data.classId,
    date: data.date,
    check_in_by: data.checkInBy,
    status: data.status,
    calculated_salary: data.calculatedSalary,
    salary_config_snapshot: data.salaryConfigSnapshot,
    approved_by: data.approvedBy,
    approved_at: data.approvedAt,
    rejected_by: data.rejectedBy,
    rejected_at: data.rejectedAt
  };
  const { data: newDoc } = await supabase.from('teacher_salary_sessions').insert([insData]).select('id').single();
  return newDoc.id;
}

export async function deleteTeacherSalarySession(id) {
  await supabase.from('teacher_salary_sessions').delete().eq('id', id);
}

export async function getClassesForCoach(coachId) {
  const ct = await getClassTeachers(coachId); // Actually this query was wrong in original, should be coachId
  const { data } = await supabase.from('class_teachers').select('*').eq('coach_id', coachId).eq('status', 'active');
  const classTeachers = data || [];
  
  const classes = [];
  for (const t of classTeachers) {
    const { data: classDoc } = await supabase.from('classes').select('*').eq('id', t.class_id).single();
    if (classDoc) {
      classes.push({ ...classDoc, role: t.role });
    }
  }
  return classes;
}

export async function calculateMonthlyPayrollV2(monthPrefix) {
  const { data: sessionsSnap } = await supabase.from('teacher_salary_sessions').select('*').eq('status', 'approved').like('date', `${monthPrefix}%`);
  const sessions = sessionsSnap || [];

  const { data: salariesSnap } = await supabase.from('teacher_salaries').select('*');
  const salaryMap = {};
  (salariesSnap || []).forEach(d => {
    if (d.coach_id) salaryMap[d.coach_id] = d;
  });

  const { data: coachesSnap } = await supabase.from('user_accounts').select('*');
  const coachMap = {};
  (coachesSnap || []).forEach(d => {
    if (d.role === 'coach' || d.role === 'admin') coachMap[d.id] = d;
  });

  const payrollMap = {};
  for (const s of sessions) {
    if (!payrollMap[s.coach_id]) {
      payrollMap[s.coach_id] = {
        coachId: s.coach_id,
        coachName: coachMap[s.coach_id]?.name || 'Không rõ',
        coachEmail: coachMap[s.coach_id]?.email || '',
        baseSalary: salaryMap[s.coach_id]?.base_salary || 0,
        totalSessions: 0,
        sessionEarnings: 0,
        records: []
      };
    }
    payrollMap[s.coach_id].totalSessions += 1;
    payrollMap[s.coach_id].sessionEarnings += Number(s.calculated_salary || 0);
    payrollMap[s.coach_id].records.push(s);
  }

  for (const coachId in salaryMap) {
    const sConf = salaryMap[coachId];
    if (sConf.base_salary > 0 && !payrollMap[coachId] && coachMap[coachId]) {
      payrollMap[coachId] = {
        coachId,
        coachName: coachMap[coachId].name || 'Không rõ',
        coachEmail: coachMap[coachId].email || '',
        baseSalary: sConf.base_salary,
        totalSessions: 0,
        sessionEarnings: 0,
        records: []
      };
    }
  }

  return Object.values(payrollMap).map(p => ({
    ...p,
    totalEarnings: p.baseSalary + p.sessionEarnings
  }));
}

export async function paySalaryTransaction(coachId, coachName, month, amount) {
  await addFinanceTransaction({
    type: 'expense',
    amount: amount,
    category: 'Lương HLV',
    date: new Date().toISOString().split('T')[0],
    description: `Thanh toán lương tháng ${month} cho HLV ${coachName}`,
    coachId: coachId,
    month: month
  });

  const { data: sessions } = await supabase.from('teacher_salary_sessions').select('id, date').eq('status', 'approved').eq('coach_id', coachId);
  if (sessions) {
    for (const docSnap of sessions) {
      if (docSnap.date && docSnap.date.startsWith(month)) {
        await supabase.from('teacher_salary_sessions').update({
          status: 'paid',
          paid_at: new Date().toISOString()
        }).eq('id', docSnap.id);
      }
    }
  }
}

// ==========================================
// PHASE 5 SCHEMA (LIBRARY & LECTURES)
// ==========================================

export async function getLibraryItems() {
  const { data } = await supabase.from('library_items').select('*');
  return data || [];
}
export async function addLibraryItem(data) {
  const { data: newDoc } = await supabase.from('library_items').insert([data]).select('id').single();
  return newDoc.id;
}

export async function getLectureCourses() {
  const { data } = await supabase.from('lecture_courses').select('*');
  return data || [];
}
export async function addLectureCourse(data) {
  const { data: newDoc } = await supabase.from('lecture_courses').insert([data]).select('id').single();
  return newDoc.id;
}

export async function getLectureLessons(courseId) {
  const { data } = await supabase.from('lecture_lessons').select('*').eq('course_id', courseId);
  return data || [];
}
export async function addLectureLesson(data) {
  const { data: newDoc } = await supabase.from('lecture_lessons').insert([{ ...data, course_id: data.courseId }]).select('id').single();
  return newDoc.id;
}

export async function getClassLectureCourses(classId) {
  const { data } = await supabase.from('class_lecture_courses').select('*').eq('class_id', classId);
  return data || [];
}
export async function addClassLectureCourse(data) {
  const { data: newDoc } = await supabase.from('class_lecture_courses').insert([{ ...data, class_id: data.classId }]).select('id').single();
  return newDoc.id;
}

export async function getClassLectureLessons(classId) {
  const { data } = await supabase.from('class_lecture_lessons').select('*').eq('class_id', classId);
  return data || [];
}
export async function addClassLectureLesson(data) {
  const { data: newDoc } = await supabase.from('class_lecture_lessons').insert([{ ...data, class_id: data.classId }]).select('id').single();
  return newDoc.id;
}
