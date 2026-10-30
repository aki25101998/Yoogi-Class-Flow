'use client';

import { useState } from 'react';
import { getBeltsAction, addBeltsAction, updateBeltAction, deleteBeltAction } from './actions';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { SettingsNavTabs } from '../components/SettingsNavTabs';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Badge } from '@/app/components/ui/Badge';
import { EmptyState } from '@/app/components/ui/EmptyState';

// Helper nhận diện màu sắc đai võ thuật trực quan
function getBeltStyle(beltName: string) {
  const lower = (beltName || '').toLowerCase();
  if (lower.includes('trắng')) {
    return { bg: '#ffffff', border: '#cbd5e1', text: '#334155', stripe: '#94a3b8' };
  }
  if (lower.includes('vàng')) {
    return { bg: '#fef08a', border: '#eab308', text: '#854d0e', stripe: '#ca8a04' };
  }
  if (lower.includes('cam')) {
    return { bg: '#fed7aa', border: '#f97316', text: '#9a3412', stripe: '#ea580c' };
  }
  if (lower.includes('xanh lá') || lower.includes('lục')) {
    return { bg: '#bbf7d0', border: '#22c55e', text: '#166534', stripe: '#16a34a' };
  }
  if (lower.includes('xanh lam') || lower.includes('xanh dương') || lower.includes('lam')) {
    return { bg: '#bfdbfe', border: '#3b82f6', text: '#1e40af', stripe: '#2563eb' };
  }
  if (lower.includes('đỏ')) {
    return { bg: '#fecaca', border: '#ef4444', text: '#991b1b', stripe: '#dc2626' };
  }
  if (lower.includes('nâu')) {
    return { bg: '#d7ccc8', border: '#8d6e63', text: '#3e2723', stripe: '#6d4c41' };
  }
  if (lower.includes('đen')) {
    return { bg: '#0f172a', border: '#020617', text: '#f8fafc', stripe: '#ef4444' };
  }
  // Mặc định Teal Athletic
  return { bg: 'var(--surface-hover)', border: 'var(--border-light)', text: 'var(--text-main)', stripe: 'var(--primary)' };
}

