'use client';

import { useState, useEffect } from 'react';
import { saveAttendanceAction } from './actions';

export default function AttendanceClient({ classes, allStudentAttendance }: any) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedClass = classes.find((c: any) => c.id === selectedClassId);

  useEffect(() => {
    if (!selectedClassId) {
      setAttendanceRecords([]);
      return;
    }
    
    // Check if we have existing attendance for this date and class
    const existingLog = allStudentAttendance.find((a: any) => a.class_id === selectedClassId && a.date === selectedDate);
    
    if (existingLog && existingLog.records) {
      setAttendanceRecords(existingLog.records);
    } else {
      // Default to all present
      if (selectedClass && selectedClass.class_students) {
        const defaultRecords = selectedClass.class_students.map((cs: any) => ({
          student_id: cs.student_id,
          status: 'present', // present, absent, excused
          note: ''
        }));
        setAttendanceRecords(defaultRecords);
      }
    }
  }, [selectedClassId, selectedDate, allStudentAttendance, selectedClass]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, status } : r));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, note } : r));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!selectedClassId || !selectedDate) return;
    
    const res = await saveAttendanceAction(selectedClassId, selectedDate, attendanceRecords);
    if (res.success) {
      setSuccess('Đã lưu điểm danh!');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(res.error || 'Lỗi khi lưu điểm danh');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Ngày</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Lớp học</label>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
            <option value="">-- Chọn lớp --</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} ({c.start_time}-{c.end_time})</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '16px' }}>{success}</div>}

      {selectedClassId ? (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f3f4f6' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Học viên</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {selectedClass?.class_students?.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Lớp chưa có học viên.</td>
                </tr>
              ) : (
                selectedClass?.class_students?.map((cs: any) => {
                  const record = attendanceRecords.find(r => r.student_id === cs.student_id);
                  if (!record) return null;
                  
                  return (
                    <tr key={cs.student_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{cs.students?.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <select 
                          value={record.status} 
                          onChange={(e) => handleStatusChange(cs.student_id, e.target.value)}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                        >
                          <option value="present">Có mặt</option>
                          <option value="absent">Vắng</option>
                          <option value="excused">Có phép</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input 
                          type="text" 
                          placeholder="Ghi chú..." 
                          value={record.note} 
                          onChange={(e) => handleNoteChange(cs.student_id, e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div style={{ padding: '16px', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb' }}>
            <button onClick={handleSave} disabled={selectedClass?.class_students?.length === 0} style={{ padding: '8px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Lưu Điểm Danh
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
          Vui lòng chọn ngày và lớp học để điểm danh.
        </div>
      )}
    </div>
  );
}
