'use client';

import { useState } from 'react';
import { getBeltsAction, addBeltsAction, updateBeltAction, deleteBeltAction } from './actions';
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
      // Validate bulk add
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
            
            {editingId ? (
              // EDIT FORM
              <>
                <Input 
                  label="Tên cấp đai *" 
                  required 
                  className="w-full"
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                />
                <Input 
                  label="Thứ tự hiển thị" 
                  type="number"
                  required 
                  className="w-full"
                  value={editFormData.display_order} 
                  onChange={e => setEditFormData({...editFormData, display_order: parseInt(e.target.value) || 0})} 
                  helperText="Thay đổi thứ tự sẽ tự động sắp xếp lại các cấp đai khác"
                />
              </>
            ) : (
              // ADD BULK FORM
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-x-2 gap-y-3 items-center w-full">
                  <div className="flex items-center">
                    <label className="block text-sm font-medium text-main m-0">Tên cấp đai *</label>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setBeltNames(prev => [...prev, ''])} 
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border border-border/50 text-secondary hover:bg-action-primary/10 hover:text-action-primary hover:border-action-primary/30 active:bg-action-primary active:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-action-primary/50"
                    title="Thêm cấp đai"
                    aria-label="Thêm cấp đai"
                    disabled={loading}
                  >
                    <span className="material-icons-round text-[18px]">add</span>
                  </button>
                  
                  {beltNames.map((name, index) => (
                    <div key={index} className="contents">
                      <Input 
                        required 
                        className="w-full m-0"
                        value={name} 
                        onChange={e => {
                          const newNames = [...beltNames];
                          newNames[index] = e.target.value;
                          setBeltNames(newNames);
                        }} 
                        placeholder={`Tên cấp đai ${index + 1}`}
                        disabled={loading}
                      />
                      {beltNames.length > 1 ? (
                        <button 
                          type="button"
                          onClick={() => {
                            const newNames = [...beltNames];
                            newNames.splice(index, 1);
                            setBeltNames(newNames);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent text-secondary hover:bg-danger-bg hover:text-action-danger active:bg-action-danger active:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-action-danger/50"
                          title="Xóa dòng"
                          aria-label={`Xóa cấp đai ${index + 1}`}
                          disabled={loading}
                        >
                          <span className="material-icons-round text-[18px]">close</span>
                        </button>
                      ) : (
                        <div className="w-8 h-8"></div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="belt-form" isLoading={loading} variant="primary">
            Lưu
          </Button>
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
                          disabled={deletingId === belt.id}
                        >
                          Sửa
                        </button>
                        <span className="text-secondary/40 select-none">|</span>
                        {deletingId === belt.id ? (
                          <span className="text-secondary/60 text-sm flex items-center gap-1">
                            <span className="material-icons-round animate-spin text-[16px]">autorenew</span> Đang xóa...
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDelete(belt.id)}
                            className="text-action text-action-danger"
                            disabled={deletingId !== null}
                          >
                            Xóa
                          </button>
                        )}
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