export default function BeltsClient({ initialBelts = [] }: { initialBelts?: any[] }) {
  const [belts, setBelts] = useState<any[]>(initialBelts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State for Bulk Add
  const [beltNames, setBeltNames] = useState<string[]>(['']);
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // State for Single Edit
  const [editFormData, setEditFormData] = useState({ name: '', display_order: 1, is_active: true });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Row level delete loading state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBelts = async () => {
    setIsRefreshing(true);
    const res = await getBeltsAction();
    if (res.success && res.data) {
      setBelts(res.data);
    }
    setIsRefreshing(false);
  };

  const resetForm = () => {
    setBeltNames(['']);
    setIsActive(true);
    setEditFormData({ name: '', display_order: 1, is_active: true });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleOpenAdd = () => {
    setBeltNames(['']);
    setIsActive(true);
    setIsAdding(true);
  };

  const handleEdit = (belt: any) => {
    setEditingId(belt.id);
    setEditFormData({ 
      name: belt.name, 
      display_order: belt.display_order, 
      is_active: belt.is_active 
    });
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!editingId) {
      const validNames = beltNames.map(n => n.trim()).filter(n => n.length > 0);
      if (validNames.length === 0) {
        setError('Vui lòng nhập ít nhất một tên cấp đai hợp lệ.');
        return;
      }
      const uniqueNames = new Set(validNames);
      if (uniqueNames.size !== validNames.length) {
        setError(`Tên cấp đai bị trùng trong danh sách.`);
        return;
      }
    }
    
    setLoading(true);
    
    try {
      if (editingId) {
        const res = await updateBeltAction(editingId, editFormData);
        if (res.success) {
          await fetchBelts();
          resetForm();
        } else {
          setError(res.error || 'Lỗi khi lưu cấp đai');
        }
      } else {
        const res = await addBeltsAction({ names: beltNames, is_active: isActive });
        if (res.success && res.data) {
          setBelts(prev => {
            const newBelts = [...prev, ...res.data];
            return newBelts.sort((a, b) => a.display_order - b.display_order);
          });
          resetForm();
        } else {
          setError(res.error || 'Lỗi khi thêm cấp đai');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa cấp đai này? Việc này có thể ảnh hưởng đến các học viên đang có đai này. Khuyên dùng: Chuyển trạng thái sang "Tạm ẩn".')) {
      setDeletingId(id);
      try {
        const res = await deleteBeltAction(id);
        if (res.success && res.data) {
          setBelts(res.data);
        } else {
          alert(res.error || 'Lỗi khi xóa');
        }
      } catch (err) {
        console.error(err);
        alert('Lỗi hệ thống khi xóa.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. PAGE HEADER */}
      <PageHeader 
        title="Hệ thống Cấp Đai" 
        description="Quản lý hệ thống cấp bậc võ đạo, thứ tự đai và lộ trình thăng cấp của học viên"
        primaryAction={
          <Button 
            onClick={handleOpenAdd}
            leftIcon={<span className="material-icons-round">add</span>}
            style={{ borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-teal-glow)' }}
          >
            Thêm cấp đai
          </Button>
        }
      />

      {/* 2. SUB NAVIGATION TABS */}
      <SettingsNavTabs />

      {/* 3. MODAL THÊM / SỬA CẤP ĐAI */}
      <Modal isOpen={isAdding || !!editingId} onClose={loading ? () => {} : resetForm}>
        <ModalHeader title={editingId ? 'Chỉnh sửa cấp đai' : 'Thêm cấp đai mới'} onClose={loading ? () => {} : resetForm} />
        <ModalBody>
          {error && (
            <div style={{
              color: 'var(--danger)',
              background: 'var(--danger-bg)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.875rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}
          <form id="belt-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {editingId ? (
              // EDIT FORM
              <>
                <Input 
                  label="Tên cấp đai *" 
                  required 
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                  placeholder="Ví dụ: Đai Vàng, Đai Lam, Đai Đen Nhất Đẳng..."
                />
                <Input 
                  label="Thứ tự hiển thị (từ thấp đến cao)" 
                  type="number"
                  required 
                  value={editFormData.display_order} 
                  onChange={e => setEditFormData({...editFormData, display_order: parseInt(e.target.value) || 0})} 
                  helperText="Cấp đai có thứ tự nhỏ hơn sẽ được xếp trước trong lộ trình thăng cấp"
                />
              </>
            ) : (
              // ADD BULK FORM
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Danh sách tên cấp đai *
                  </label>
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBeltNames(prev => [...prev, ''])} 
                    disabled={loading}
                    leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}
                    style={{ borderRadius: 'var(--radius-full)' }}
                  >
                    Thêm dòng
                  </Button>
                </div>
                
                {beltNames.map((name, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <Input 
                        required 
                        value={name} 
                        onChange={e => {
                          const newNames = [...beltNames];
                          newNames[index] = e.target.value;
                          setBeltNames(newNames);
                        }} 
                        placeholder={`Tên cấp đai ${index + 1} (vd: Đai Vàng, Đai Lam...)`}
                        disabled={loading}
                      />
                    </div>
                    {beltNames.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => {
                          const newNames = [...beltNames];
                          newNames.splice(index, 1);
                          setBeltNames(newNames);
                        }}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: 'none',
                          background: 'var(--danger-bg)',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                        title="Xóa dòng này"
                        disabled={loading}
                      >
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
            Hủy
          </Button>
          <Button 
            type="submit" 
            form="belt-form" 
            isLoading={loading} 
            variant="primary"
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            Lưu Cấp Đai
          </Button>
        </ModalFooter>
      </Modal>

      {/* 5. DANH SÁCH CẤP ĐAI */}
      {belts.length === 0 ? (
        <EmptyState 
          title="Chưa có cấp đai nào" 
          description="Chưa có cấp đai võ thuật nào trong hệ thống. Hãy tạo các cấp đai đầu tiên hoặc nạp dữ liệu mẫu." 
          icon="sports_martial_arts"
          action={
            <Button onClick={handleOpenAdd} leftIcon={<span className="material-icons-round">add</span>}>
              Thêm cấp đai ngay
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {belts.map((belt) => {
            const beltStyle = getBeltStyle(belt.name);
            return (
              <div 
                key={belt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-xl)',
                  gap: '16px',
                  flexWrap: 'wrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Left: Belt Order + Belt Visual Capsule */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '240px' }}>
                  {/* Order Circle */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    #{belt.display_order}
                  </div>

                  {/* Belt Visual Strip */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    background: beltStyle.bg,
                    border: `1.5px solid ${beltStyle.border}`,
                    color: beltStyle.text,
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <span 
                      style={{
                        width: '8px',
                        height: '18px',
                        borderRadius: '2px',
                        background: beltStyle.stripe,
                        display: 'inline-block'
                      }}
                    />
                    <span>{belt.name}</span>
                  </div>
                </div>

                {/* Center: Status */}
                <div>
                  <Badge variant={belt.is_active ? 'success' : 'default'}>
                    {belt.is_active ? 'Đang dùng' : 'Tạm ẩn'}
                  </Badge>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(belt)}
                    disabled={deletingId === belt.id}
                    leftIcon={<span className="material-icons-round" style={{ fontSize: '15px' }}>edit</span>}
                    style={{ borderRadius: 'var(--radius-full)' }}
                  >
                    Sửa
                  </Button>
                  
                  {deletingId === belt.id ? (
                    <Button type="button" variant="ghost" size="sm" disabled>
                      Đang xóa...
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(belt.id)}
                      disabled={deletingId !== null}
                      leftIcon={<span className="material-icons-round" style={{ fontSize: '15px', color: 'var(--danger)' }}>delete</span>}
                      style={{ color: 'var(--danger)', borderRadius: 'var(--radius-full)' }}
                    >
                      Xóa
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
