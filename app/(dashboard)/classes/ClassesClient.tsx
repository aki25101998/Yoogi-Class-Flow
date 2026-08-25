'use client';

import { useState } from 'react';
import { assignCoachAction, removeCoachAction } from './actions';

export default function ClassesClient({ initialClasses, availableCoaches, currentUserRole }: any) {
  const [classes, setClasses] = useState(initialClasses);
  const [selectedClassForAssign, setSelectedClassForAssign] = useState<string | null>(null);
  const [coachId, setCoachId] = useState('');
  const [role, setRole] = useState<'HEAD_COACH' | 'ASSISTANT_COACH'>('ASSISTANT_COACH');
  const [error, setError] = useState('');

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleAssign = async (classId: string, e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await assignCoachAction(classId, coachId, role);
    if (res.success) {
      setSelectedClassForAssign(null);
      setCoachId('');
      window.location.reload(); // simple reload for now
    } else {
      setError(res.error || 'Lỗi khi phân công');
    }
  };

  const handleRemove = async (classId: string, coachId: string) => {
    if (confirm('Bạn có chắc muốn gỡ HLV này khỏi lớp?')) {
      const res = await removeCoachAction(classId, coachId);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error || 'Lỗi khi gỡ');
      }
    }
  };

  return (
    <div>
      {classes.map((cls: any) => (
        <div key={cls.id} style={{ marginBottom: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{cls.name || 'Lớp chưa đặt tên'}</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>{cls.start_time} - {cls.end_time}</p>
            </div>
            {isAdminOrOwner && (
              <button 
                onClick={() => setSelectedClassForAssign(cls.id)}
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Thêm HLV
              </button>
            )}
          </div>

          {selectedClassForAssign === cls.id && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Phân công HLV mới</h4>
              {error && <div style={{ color: 'red', marginBottom: '8px', fontSize: '14px' }}>{error}</div>}
              <form onSubmit={(e) => handleAssign(cls.id, e)} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Chọn HLV</label>
                  <select value={coachId} onChange={e => setCoachId(e.target.value)} required style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                    <option value="">-- Chọn --</option>
                    {availableCoaches.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Vai trò</label>
                  <select value={role} onChange={e => setRole(e.target.value as any)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                    <option value="ASSISTANT_COACH">Assistant Coach</option>
                    <option value="HEAD_COACH">Head Coach</option>
                  </select>
                </div>
                <div>
                  <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lưu</button>
                  <button type="button" onClick={() => setSelectedClassForAssign(null)} style={{ padding: '6px 12px', marginLeft: '4px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                </div>
              </form>
            </div>
          )}

          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563', marginBottom: '8px' }}>HLV phụ trách</h4>
            {(!cls.class_coaches || cls.class_coaches.length === 0) ? (
              <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>Chưa có HLV nào được phân công.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {cls.class_coaches.map((assignment: any) => (
                  <li key={assignment.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <span style={{ fontWeight: '500' }}>{assignment.coaches?.name}</span>
                      <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '8px' }}>— {assignment.role}</span>
                    </div>
                    {isAdminOrOwner && (
                      <button 
                        onClick={() => handleRemove(cls.id, assignment.coach_id)}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                      >
                        Gỡ
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
      {classes.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280' }}>Chưa có lớp học nào trong tổ chức.</p>
        </div>
      )}
    </div>
  );
}
