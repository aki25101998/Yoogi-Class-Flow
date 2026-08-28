'use client';

import { useState, useEffect } from 'react';
import { getBeltsAction, addBeltAction, updateBeltAction, deleteBeltAction } from './actions';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Badge } from '@/app/components/ui/Badge';

export default function BeltsClient() {
  const [belts, setBelts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', display_order: 1, is_active: true });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBelts = async () => {
    setIsLoading(true);
    const res = await getBeltsAction();
    if (res.success && res.data) {
      setBelts(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBelts();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', display_order: belts.length + 1, is_active: true });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleOpenAdd = () => {
    setFormData({ name: '', display_order: belts.length + 1, is_active: true });
    setIsAdding(true);
  };

  const handleEdit = (belt: any) => {
    setEditingId(belt.id);
    setFormData({ 
      name: belt.name, 
      display_order: belt.display_order, 
      is_active: belt.is_active 
    });
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    let res;
    if (editingId) {
      res = await updateBeltAction(editingId, formData);
    } else {
      res = await addBeltAction(formData);
    }
    
    setLoading(false);
    if (res.success) {
      resetForm();
      fetchBelts();
    } else {
      setError(res.error || 'Lỗi khi lưu cấp đai');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa cấp đai này? Việc này có thể ảnh hưởng đến các học viên đang có đai này. Khuyên dùng: Chuyển trạng thái sang "Tạm ẩn".')) {
      setLoading(true);
      const res = await deleteBeltAction(id);
      setLoading(false);
      if (res.success) {
        fetchBelts();
      } else {
        alert(res.error || 'Lỗi khi xóa');
      }
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Cấp Đai" 
        description="Quản lý các cấp đai được sử dụng trong trung tâm"
        primaryAction={
          <Button 
            onClick={handleOpenAdd}
            leftIcon={<span className="material-icons-round">add</span>}
          >
            Thêm cấp đai
          </Button>
        }
      />

      <Modal isOpen={isAdding || !!editingId} onClose={loading ? () => {} : resetForm}>
        <ModalHeader title={editingId ? 'Sửa cấp đai' : 'Thêm cấp đai'} onClose={loading ? () => {} : resetForm} />
        <ModalBody>
          {error && <div className="text-danger mb-4 text-sm bg-danger-bg p-3 rounded-md">{error}</div>}
          <form id="belt-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input 
              label="Tên cấp đai *" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <Input 
              label="Thứ tự hiển thị" 
              type="number"
              required 
              value={formData.display_order} 
              onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})} 
            />
            <Select 
              label="Trạng thái" 
              value={formData.is_active ? 'true' : 'false'} 
              onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}
              options={[
                { value: 'true', label: 'Đang dùng' },
                { value: 'false', label: 'Tạm ẩn' }
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="belt-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      <div className="bg-surface rounded-lg border border-light overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-secondary">Đang tải...</div>
        ) : belts.length === 0 ? (
          <div className="p-8 text-center text-secondary">Chưa có cấp đai nào. Hãy tạo cấp đai đầu tiên.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-light bg-surface-hover">
                <th className="p-4 font-medium text-secondary text-sm">Thứ tự</th>
                <th className="p-4 font-medium text-secondary text-sm">Tên cấp đai</th>
                <th className="p-4 font-medium text-secondary text-sm">Trạng thái</th>
                <th className="p-4 font-medium text-secondary text-sm text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {belts.map((belt) => (
                <tr key={belt.id} className="border-b border-light last:border-b-0 hover:bg-surface-hover/50">
                  <td className="p-4 text-main">{belt.display_order}</td>
                  <td className="p-4 font-medium text-main">{belt.name}</td>
                  <td className="p-4">
                    <Badge variant={belt.is_active ? 'success' : 'default'}>
                      {belt.is_active ? 'Đang dùng' : 'Tạm ẩn'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(belt)}
                      >
                        Sửa
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-danger hover:bg-danger-bg"
                        onClick={() => handleDelete(belt.id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
