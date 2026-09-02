'use client';

import { useState } from 'react';
import { getBeltsAction, addBeltAction, updateBeltAction, deleteBeltAction } from './actions';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import { EmptyState } from '@/app/components/ui/EmptyState';

export default function BeltsClient({ initialBelts = [] }: { initialBelts?: any[] }) {
  const [belts, setBelts] = useState<any[]>(initialBelts);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', display_order: 1, is_active: true });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBelts = async () => {
    setIsRefreshing(true);
    const res = await getBeltsAction();
    if (res.success && res.data) {
      setBelts(res.data);
    }
    setIsRefreshing(false);
  };

  const resetForm = () => {
    setFormData({ name: '', display_order: 1, is_active: true });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleOpenAdd = () => {
    // Only used for visual default, server ignores it for adds
    setFormData({ name: '', display_order: belts.length > 0 ? Math.max(...belts.map(b => b.display_order || 0)) + 1 : 1, is_active: true });
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
    
    try {
      let res;
      if (editingId) {
        res = await updateBeltAction(editingId, formData);
      } else {
        res = await addBeltAction(formData);
      }
      
      if (res.success) {
        // Fetch fresh data immediately and wait for it
        await fetchBelts();
        resetForm(); // Close modal after state is updated
      } else {
        setError(res.error || 'Lỗi khi lưu cấp đai');
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
      setLoading(true);
      try {
        const res = await deleteBeltAction(id);
        if (res.success) {
          await fetchBelts();
        } else {
          alert(res.error || 'Lỗi khi xóa');
        }
      } catch (err) {
        console.error(err);
        alert('Lỗi hệ thống khi xóa.');
      } finally {
        setLoading(false);
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
              disabled={!editingId} // Disable if adding, let server handle it
              value={formData.display_order} 
              onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})} 
              helperText={!editingId ? "Thứ tự sẽ được tự động tính ở cuối danh sách" : "Thay đổi thứ tự sẽ tự động sắp xếp lại các cấp đai khác"}
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

      {belts.length === 0 ? (
        <EmptyState 
          title="Chưa có cấp đai" 
          description="Chưa có cấp đai nào trong hệ thống. Hãy tạo cấp đai đầu tiên." 
          icon="sports_martial_arts"
        />
      ) : (
        <Card className={isRefreshing ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Thứ tự</Th>
                  <Th>Tên cấp đai</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right font-semibold">Hành động</Th>
                </Tr>
              </Thead>
              <Tbody>
                {belts.map((belt) => (
                  <Tr key={belt.id}>
                    <Td className="font-medium text-main">{belt.display_order}</Td>
                    <Td>{belt.name}</Td>
                    <Td>
                      <Badge variant={belt.is_active ? 'success' : 'default'}>
                        {belt.is_active ? 'Đang dùng' : 'Tạm ẩn'}
                      </Badge>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(belt)}
                          className="text-action text-action-primary"
                        >
                          Sửa
                        </button>
                        <span className="text-secondary/40 select-none">|</span>
                        <button
                          onClick={() => handleDelete(belt.id)}
                          className="text-action text-action-danger"
                        >
                          Xóa
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
