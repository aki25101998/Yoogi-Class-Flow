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
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                />
                <Input 
                  label="Thứ tự hiển thị" 
                  type="number"
                  required 
                  value={editFormData.display_order} 
                  onChange={e => setEditFormData({...editFormData, display_order: parseInt(e.target.value) || 0})} 
                  helperText="Thay đổi thứ tự sẽ tự động sắp xếp lại các cấp đai khác"
                />
                <Select 
                  label="Trạng thái" 
                  value={editFormData.is_active ? 'true' : 'false'} 
                  onChange={e => setEditFormData({...editFormData, is_active: e.target.value === 'true'})}
                  options={[
                    { value: 'true', label: 'Đang dùng' },
                    { value: 'false', label: 'Tạm ẩn' }
                  ]}
                />
              </>
            ) : (
              // ADD BULK FORM
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-main">Tên cấp đai *</label>
                    <Button 
                      type="button" 
                      onClick={() => setBeltNames(prev => [...prev, ''])} 
                      size="sm" 
                      variant="secondary" 
                      title="Thêm cấp đai"
                      className="!px-2 !py-1 h-auto min-h-0"
                    >
                      <span className="material-icons-round text-[18px]">add</span>
                    </Button>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {beltNames.map((name, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input 
                            required 
                            value={name} 
                            onChange={e => {
                              const newNames = [...beltNames];
                              newNames[index] = e.target.value;
                              setBeltNames(newNames);
                            }} 
                            placeholder={`Tên cấp đai ${index + 1}`}
                          />
                        </div>
                        {index > 0 && (
                          <button 
                            type="button"
                            onClick={() => {
                              const newNames = [...beltNames];
                              newNames.splice(index, 1);
                              setBeltNames(newNames);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-secondary/60 hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                            title="Xóa"
                          >
                            <span className="material-icons-round text-[20px]">close</span>
                          </button>
                        )}
                        {index === 0 && beltNames.length > 1 && (
                           <div className="w-8 h-8 shrink-0"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2">
                  <Select 
                    label="Trạng thái" 
                    value={isActive ? 'true' : 'false'} 
                    onChange={e => setIsActive(e.target.value === 'true')}
                    options={[
                      { value: 'true', label: 'Đang dùng' },
                      { value: 'false', label: 'Tạm ẩn' }
                    ]}
                  />
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
