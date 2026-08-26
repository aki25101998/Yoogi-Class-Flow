'use client';

import { useState } from 'react';
import { addStudentAction, updateStudentAction, deleteStudentAction, enrollStudentAction, unenrollStudentAction } from './actions';

export default function StudentsClient({ initialStudents, availableClasses, currentUserRole }: any) {
  const [students, setStudents] = useState(initialStudents);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', status: 'active' });
  
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<string | null>(null);
  const [classId, setClassId] = useState('');
  const [error, setError] = useState('');

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', status: 'active' });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (editingId) {
      const res = await updateStudentAction(editingId, formData);
      if (res.success) window.location.reload();
      else setError(res.error || 'Lỗi khi cập nhật học viên');
    } else {
      const res = await addStudentAction(formData);
      if (res.success) window.location.reload();
      else setError(res.error || 'Lỗi khi thêm học viên');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa học viên này?')) {
      const res = await deleteStudentAction(id);
      if (res.success) window.location.reload();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  const handleEnroll = async (studentId: string, e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await enrollStudentAction(studentId, classId);
    if (res.success) {
      setSelectedStudentForEnroll(null);
      setClassId('');
      window.location.reload();
    } else {
      setError(res.error || 'Lỗi khi xếp lớp');
    }
  };

  const handleUnenroll = async (studentId: string, classId: string) => {
    if (confirm('Bạn có chắc muốn gỡ học viên khỏi lớp này?')) {
      const res = await unenrollStudentAction(studentId, classId);
      if (res.success) window.location.reload();
      else alert(res.error || 'Lỗi khi gỡ khỏi lớp');
    }
  };

  return (
    <div>
      {isAdminOrOwner && !isAdding && !editingId && (
        <button 
          onClick={() => setIsAdding(true)}
          style={{ marginBottom: '24px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Thêm Học Viên
        </button>
      )}

      {(isAdding || editingId) && (
        <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            {editingId ? 'Sửa thông tin học viên' : 'Thêm học viên mới'}
          </h3>
          {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Tên học viên *</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Số điện thoại</label>
              <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Tên phụ huynh</label>
              <input value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>SĐT phụ huynh</label>
              <input value={formData.parent_phone} onChange={e => setFormData({...formData, parent_phone: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Ngày sinh (YYYY-MM-DD)</label>
              <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Trạng thái</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <option value="active">Đang học</option>
                <option value="inactive">Đã nghỉ</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lưu</button>
              <button type="button" onClick={resetForm} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div>
        {students.map((student: any) => (
          <div key={student.id} style={{ marginBottom: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{student.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>SĐT: {student.phone || 'N/A'} | Phụ huynh: {student.parent_name || 'N/A'} ({student.parent_phone || 'N/A'})</p>
                <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', backgroundColor: student.status === 'active' ? '#dcfce7' : '#f3f4f6', color: student.status === 'active' ? '#166534' : '#4b5563' }}>
                  {student.status === 'active' ? 'Đang học' : 'Đã nghỉ'}
                </span>
              </div>
              {isAdminOrOwner && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => { setEditingId(student.id); setFormData(student); setIsAdding(false); }}
                    style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Sửa
                  </button>
                  <button 
                    onClick={() => handleDelete(student.id)}
                    style={{ padding: '6px 12px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Xóa
                  </button>
                  <button 
                    onClick={() => setSelectedStudentForEnroll(student.id)}
                    style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    + Xếp Lớp
                  </button>
                </div>
              )}
            </div>

            {selectedStudentForEnroll === student.id && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Xếp vào lớp mới</h4>
                <form onSubmit={(e) => handleEnroll(student.id, e)} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Chọn lớp</label>
                    <select value={classId} onChange={e => setClassId(e.target.value)} required style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                      <option value="">-- Chọn --</option>
                      {availableClasses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.start_time}-{c.end_time})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lưu</button>
                    <button type="button" onClick={() => setSelectedStudentForEnroll(null)} style={{ padding: '6px 12px', marginLeft: '4px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                  </div>
                </form>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563', marginBottom: '8px' }}>Các lớp đang học</h4>
              {(!student.class_students || student.class_students.length === 0) ? (
                <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>Chưa được xếp vào lớp nào.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {student.class_students.map((enrollment: any) => (
                    <li key={enrollment.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div>
                        <span style={{ fontWeight: '500' }}>{enrollment.venue_classes?.name}</span>
                        <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '8px' }}>— {enrollment.venue_classes?.start_time} - {enrollment.venue_classes?.end_time}</span>
                      </div>
                      {isAdminOrOwner && (
                        <button 
                          onClick={() => handleUnenroll(student.id, enrollment.class_id)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                        >
                          Gỡ khỏi lớp
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {students.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#6b7280' }}>Chưa có học viên nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
