'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addStudentAction, updateStudentAction, deleteStudentAction, importStudentsBatchAction } from './actions';
import { useStudents } from '@/hooks/useStudents';
import { useDashboardContext } from '../DashboardProvider';
import dynamic from 'next/dynamic';
const ImportModal = dynamic(() => import('@/app/components/excel/ImportModal').then(mod => mod.ImportModal), { ssr: false });
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { StudentsImportDef, StudentsExportDef } from '@/services/excel/definitions/students.def';

import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import styles from '@/app/styles/page-standard.module.css';



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
  const [showImport, setShowImport] = useState(false);
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

    if (!formData.name.trim()) {
      setError('Vui lòng nhập họ tên học viên');
      return;
    }
    if (!formData.dob) {
      setError('Vui lòng chọn ngày sinh');
      return;
    }
    if (!formData.venue_id) {
      setError('Vui lòng chọn địa điểm học');
      return;
    }

    setLoading(true);
    
    const submitData = {
      ...formData,
      current_belt_id: formData.current_belt_id === '' ? null : formData.current_belt_id,
      venue_id: formData.venue_id
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
          <div className="flex gap-2">
            <ExportButton data={students} definition={StudentsExportDef} />
            <Button 
              variant="outline" 
              onClick={() => setShowImport(true)}
              leftIcon={<span className="material-icons-round">upload_file</span>}
            >
              Import Excel
            </Button>
            <Button 
              onClick={() => setIsAdding(true)}
              leftIcon={<span className="material-icons-round">person_add</span>}
            >
              Thêm Học Viên
            </Button>
          </div>
        ) : (
          <ExportButton data={students} definition={StudentsExportDef} />
        )}
      />

      {showImport && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          definition={StudentsImportDef}
          existingRecords={students}
          onImport={importStudentsBatchAction}
        />
      )}

      <Modal isOpen={isAdding || !!editingId} onClose={loading ? () => {} : resetForm}>
        <ModalHeader title={editingId ? 'Sửa thông tin học viên' : 'Thêm học viên mới'} onClose={loading ? () => {} : resetForm} />
        <ModalBody>
          {error && (
            <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-md text-sm mb-5 flex items-center gap-2">
              <span className="material-icons-round text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}
          <form id="student-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Input 
              label="Tên học viên *" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />

            <Input 
              label="Ngày sinh *" 
              type="date"
              required 
              value={formData.dob} 
              onChange={e => setFormData({...formData, dob: e.target.value})} 
            />

            <Input 
              label="Số điện thoại" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
            />
            
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
              label="Địa điểm học *"
              required
              value={formData.venue_id} 
              onChange={e => setFormData({...formData, venue_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chọn địa điểm --' },
                ...availableVenues.map((venue: any) => ({
                  value: venue.id,
                  label: venue.name
                }))
              ]}
            />
            
            <Select 
              label="Đai hiện tại"
              value={formData.current_belt_id} 
              onChange={e => setFormData({...formData, current_belt_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chọn đai --' },
                ...availableBelts.map((belt: any) => ({
                  value: belt.id,
                  label: belt.name
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
        <div className={styles.listContainer}>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Học viên</Th>
                    <Th>Liên hệ</Th>
                    <Th>Phân lớp</Th>
                    <Th>Đai</Th>
                    {isAdminOrOwner && <Th className="text-right">Thao tác</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {students.map((student: any) => {
                    const activeClass = student.class_students && student.class_students.length > 0 ? student.class_students[0] : null;
                    const currentClassName = activeClass ? activeClass.venue_classes?.name : 'Chưa xếp lớp';
                    const currentVenueName = activeClass ? (activeClass.venue_classes?.venues?.name || 'Không rõ') : (student.venues?.name || 'Chưa chọn địa điểm');

                    return (
                      <Tr key={student.id}>
                        <Td>
                          <div className="font-semibold text-main">{student.name}</div>
                          <div className="text-xs text-secondary mt-1">SN: {student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : 'N/A'}</div>
                        </Td>
                        <Td>
                          <div className="text-sm">{student.phone || 'N/A'}</div>
                          <div className="text-xs text-secondary mt-1">PH: {student.parent_name || 'N/A'}</div>
                        </Td>
                        <Td>
                          <div className="font-medium text-main">{currentClassName}</div>
                          <div className="text-xs text-secondary mt-1">{currentVenueName}</div>
                        </Td>
                        <Td>
                          <Badge variant={student.organization_belts ? 'primary' : 'default'}>
                            {student.organization_belts?.name || 'Chưa có đai'}
                          </Badge>
                        </Td>
                        {isAdminOrOwner && (
                          <Td className="text-right whitespace-nowrap">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(student)}
                              className="mr-2"
                            >
                              Sửa
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-danger hover:bg-danger-bg"
                              onClick={() => handleDelete(student.id)}
                              disabled={loading}
                            >
                              Xóa
                            </Button>
                          </Td>
                        )}
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
