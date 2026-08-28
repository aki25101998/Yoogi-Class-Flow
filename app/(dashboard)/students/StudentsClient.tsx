'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addStudentAction, updateStudentAction, deleteStudentAction } from './actions';
import { useStudents } from '@/hooks/useStudents';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';



function StudentSkeleton() {
  return (
    <Card className="mb-4 animate-pulse">
      <CardHeader>
        <div className="h-6 bg-surface-hover rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-surface-hover rounded w-1/2 mb-3"></div>
      </CardHeader>
      <CardContent>
        <div className="h-4 bg-surface-hover rounded w-1/4 mb-3"></div>
      </CardContent>
    </Card>
  );
}

export default function StudentsClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { students, availableClasses, availableBelts, availableVenues, isLoading } = useStudents(organizationId);
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', phone: '', parent_name: '', parent_phone: '', dob: '', status: 'active', current_belt_id: '', venue_id: '' 
  });
  
  const [editingClassId, setEditingClassId] = useState<string>('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', status: 'active', current_belt_id: '', venue_id: '' });
    setEditingClassId('');
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['students', organizationId] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const submitData = {
      ...formData,
      current_belt_id: formData.current_belt_id === '' ? null : formData.current_belt_id,
      venue_id: formData.venue_id === '' ? null : formData.venue_id
    };
    
    if (editingId) {
      const res = await updateStudentAction(editingId, submitData, editingClassId);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi cập nhật học viên');
    } else {
      const res = await addStudentAction(submitData);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi thêm học viên');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa học viên này?')) {
      setLoading(true);
      const res = await deleteStudentAction(id);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  const handleEdit = (student: any) => {
    setEditingId(student.id);
    setFormData({
      name: student.name || '',
      phone: student.phone || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      dob: student.dob || '',
      status: student.status || 'active',
      current_belt_id: student.current_belt_id || '',
      venue_id: student.venue_id || ''
    });
    
    // Tìm lớp active hiện tại
    const activeClass = student.class_students && student.class_students.length > 0 ? student.class_students[0] : null;
    setEditingClassId(activeClass ? activeClass.class_id : '');
    
    setIsAdding(false);
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Học viên" 
        description="Quản lý hồ sơ cơ bản và thông tin võ thuật của học viên"
        primaryAction={isAdminOrOwner ? (
          <Button 
            onClick={() => setIsAdding(true)}
            leftIcon={<span className="material-icons-round">person_add</span>}
          >
            Thêm Học Viên
          </Button>
        ) : undefined}
      />

      <Modal isOpen={isAdding || !!editingId} onClose={loading ? () => {} : resetForm}>
        <ModalHeader title={editingId ? 'Sửa thông tin học viên' : 'Thêm học viên mới'} onClose={loading ? () => {} : resetForm} />
        <ModalBody>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}
          <form id="student-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Input 
              label="Tên học viên *" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            
            <Input 
              label="Số điện thoại" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input 
                label="Tên phụ huynh" 
                value={formData.parent_name} 
                onChange={e => setFormData({...formData, parent_name: e.target.value})} 
              />
              <Input 
                label="SĐT phụ huynh" 
                value={formData.parent_phone} 
                onChange={e => setFormData({...formData, parent_phone: e.target.value})} 
              />
            </div>

            {editingId && (
              <Select 
                label="Lớp hiện tại"
                value={editingClassId} 
                onChange={e => setEditingClassId(e.target.value)} 
                options={[
                  { value: '', label: '-- Chưa có lớp --' },
                  ...availableClasses.map((c: any) => ({ 
                    value: c.id, 
                    label: `${c.name} (${c.venues?.name || 'Không rõ chi nhánh'})` 
                  }))
                ]}
              />
            )}
            
            <Select 
              label="Đai hiện tại"
              value={formData.current_belt_id} 
              onChange={e => setFormData({...formData, current_belt_id: e.target.value})} 
              options={[
                { value: '', label: 'Chưa có đai' },
                ...availableBelts.map((belt: any) => ({
                  value: belt.id,
                  label: belt.name
                }))
              ]}
            />

            <Select 
              label="Địa điểm học"
              value={formData.venue_id} 
              onChange={e => setFormData({...formData, venue_id: e.target.value})} 
              options={[
                { value: '', label: 'Chọn địa điểm' },
                ...availableVenues.map((venue: any) => ({
                  value: venue.id,
                  label: venue.name
                }))
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="student-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      {isLoading ? (
        <div className="flex-col gap-6 mt-6">
          <StudentSkeleton />
          <StudentSkeleton />
        </div>
      ) : students.length === 0 ? (
        <EmptyState 
          title="Chưa có học viên nào" 
          description="Hãy bấm nút Thêm Học Viên để tạo mới." 
          icon="face"
        />
      ) : (
        <div className="flex-col gap-6">
          {students.map((student: any) => {
            const activeClass = student.class_students && student.class_students.length > 0 ? student.class_students[0] : null;
            const currentClassName = activeClass ? activeClass.venue_classes?.name : 'Chưa xếp lớp';
            const currentVenueName = activeClass ? (activeClass.venue_classes?.venues?.name || 'Không rõ') : (student.venues?.name || 'Chưa chọn địa điểm');

            return (
              <Card key={student.id}>
                <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <CardTitle>{student.name}</CardTitle>
                    <p className="text-secondary text-sm mt-1">
                      SĐT: {student.phone || 'N/A'} | Phụ huynh: {student.parent_name || 'N/A'}
                    </p>
                  </div>
                  {isAdminOrOwner && (
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(student)}
                        leftIcon={<span className="material-icons-round">edit</span>}
                      >
                        Sửa
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-danger border-danger hover:bg-danger-bg"
                        onClick={() => handleDelete(student.id)}
                        disabled={loading}
                        leftIcon={<span className="material-icons-round">delete</span>}
                      >
                        Xóa
                      </Button>
                    </div>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 p-4 bg-background rounded-lg border border-light">
                    <div>
                      <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Thông tin cơ bản</h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                          <span className="text-muted">Lớp hiện tại:</span>
                          <span className="font-medium text-main">{currentClassName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Chi nhánh:</span>
                          <span className="font-medium text-main">{currentVenueName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Thông tin võ thuật</h4>
                      <div className="flex justify-between">
                        <span className="text-muted">Đai hiện tại:</span>
                        <span className="font-medium text-main">{student.organization_belts?.name || 'Chưa có đai'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
