'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '../../../../DashboardProvider';
import { useTrainingClassDetails, useTrainingFormLookups } from '@/hooks/useTrainingManagement';
import { addStudentAction, updateStudentAction, unenrollStudentAction, importStudentsBatchAction } from '../../../actions';
import dynamic from 'next/dynamic';

const ImportModal = dynamic(() => import('@/app/components/excel/ImportModal').then(mod => mod.ImportModal), { ssr: false });
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { StudentsImportDef, StudentsExportDef } from '@/services/excel/definitions/students.def';

import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';

export default function ClassDetailsClient({ venueId, classId }: { venueId: string; classId: string }) {
  const router = useRouter();
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const { classDetails, isClassLoading } = useTrainingClassDetails(organizationId, venueId, classId);
  const { activeBelts, activeClassesForVenue } = useTrainingFormLookups(organizationId, venueId);
  
  const queryClient = useQueryClient();

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', current_belt_id: '', class_id: classId });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForms = () => {
    setStudentForm({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', current_belt_id: '', class_id: classId });
    setIsStudentModalOpen(false);
    setEditingStudentId(null);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['training', organizationId] });
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!studentForm.name.trim()) {
      setError('Vui lòng nhập họ tên học viên');
      return;
    }
    if (!studentForm.dob) {
      setError('Vui lòng chọn ngày sinh');
      return;
    }

    setLoading(true);
    
    if (editingStudentId) {
      const payload = {
        name: studentForm.name,
        phone: studentForm.phone,
        parent_name: studentForm.parent_name,
        parent_phone: studentForm.parent_phone,
        dob: studentForm.dob,
        current_belt_id: studentForm.current_belt_id || null,
        venue_id: venueId,
      };
      const res = await updateStudentAction(editingStudentId, payload, studentForm.class_id);
      setLoading(false);
      
      if (res.success) {
        resetForms();
        handleSuccess();
      } else {
        setError(res.error || 'Lỗi khi cập nhật học viên');
      }
    } else {
      const payload = {
        ...studentForm,
        venue_id: venueId,
        current_belt_id: studentForm.current_belt_id || undefined,
        class_id: studentForm.class_id || undefined,
      };

      const res = await addStudentAction(payload);
      setLoading(false);
      
      if (res.success) {
        resetForms();
        handleSuccess();
      } else {
        setError(res.error || 'Lỗi khi thêm học viên');
      }
    }
  };

  const handleEditStudent = (student: any) => {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name,
      phone: student.phone || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      dob: student.dob || '',
      current_belt_id: student.organization_belts?.id || '',
      class_id: classId,
    });
    setIsStudentModalOpen(true);
  };

  const handleRemoveStudent = async (student: any) => {
    if (confirm(`Bạn có chắc muốn loại học viên ${student.name} khỏi lớp này?`)) {
      setLoading(true);
      const res = await unenrollStudentAction(student.id, classId);
      setLoading(false);
      if (res.success) {
        handleSuccess();
      } else {
        alert(res.error || 'Lỗi khi xóa học viên khỏi lớp');
      }
    }
  };

  if (isClassLoading) {
    return <div className="p-8 text-center text-secondary">Đang tải thông tin lớp học...</div>;
  }

  if (!classDetails) {
    return (
      <div className="flex-col gap-6">
        <div className="mb-2">
          <Link href={`/training/${venueId}`} className="text-secondary hover:text-primary flex items-center gap-1 text-sm font-medium">
            <span className="material-icons-round text-sm">arrow_back</span>
            Quay lại
          </Link>
        </div>
        <PageHeader title="Không tìm thấy lớp học" />
        <EmptyState title="Lỗi" description="Lớp học không tồn tại hoặc bạn không có quyền truy cập." icon="error" />
      </div>
    );
  }

  const activeStudents = classDetails.students?.filter((s: any) => s.class_student_status === 'active') || [];

  return (
    <div className="flex-col gap-6">
      <div className="mb-2">
        <Link href={`/training/${venueId}`} className="text-secondary hover:text-primary flex items-center gap-1 text-sm font-medium">
          <span className="material-icons-round text-sm">arrow_back</span>
          Quay lại địa điểm
        </Link>
      </div>
      <PageHeader 
        title={`Lớp: ${classDetails.name}`} 
        description={`${classDetails.venues?.name || 'Chi nhánh'} | HLV: ${classDetails.head_coach?.name || 'Chưa phân công'}`}
        primaryAction={isAdminOrOwner ? (
          <div className="flex gap-2">
            <ExportButton data={activeStudents} definition={StudentsExportDef} />
            <Button 
              variant="outline" 
              onClick={() => setShowImport(true)}
              leftIcon={<span className="material-icons-round">upload_file</span>}
            >
              Import Excel
            </Button>
            <Button 
              onClick={() => setIsStudentModalOpen(true)}
              leftIcon={<span className="material-icons-round">person_add</span>}
            >
              Thêm Học Viên
            </Button>
          </div>
        ) : (
          <ExportButton data={activeStudents} definition={StudentsExportDef} />
        )}
      />

      {showImport && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          definition={StudentsImportDef}
          existingRecords={activeStudents}
          onImport={importStudentsBatchAction}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-hover border-b border-light">
                  <th className="p-4 text-sm font-semibold text-secondary w-[250px]">Tên học viên</th>
                  <th className="p-4 text-sm font-semibold text-secondary w-[120px]">Ngày sinh</th>
                  <th className="p-4 text-sm font-semibold text-secondary w-[150px]">SĐT / Phụ huynh</th>
                  <th className="p-4 text-sm font-semibold text-secondary w-[120px]">Cấp đai</th>
                  <th className="p-4 text-sm font-semibold text-secondary w-[100px]">Trạng thái</th>
                  {isAdminOrOwner && <th className="p-4 text-sm font-semibold text-secondary text-right w-[100px]">Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {activeStudents.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrOwner ? 6 : 5} className="p-8 text-center text-secondary">
                      <EmptyState 
                        title="Lớp chưa có học viên" 
                        description="Vui lòng bấm Thêm Học Viên để ghi danh vào lớp." 
                        icon="school"
                      />
                    </td>
                  </tr>
                ) : (
                  activeStudents.map((student: any) => (
                    <tr key={student.id} className="border-b border-light hover:bg-surface-hover/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-main">{student.name}</div>
                      </td>
                      <td className="p-4 text-main">
                        {student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="text-main">{student.phone || student.parent_phone || 'N/A'}</div>
                        <div className="text-xs text-secondary">{student.parent_name}</div>
                      </td>
                      <td className="p-4">
                        {student.organization_belts ? (
                          <Badge variant="primary">{student.organization_belts.name}</Badge>
                        ) : (
                          <span className="text-secondary text-sm">Chưa có</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={student.status === 'active' ? 'success' : 'default'}>
                          {student.status === 'active' ? 'Hoạt động' : 'Tạm nghỉ'}
                        </Badge>
                      </td>
                      {isAdminOrOwner && (
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEditStudent(student)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-surface hover:text-primary transition-colors"
                              title="Sửa"
                            >
                              <span className="material-icons-round text-[18px]">edit</span>
                            </button>
                            <button 
                              onClick={() => handleRemoveStudent(student)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-danger-bg hover:text-danger transition-colors"
                              title="Loại khỏi lớp"
                              disabled={loading}
                            >
                              <span className="material-icons-round text-[18px]">person_remove</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Student Modal */}
      <Modal isOpen={isStudentModalOpen} onClose={loading ? () => {} : resetForms}>
        <ModalHeader title={editingStudentId ? 'Sửa thông tin học viên' : 'Thêm học viên mới'} onClose={loading ? () => {} : resetForms} />
        <ModalBody>
          {error && (
            <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-md text-sm mb-5 flex items-center gap-2">
              <span className="material-icons-round text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}
          <form id="student-form" onSubmit={handleStudentSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Input 
              label="Tên học viên *" 
              required 
              value={studentForm.name} 
              onChange={e => setStudentForm({...studentForm, name: e.target.value})} 
            />
            <Input 
              label="Ngày sinh *" 
              type="date"
              required 
              value={studentForm.dob} 
              onChange={e => setStudentForm({...studentForm, dob: e.target.value})} 
            />
            <Input 
              label="Số điện thoại" 
              value={studentForm.phone} 
              onChange={e => setStudentForm({...studentForm, phone: e.target.value})} 
            />
            <Input 
              label="Tên phụ huynh" 
              value={studentForm.parent_name} 
              onChange={e => setStudentForm({...studentForm, parent_name: e.target.value})} 
            />
            <Input 
              label="SĐT phụ huynh" 
              value={studentForm.parent_phone} 
              onChange={e => setStudentForm({...studentForm, parent_phone: e.target.value})} 
            />
            
            <Select 
              label="Đai hiện tại"
              value={studentForm.current_belt_id} 
              onChange={e => setStudentForm({...studentForm, current_belt_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chọn đai --' },
                ...activeBelts.map((b: any) => ({ value: b.id, label: b.name }))
              ]}
            />
            
            <Select 
              label="Chuyển lớp"
              value={studentForm.class_id} 
              onChange={e => setStudentForm({...studentForm, class_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chỉ ghi danh, không xếp lớp --' },
                ...activeClassesForVenue.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForms} disabled={loading}>Hủy</Button>
          <Button type="submit" form="student-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
