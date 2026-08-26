'use client';

import { useState } from 'react';
import { addTransactionAction, deleteTransactionAction } from './actions';

export default function FinanceClient({ transactions, currentUserRole }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ type: 'income', category: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
  const [error, setError] = useState('');

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const resetForm = () => {
    setFormData({ type: 'income', category: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
    setIsAdding(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await addTransactionAction(formData);
    if (res.success) window.location.reload();
    else setError(res.error || 'Lỗi khi thêm giao dịch');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa giao dịch này? Hành động này không thể hoàn tác.')) {
      const res = await deleteTransactionAction(id);
      if (res.success) window.location.reload();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Tổng thu</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{totalIncome.toLocaleString('vi-VN')} đ</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Tổng chi</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{totalExpense.toLocaleString('vi-VN')} đ</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>Số dư (Lợi nhuận)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: balance >= 0 ? '#2563eb' : '#ef4444' }}>{balance.toLocaleString('vi-VN')} đ</div>
        </div>
      </div>

      {isAdminOrOwner && !isAdding && (
        <button 
          onClick={() => setIsAdding(true)}
          style={{ marginBottom: '24px', padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Thêm Giao Dịch
        </button>
      )}

      {isAdding && (
        <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Thêm giao dịch mới</h3>
          {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Loại giao dịch *</label>
              <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                <option value="income">Thu</option>
                <option value="expense">Chi</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Danh mục *</label>
              <input required placeholder="VD: Học phí, Tiền thuê mặt bằng, Tiền điện..." value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Số tiền (VNĐ) *</label>
              <input type="number" required min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Ngày</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Mô tả thêm</label>
              <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Lưu</button>
              <button type="button" onClick={resetForm} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Ngày</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Danh mục</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Mô tả</th>
              <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Số tiền</th>
              {isAdminOrOwner && <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Chưa có giao dịch nào.</td>
              </tr>
            ) : (
              transactions.map((t: any) => {
                const isIncome = t.type === 'income';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px' }}>{t.date}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                      <span style={{ 
                        display: 'inline-block', marginRight: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
                        backgroundColor: isIncome ? '#dcfce7' : '#fee2e2', color: isIncome ? '#166534' : '#991b1b'
                      }}>
                        {isIncome ? 'THU' : 'CHI'}
                      </span>
                      {t.category}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{t.description}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: isIncome ? '#16a34a' : '#ef4444' }}>
                      {isIncome ? '+' : '-'}{Number(t.amount).toLocaleString('vi-VN')} đ
                    </td>
                    {isAdminOrOwner && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
