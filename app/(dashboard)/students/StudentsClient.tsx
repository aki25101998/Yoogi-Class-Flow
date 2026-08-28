'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addStudentAction, updateStudentAction, deleteStudentAction, enrollStudentAction, unenrollStudentAction } from './actions';
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
        <div className="h-5 bg-surface-hover rounded w-20"></div>
      </CardHeader>
      <CardContent>
        <div className="h-4 bg-surface-hover rounded w-1/4 mb-3"></div>
        <div className="h-10 bg-surface-hover rounded w-full border border-light"></div>
      </CardContent>
    </Card>
  );
}

export default function StudentsClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { students, availableClasses, isLoading } = useStudents(organizationId);
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', status: 'active' });
  
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState<string | null>(null);
  const [classId, setClassId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', status: 'active' });
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
    
    if (editingId) {
      const res = await updateStudentAction(editingId, formData);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi cập nhật học viên');
    } else {
      const res = await addStudentAction(formData);
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

  const handleEnroll = async (studentId: string, e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await enrollStudentAction(studentId, classId);
    setLoading(false);
    if (res.success) {
      setSelectedStudentForEnroll(null);
      setClassId('');
      handleSuccess();
    } else {
      setError(res.error || 'Lỗi khi xếp lớp');
    }
  };

  const handleUnenroll = async (studentId: string, classToUnenrollId: string) => {
    if (confirm('Bạn có chắc muốn gỡ học viên khỏi lớp này?')) {
      setLoading(true);
      const res = await unenrollStudentAction(studentId, classToUnenrollId);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi gỡ khỏi lớp');
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Học viên" 
        description="Quản lý danh sách học viên, thông tin liên hệ và xếp lớp"
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
            <Input 
              label="Ngày sinh" 
              type="date" 
              value={formData.dob} 
              onChange={e => setFormData({...formData, dob: e.target.value})} 
            />
            <Select 
              label="Trạng thái" 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              options={[
                { value: 'active', label: 'Đang học' },
                { value: 'inactive', label: 'Đã nghỉ' }
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="student-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!selectedStudentForEnroll} onClose={loading ? () => {} : () => { setSelectedStudentForEnroll(null); setClassId(''); }}>
        <ModalHeader title="Xếp vào lớp mới" onClose={loading ? () => {} : () => { setSelectedStudentForEnroll(null); setClassId(''); }} />
        <ModalBody>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}
          <form id="enroll-form" onSubmit={(e) => {
            if (selectedStudentForEnroll) handleEnroll(selectedStudentForEnroll, e);
          }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Select 
              label="Chọn lớp"
              value={classId} 
              onChange={e => setClassId(e.target.value)} 
              required
              options={[
                { value: '', label: '-- Chọn --' },
                ...availableClasses.map((c: any) => ({ value: c.id, label: `${c.name} (${c.start_time}-${c.end_time})` }))
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => { setSelectedStudentForEnroll(null); setClassId(''); }} disabled={loading}>Hủy</Button>
          <Button type="submit" form="enroll-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      {isLoading ? (
        <div className="flex-col gap-6 mt-6">
          <StudentSkeleton />
          <StudentSkeleton />
          <StudentSkeleton />
        </div>
      ) : students.length === 0 ? (
        <EmptyState 
          title="Chưa có học viên nào" 
          description="Bạn chưa thêm học viên nào vào trung tâm. Hãy bấm nút Thêm Học Viên để tạo mới." 
          icon="face"
        />
      ) : (
        <div className="flex-col gap-6">
          {students.map((student: any) => (
            <Card key={student.id}>
              <CardHeader className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>{student.name}</CardTitle>
                  <p className="text-secondary text-sm mt-1">
                    SĐT: {student.phone || 'N/A'} | Phụ huynh: {student.parent_name || 'N/A'} ({student.parent_phone || 'N/A'})
                  </p>
                  <div className="mt-2">
                    <Badge variant={student.status === 'active' ? 'success' : 'default'}>
                      {student.status === 'active' ? 'Đang học' : 'Đã nghỉ'}
                    </Badge>
                  </div>
                </div>
                {isAdminOrOwner && (
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => { setEditingId(student.id); setFormData(student); setIsAdding(false); }}
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
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => setSelectedStudentForEnroll(selectedStudentForEnroll === student.id ? null : student.id)}
                      leftIcon={<span className="material-icons-round">{selectedStudentForEnroll === student.id ? 'close' : 'class'}</span>}
                    >
                      {selectedStudentForEnroll === student.id ? 'Hủy' : 'Xếp Lớp'}
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent>


                <div>
                  <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Các lớp đang học</h4>
                  {(!student.class_students || student.class_students.length === 0) ? (
                    <p className="text-muted text-sm italic">Chưa được xếp vào lớp nào.</p>
                  ) : (
                    <ul className="flex-col gap-2">
                      {student.class_students.map((enrollment: any) => (
                        <li key={enrollment.id} className="flex justify-between items-center p-3 bg-background rounded-md border border-light">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-main">{enrollment.venue_classes?.name}</span>
                            <span className="text-secondary text-sm">— {enrollment.venue_classes?.start_time} - {enrollment.venue_classes?.end_time}</span>
                          </div>
                          {isAdminOrOwner && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-danger hover:bg-danger-bg"
                              onClick={() => handleUnenroll(student.id, enrollment.class_id)}
                              disabled={loading}
                              leftIcon={<span className="material-icons-round">remove_circle_outline</span>}
                            >
                              Gỡ
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
