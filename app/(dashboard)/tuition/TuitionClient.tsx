'use client';

import { useState } from 'react';
import { addTuitionAction, deleteTuitionAction, recordPaymentAction } from './actions';

export default function TuitionClient({ tuitionList, students, classes, currentUserRole }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', class_id: '', amount: 0, due_date: '' });
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [error, setError] = useState('');

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ student_id: '', class_id: '', amount: 0, due_date: '' });
    setIsAdding(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await addTuitionAction(formData);
    if (res.success) window.location.reload();
    else setError(res.error || 'Lỗi khi thêm khoản thu');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa khoản thu này?')) {
      const res = await deleteTuitionAction(id);
      if (res.success) window.location.reload();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!paymentId) return;
    const res = await recordPaymentAction(paymentId, paymentAmount);
    if (res.success) {
      setPaymentId(null);
      setPaymentAmount(0);
      window.location.reload();
    } else {
      setError(res.error || 'Lỗi khi ghi nhận thanh toán');
    }
  };

  return (
    <div>
      {isAdminOrOwner && !isAdding && (
        <button 
          onClick={() => setIsAdding(true)}
          style={{ marginBottom: '24px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Thêm Khoản Thu Học Phí
        </button>
      )}

      {isAdding && (
        <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Thêm khoản thu mới</h3>
          {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Học viên *</label>
              <select required value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <option value="">-- Chọn học viên --</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Lớp học (Tùy chọn)</label>
              <select value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <option value="">-- Chọn lớp --</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Số tiền (VNĐ) *</label>
              <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Kỳ hạn (YYYY-MM)</label>
              <input type="month" required value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lưu</button>
              <button type="button" onClick={resetForm} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      {paymentId && (
        <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#166534' }}>Ghi nhận thanh toán</h3>
          <form onSubmit={handlePayment} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Số tiền thanh toán (VNĐ)</label>
              <input type="number" required min="1" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xác nhận</button>
              <button type="button" onClick={() => { setPaymentId(null); setPaymentAmount(0); }} style={{ padding: '8px 16px', marginLeft: '8px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Học viên</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Lớp / Kỳ hạn</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Số tiền</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Đã đóng / Còn nợ</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
              {isAdminOrOwner && <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {tuitionList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Chưa có khoản thu nào.</td>
              </tr>
            ) : (
              tuitionList.map((t: any) => {
                const amount = Number(t.amount) || 0;
                const paid = Number(t.paid_amount) || 0;
                const remaining = amount - paid;
                
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{t.students?.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{t.venue_classes?.name || 'Tất cả lớp'}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{t.due_date}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{amount.toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#16a34a' }}>Đã đóng: {paid.toLocaleString('vi-VN')} đ</div>
                      {remaining > 0 && <div style={{ color: '#ef4444' }}>Còn nợ: {remaining.toLocaleString('vi-VN')} đ</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px',
                        backgroundColor: t.status === 'paid' ? '#dcfce7' : (t.status === 'partial' ? '#fef08a' : '#fee2e2'),
                        color: t.status === 'paid' ? '#166534' : (t.status === 'partial' ? '#854d0e' : '#991b1b')
                      }}>
                        {t.status === 'paid' ? 'Đã thu đủ' : (t.status === 'partial' ? 'Thu một phần' : 'Chưa thu')}
                      </span>
                    </td>
                    {isAdminOrOwner && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {t.status !== 'paid' && (
                          <button 
                            onClick={() => { setPaymentId(t.id); setPaymentAmount(remaining); }}
                            style={{ padding: '4px 8px', marginRight: '8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Thanh toán
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(t.id)}
                          style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Xóa
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
