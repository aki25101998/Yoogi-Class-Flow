// Firestore Database Layer — All CRUD operations
import { getDb } from './auth.js';

const { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, setDoc } = window.firebase;

// ============ COACHES ============

/**
 * Get all active coaches
 * @returns {Promise<Array>}
 */
export async function getCoaches() {
  const db = getDb();
  const q = query(collection(db, 'coaches'), where('status', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get all coaches (including inactive)
 * @returns {Promise<Array>}
 */
export async function getAllCoaches() {
  const db = getDb();
  const snap = await getDocs(collection(db, 'coaches'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single coach by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getCoach(id) {
  const db = getDb();
  const d = await getDoc(doc(db, 'coaches', id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

/**
 * Add a new coach (document ID will be auto-generated, NOT tied to auth UID until they log in)
 * We store the email so when they log in with Google, we can look them up
 * @param {object} data
 * @returns {Promise<string>} - the new document ID
 */
export async function addCoach(data) {
  const db = getDb();
  const coachData = {
    name: data.name,
    email: data.email.toLowerCase().trim(),
    phone: data.phone || '',
    role: data.role || 'coach',
    status: 'active',
    photoURL: '',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  const ref = await addDoc(collection(db, 'coaches'), coachData);
  return ref.id;
}

/**
 * Update a coach
 * @param {string} id
 * @param {object} data
 */
export async function updateCoach(id, data) {
  const db = getDb();
  await updateDoc(doc(db, 'coaches', id), {
    ...data,
    updatedAt: Timestamp.now()
  });
}

/**
 * Soft delete a coach (set status to inactive)
 * @param {string} id
 */
export async function deleteCoach(id) {
  await updateCoach(id, { status: 'inactive' });
}

/**
 * Find coach by email
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findCoachByEmail(email) {
  const db = getDb();
  const q = query(collection(db, 'coaches'), where('email', '==', email.toLowerCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// ============ VENUES ============

/**
 * Get all active venues
 * @returns {Promise<Array>}
 */
export async function getVenues() {
  const db = getDb();
  const q = query(collection(db, 'venues'), where('status', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single venue
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getVenue(id) {
  const db = getDb();
  const d = await getDoc(doc(db, 'venues', id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

/**
 * Add a new venue
 * @param {object} data
 * @returns {Promise<string>}
 */
export async function addVenue(data) {
  const db = getDb();
  const venueData = {
    name: data.name,
    address: data.address || '',
    status: 'active',
    createdAt: Timestamp.now()
  };
  const ref = await addDoc(collection(db, 'venues'), venueData);
  return ref.id;
}

/**
 * Update a venue
 * @param {string} id
 * @param {object} data
 */
export async function updateVenue(id, data) {
  const db = getDb();
  await updateDoc(doc(db, 'venues', id), data);
}

/**
 * Soft delete a venue
 * @param {string} id
 */
export async function deleteVenue(id) {
  await updateVenue(id, { status: 'inactive' });
}

// ============ VENUE COACHES (sub-collection) ============

/**
 * Get all coaches assigned to a venue
 * @param {string} venueId
 * @returns {Promise<Array>}
 */
export async function getVenueCoaches(venueId) {
  const db = getDb();
  const q = query(collection(db, 'venues', venueId, 'venueCoaches'), where('status', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, venueId, ...d.data() }));
}

/**
 * Get all venueCoach entries (across all venues)
 * @returns {Promise<Array>}
 */
export async function getAllVenueCoaches() {
  const db = getDb();
  const venues = await getVenues();
  const allEntries = [];
  for (const venue of venues) {
    const entries = await getVenueCoaches(venue.id);
    allEntries.push(...entries);
  }
  return allEntries;
}

/**
 * Get all venues a coach is assigned to
 * @param {string} coachId
 * @returns {Promise<Array>} - array of { venueId, venue, venueCoach } objects
 */
export async function getVenuesForCoach(coachId) {
  const venues = await getVenues();
  const results = [];
  for (const venue of venues) {
    const entries = await getVenueCoaches(venue.id);
    const match = entries.find(e => e.coachId === coachId);
    if (match) {
      results.push({ venueId: venue.id, venue, venueCoach: match });
    }
  }
  return results;
}

/**
 * Get a specific venueCoach entry by coachId within a venue
 * @param {string} venueId
 * @param {string} coachId
 * @returns {Promise<object|null>}
 */
export async function getVenueCoachByCoachId(venueId, coachId) {
  const entries = await getVenueCoaches(venueId);
  return entries.find(e => e.coachId === coachId) || null;
}

/**
 * Add a coach to a venue with salary and schedule
 * @param {string} venueId
 * @param {object} data - { coachId, rateType, rate, scheduleDays, startTime, endTime }
 * @returns {Promise<string>}
 */
export async function addVenueCoach(venueId, data) {
  const db = getDb();
  const vcData = {
    coachId: data.coachId,
    rateType: data.rateType || 'per_session',
    rate: Number(data.rate) || 0,
    scheduleDays: data.scheduleDays || [],
    startTime: data.startTime || '18:00',
    endTime: data.endTime || '20:00',
    status: 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  const ref = await addDoc(collection(db, 'venues', venueId, 'venueCoaches'), vcData);
  return ref.id;
}

/**
 * Update a venueCoach entry
 * @param {string} venueId
 * @param {string} venueCoachId
 * @param {object} data
 */
export async function updateVenueCoach(venueId, venueCoachId, data) {
  const db = getDb();
  await updateDoc(doc(db, 'venues', venueId, 'venueCoaches', venueCoachId), {
    ...data,
    updatedAt: Timestamp.now()
  });
}

/**
 * Remove a coach from a venue (soft delete)
 * @param {string} venueId
 * @param {string} venueCoachId
 */
export async function removeVenueCoach(venueId, venueCoachId) {
  await updateVenueCoach(venueId, venueCoachId, { status: 'inactive' });
}

/**
 * Get schedules derived from venueCoaches (replacement for old schedules collection)
 * Returns schedule-like objects compatible with existing UI
 * @param {object} filters - optional { coachId, venueId, dayOfWeek }
 * @returns {Promise<Array>}
 */
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

  // Expand scheduleDays into individual schedule-like entries
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

/**
 * Get schedules for a specific coach (from venueCoaches)
 * @param {string} coachId
 * @returns {Promise<Array>}
 */
export async function getSchedulesByCoachVC(coachId) {
  return getSchedulesFromVenueCoaches({ coachId });
}

// ============ SCHEDULES (legacy) ============

/**
 * Get all active schedules
 * @param {object} filters - optional { coachId, venueId, dayOfWeek }
 * @returns {Promise<Array>}
 */
export async function getSchedules(filters = {}) {
  const db = getDb();
  let q = query(collection(db, 'schedules'), where('status', '==', 'active'));
  const snap = await getDocs(q);
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Client-side filtering (Firestore limits compound queries)
  if (filters.coachId) results = results.filter(s => s.coachId === filters.coachId);
  if (filters.venueId) results = results.filter(s => s.venueId === filters.venueId);
  if (filters.dayOfWeek) results = results.filter(s => s.dayOfWeek === filters.dayOfWeek);
  
  return results;
}

/**
 * Get schedules for a specific coach
 * @param {string} coachId
 * @returns {Promise<Array>}
 */
export async function getSchedulesByCoach(coachId) {
  return getSchedules({ coachId });
}

/**
 * Get schedules for a specific day of week
 * @param {number} dayOfWeek - 1-7
 * @returns {Promise<Array>}
 */
export async function getSchedulesByDay(dayOfWeek) {
  return getSchedules({ dayOfWeek });
}

/**
 * Add a new schedule
 * @param {object} data
 * @returns {Promise<string>}
 */
export async function addSchedule(data) {
  const db = getDb();
  const scheduleData = {
    coachId: data.coachId,
    venueId: data.venueId,
    dayOfWeek: Number(data.dayOfWeek),
    startTime: data.startTime,
    endTime: data.endTime,
    rateType: data.rateType || 'per_session',
    rate: Number(data.rate) || 0,
    status: 'active',
    createdAt: Timestamp.now()
  };
  const ref = await addDoc(collection(db, 'schedules'), scheduleData);
  return ref.id;
}

/**
 * Update a schedule
 * @param {string} id
 * @param {object} data
 */
export async function updateSchedule(id, data) {
  const db = getDb();
  const updateData = { ...data };
  if (updateData.dayOfWeek) updateData.dayOfWeek = Number(updateData.dayOfWeek);
  if (updateData.rate) updateData.rate = Number(updateData.rate);
  await updateDoc(doc(db, 'schedules', id), updateData);
}

/**
 * Delete a schedule
 * @param {string} id
 */
export async function deleteSchedule(id) {
  await updateSchedule(id, { status: 'inactive' });
}

// ============ ATTENDANCE ============

/**
 * Get attendance records for a specific date
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Promise<Array>}
 */
export async function getAttendanceByDate(date) {
  const db = getDb();
  const q = query(collection(db, 'attendance'), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get attendance for a coach in a specific month
 * @param {string} coachId
 * @param {string} yearMonth - "YYYY-MM"
 * @returns {Promise<Array>}
 */
export async function getAttendanceByCoachMonth(coachId, yearMonth) {
  const db = getDb();
  const startDate = `${yearMonth}-01`;
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  
  const q = query(
    collection(db, 'attendance'),
    where('coachId', '==', coachId),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get all attendance for a month
 * @param {string} yearMonth - "YYYY-MM"
 * @returns {Promise<Array>}
 */
export async function getAttendanceByMonth(yearMonth) {
  const db = getDb();
  const startDate = `${yearMonth}-01`;
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  
  const q = query(
    collection(db, 'attendance'),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Create a check-in record
 * @param {object} data
 * @returns {Promise<string>}
 */
export async function checkIn({ coachId, scheduleId, venueId, venueCoachId, date, checkInBy, note = '', isSubstitution = false, originalCoachId = '' }) {
  const db = getDb();
  const record = {
    coachId,
    scheduleId: scheduleId || '',
    venueCoachId: venueCoachId || '',
    venueId,
    date,
    checkInTime: Timestamp.now(),
    checkInBy: checkInBy || coachId,
    status: 'checked_in',
    approvedBy: '',
    approvedAt: null,
    earnings: 0,
    note: note || '',
    isSubstitution: isSubstitution || false,
    originalCoachId: originalCoachId || '',
    createdAt: Timestamp.now()
  };
  
  // If admin checks in, auto-approve
  if (checkInBy && checkInBy !== coachId) {
    record.status = 'approved';
    record.approvedBy = checkInBy;
    record.approvedAt = Timestamp.now();
  }
  
  const ref = await addDoc(collection(db, 'attendance'), record);
  
  // If auto-approved, calculate earnings from venueCoach or legacy schedule
  if (record.status === 'approved') {
    let earnings = 0;
    if (venueCoachId && venueId) {
      try {
        const vcDoc = await getDoc(doc(db, 'venues', venueId, 'venueCoaches', venueCoachId));
        if (vcDoc.exists()) {
          earnings = calculateEarnings(vcDoc.data());
        }
      } catch (e) { /* fallback below */ }
    }
    if (!earnings && scheduleId) {
      const schedule = await getSchedule(scheduleId);
      if (schedule) {
        earnings = calculateEarnings(schedule);
      }
    }
    if (earnings) {
      await updateDoc(doc(db, 'attendance', ref.id), { earnings });
    }
  }
  
  return ref.id;
}

/**
 * Get a single schedule
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getSchedule(id) {
  const db = getDb();
  const d = await getDoc(doc(db, 'schedules', id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

/**
 * Calculate earnings from a schedule
 * @param {object} schedule
 * @returns {number}
 */
function calculateEarnings(schedule) {
  if (schedule.rateType === 'per_hour') {
    const [sh, sm] = (schedule.startTime || '0:0').split(':').map(Number);
    const [eh, em] = (schedule.endTime || '0:0').split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    return Math.round(schedule.rate * hours);
  }
  return schedule.rate || 0;
}

/**
 * Approve an attendance record
 * @param {string} attendanceId
 * @param {string} adminId
 */
export async function approveAttendance(attendanceId, adminId) {
  const db = getDb();
  const attDoc = await getDoc(doc(db, 'attendance', attendanceId));
  if (!attDoc.exists()) throw new Error('Record not found');
  
  const att = attDoc.data();
  let earnings = 0;
  
  // Try venueCoach first (new model)
  if (att.venueCoachId && att.venueId) {
    try {
      const vcDoc = await getDoc(doc(db, 'venues', att.venueId, 'venueCoaches', att.venueCoachId));
      if (vcDoc.exists()) {
        earnings = calculateEarnings(vcDoc.data());
      }
    } catch (e) { /* fallback to legacy */ }
  }
  
  // Fallback to legacy schedule
  if (!earnings && att.scheduleId) {
    const schedule = await getSchedule(att.scheduleId);
    if (schedule) {
      earnings = calculateEarnings(schedule);
    }
  }
  
  await updateDoc(doc(db, 'attendance', attendanceId), {
    status: 'approved',
    approvedBy: adminId,
    approvedAt: Timestamp.now(),
    earnings
  });
}

/**
 * Reject an attendance record
 * @param {string} attendanceId
 * @param {string} adminId
 * @param {string} reason
 */
export async function rejectAttendance(attendanceId, adminId, reason = '') {
  const db = getDb();
  await updateDoc(doc(db, 'attendance', attendanceId), {
    status: 'rejected',
    approvedBy: adminId,
    approvedAt: Timestamp.now(),
    note: reason
  });
}

/**
 * Update an attendance record
 * @param {string} id
 * @param {object} data
 */
export async function updateAttendance(id, data) {
  const db = getDb();
  await updateDoc(doc(db, 'attendance', id), data);
}

/**
 * Delete an attendance record
 * @param {string} id
 */
export async function deleteAttendanceRecord(id) {
  const db = getDb();
  await deleteDoc(doc(db, 'attendance', id));
}

// ============ PAYROLL (computed) ============

/**
 * Calculate monthly payroll for all coaches
 * @param {string} yearMonth - "YYYY-MM"
 * @returns {Promise<Array>} [{coachId, coachName, totalSessions, totalHours, totalEarnings}]
 */
export async function calculateMonthlyPayroll(yearMonth) {
  const [attendance, coaches] = await Promise.all([
    getAttendanceByMonth(yearMonth),
    getAllCoaches()
  ]);
  
  const coachMap = {};
  coaches.forEach(c => { coachMap[c.id] = c; });
  
  const payroll = {};
  
  attendance
    .filter(a => a.status === 'approved')
    .forEach(a => {
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

/**
 * Calculate payroll for a single coach in a month
 * @param {string} coachId
 * @param {string} yearMonth
 * @returns {Promise<object>}
 */
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
