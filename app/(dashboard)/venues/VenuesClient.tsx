'use client';

import { useState } from 'react';
import { addVenueAction, updateVenueAction, deleteVenueAction } from './actions';

export default function VenuesClient({ initialVenues, currentUserRole }: any) {
  const [venues, setVenues] = useState(initialVenues);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', status: 'active' });
  const [error, setError] = useState('');

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ name: '', address: '', status: 'active' });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (editingId) {
      const res = await updateVenueAction(editingId, formData);
      if (res.success) window.location.reload();
      else setError(res.error || 'Lỗi khi cập nhật địa điểm');
    } else {
      const res = await addVenueAction(formData);
      if (res.success) window.location.reload();
      else setError(res.error || 'Lỗi khi thêm địa điểm');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa địa điểm này?')) {
      const res = await deleteVenueAction(id);
      if (res.success) window.location.reload();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  return (
    <div>
      {isAdminOrOwner && !isAdding && !editingId && (
        <button 
          onClick={() => setIsAdding(true)}
          style={{ marginBottom: '24px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Thêm Địa Điểm
        </button>
      )}

      {(isAdding || editingId) && (
        <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            {editingId ? 'Sửa thông tin địa điểm' : 'Thêm địa điểm mới'}
          </h3>
          {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Tên địa điểm *</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Địa chỉ</label>
              <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Trạng thái</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <option value="active">Hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
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
        {venues.map((venue: any) => (
          <div key={venue.id} style={{ marginBottom: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{venue.name}</h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Địa chỉ: {venue.address || 'Chưa cập nhật'}</p>
              <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', backgroundColor: venue.status === 'active' ? '#dcfce7' : '#f3f4f6', color: venue.status === 'active' ? '#166534' : '#4b5563' }}>
                {venue.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
              </span>
            </div>
            {isAdminOrOwner && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => { setEditingId(venue.id); setFormData(venue); setIsAdding(false); }}
                  style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Sửa
                </button>
                <button 
                  onClick={() => handleDelete(venue.id)}
                  style={{ padding: '6px 12px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        ))}
        {venues.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ color: '#6b7280' }}>Chưa có địa điểm nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
