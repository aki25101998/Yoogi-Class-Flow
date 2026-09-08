'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  addClassAction, updateClassAction, enrollStudentAction, unenrollStudentAction
} from './actions';
import { useClasses } from '@/hooks/useClasses';
import { useDashboardContext } from '../DashboardProvider';
import dynamic from 'next/dynamic';
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { ClassesExportDef } from '@/services/excel/definitions/classes.def';
import styles from '@/app/styles/page-standard.module.css';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Select, Input } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import ClassScheduleManager, { formatDayOfWeek } from './components/ClassScheduleManager';

function ClassSkeleton() {
  return (
    <Card className="mb-4 animate-pulse">
      <CardHeader>
        <div className="h-6 bg-surface-hover rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-surface-hover rounded w-20"></div>
      </CardHeader>
      <CardContent>
        <div className="h-4 bg-surface-hover rounded w-1/4 mb-3"></div>
        <div className="h-10 bg-surface-hover rounded w-full border border-light"></div>
      </CardContent>
    </Card>
  );
}

export default function ClassesClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { classes, availableCoaches, availableVenues, availableStudents, isLoading } = useClasses(organizationId);
  const queryClient = useQueryClient();

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    venue_id: '',
    status: 'active'
  });

  const [studentModalClassId, setStudentModalClassId] = useState<string | null>(null);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['classes', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['activeClasses', organizationId] });
  };

  const openAddModal = () => {
    setEditingClassId(null);
    setFormData({ name: '', venue_id: '', status: 'active' });
    setError('');
    setIsClassModalOpen(false);
    setTimeout(() => setIsClassModalOpen(true), 10);
  };

  const openEditModal = (cls: any) => {
    setEditingClassId(cls.id);
    setFormData({
      name: cls.name,
      venue_id: cls.venue_id,
      status: cls.status || 'active'
    });
    setError('');
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    let res;
    if (editingClassId) {
      res = await updateClassAction(editingClassId, formData);
    } else {
      res = await addClassAction(formData);
    }
    
    setLoading(false);
    if (res.success) {
      if (!editingClassId) {
        setIsClassModalOpen(false);
      }
      handleSuccess();
      // If we are editing, keep the modal open to add schedules.
      if (editingClassId) {
        setIsClassModalOpen(false);
      }
    } else {
      setError(res.error || 'Lỗi khi lưu lớp học');
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentModalClassId || !selectedStudentToAdd) return;
    
    setLoading(true);
    const res = await enrollStudentAction(studentModalClassId, selectedStudentToAdd);
    setLoading(false);
    
    if (res.success) {
      setSelectedStudentToAdd('');
      handleSuccess();
    } else {
      alert(res.error || 'Lỗi khi thêm học viên');
    }
  };

  const handleUnenrollStudent = async (studentId: string) => {
    if (!studentModalClassId) return;
    if (confirm('Bạn có chắc muốn xóa học viên này khỏi lớp?')) {
      setLoading(true);
      const res = await unenrollStudentAction(studentModalClassId, studentId);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi xóa học viên');
    }
  };

  const activeStudentsInModal = studentModalClassId ? 
    classes.find((c: any) => c.id === studentModalClassId)?.class_students?.filter((cs: any) => cs.status === 'active') || [] 
    : [];

  const exportData = classes.map((c: any) => ({
    ...c,
    venueName: c.venues?.name || '',
    coachName: c.class_coaches?.map((cc:any) => cc.coaches?.organization_members?.profiles?.name).join(', ') || '',
    studentCount: c.class_students?.filter((cs:any) => cs.status === 'active').length || 0
  }));

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Lớp học" 
        description="Quản lý danh sách lớp học và phân công huấn luyện viên phụ trách"
        primaryAction={isAdminOrOwner ? (
          <div className="flex gap-2">
            <ExportButton data={exportData} definition={ClassesExportDef} />
            <Button onClick={openAddModal} leftIcon={<span className="material-icons-round">add</span>}>
              Tạo Lớp
            </Button>
          </div>
        ) : (
          <ExportButton data={exportData} definition={ClassesExportDef} />
        )}
      />

      {isLoading ? (
        <div className="flex-col gap-6 mt-6">
          <ClassSkeleton />
          <ClassSkeleton />
        </div>
      ) : classes.length === 0 ? (
        <EmptyState 
          title="Chưa có lớp học nào" 
          description="Chưa có lớp học nào được tạo trong hệ thống. Vui lòng thêm lớp mới để bắt đầu." 
          icon="class"
        />
      ) : (
        <div className={styles.listContainer}>
          {classes.map((cls: any) => {
            const activeSchedules = (cls.schedules || []).filter((s:any) => s.status === 'active');
            let scheduleStr = 'Chưa có lịch học';
            if (activeSchedules.length > 0) {
              const days = activeSchedules.map((s:any) => formatDayOfWeek(s.day_of_week));
              const uniqueDays = Array.from(new Set(days)).sort();
              scheduleStr = uniqueDays.join(', ');
            }

            // Determine if we should show ACTIVE or NO_SCHEDULE
            const isNoSchedule = cls.status === 'active' && activeSchedules.length === 0;

            return (
            <div key={cls.id} className={styles.rowItem}>
              <div className={styles.rowMainInfo}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={styles.rowTitle}>{cls.name || 'Lớp chưa đặt tên'}</span>
                  <Badge variant={cls.status === 'active' ? (isNoSchedule ? 'warning' : 'success') : 'default'} className="ml-2">
                    {cls.status === 'active' ? (isNoSchedule ? 'Thiếu lịch học' : 'Đang hoạt động') : 'Tạm ngưng'}
                  </Badge>
                </div>
                <div className={styles.rowSubTitle}>
                  {cls.venues?.name || 'Chưa có địa điểm'} • {scheduleStr}
                </div>
              </div>
              
              <div className={styles.rowMeta}>
                <div className={styles.rowMetaItem}>
                  <span className={styles.rowMetaLabel}>HLV Phụ trách</span>
                  <span className={styles.rowMetaValue}>
                    {(!cls.class_coaches || cls.class_coaches.length === 0) 
                      ? <span className="text-muted italic">Chưa phân công</span> 
                      : (() => {
                          const sortedCoaches = [...cls.class_coaches].sort((a: any, b: any) => a.role === 'HEAD_COACH' ? -1 : 1);
                          const names = sortedCoaches.map((assignment: any) => {
                            const name = assignment.coaches?.organization_members?.profiles?.name || 'Unknown';
                            return assignment.role === 'HEAD_COACH' ? `★ ${name}` : name;
                          });
                          if (names.length > 3) {
                            return `${names.slice(0, 3).join(' · ')} +${names.length - 3}`;
                          }
                          return names.join(' · ');
                        })()}
                  </span>
                </div>
                <div className={styles.rowMetaItem}>
                  <span className={styles.rowMetaLabel}>Sĩ số</span>
                  <span className={styles.rowMetaValue}>
                    {cls.class_students?.filter((cs: any) => cs.status === 'active').length || 0} hv
                  </span>
                </div>
              </div>

              {isAdminOrOwner && (
                <div className={styles.rowActions}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setStudentModalClassId(cls.id)}
                    leftIcon={<span className="material-icons-round">groups</span>}
                  >
                    Học viên
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditModal(cls)}
                    title="Sửa"
                    leftIcon={<span className="material-icons-round">edit</span>}
                  >
                    Sửa
                  </Button>
                </div>
              )}
            </div>
          )})}
        </div>
      )}

      {/* MODAL TẠO / SỬA LỚP */}
      <Modal isOpen={isClassModalOpen} onClose={loading ? () => {} : () => setIsClassModalOpen(false)}>
        <ModalHeader title={editingClassId ? "Sửa thông tin lớp" : "Tạo lớp học"} onClose={loading ? () => {} : () => setIsClassModalOpen(false)} />
        <ModalBody>
          <div className="max-h-[70vh] overflow-y-auto px-1">
            {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}
            <form id="class-form" onSubmit={handleSaveClass} style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              <Input 
                label="Tên lớp học *" 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
              
              <Select 
                label="Địa điểm *"
                value={formData.venue_id} 
                onChange={e => setFormData({...formData, venue_id: e.target.value})} 
                required
                options={[
                  { value: '', label: '-- Chọn địa điểm --' },
                  ...availableVenues.map((v: any) => ({ value: v.id, label: v.name }))
                ]}
              />

              <Select 
                label="Trạng thái"
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})} 
                options={[
                  { value: 'active', label: 'Hoạt động' },
                  { value: 'inactive', label: 'Tạm ngưng' }
                ]}
              />
            </form>

            {/* LỊCH HỌC SECTION */}
            {editingClassId ? (
              <ClassScheduleManager 
                classId={editingClassId}
                schedules={classes.find((c: any) => c.id === editingClassId)?.schedules || []}
                onSuccess={handleSuccess}
              />
            ) : (
              <div className="border-t border-light pt-6 mt-4 text-center text-muted italic text-sm">
                Vui lòng lưu lớp học trước khi thêm lịch.
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setIsClassModalOpen(false)} disabled={loading}>Đóng</Button>
          {/* Note: Save button only for basic info now. Schedules auto-save. */}
          <Button type="submit" form="class-form" isLoading={loading} variant="primary">Lưu thông tin</Button>
        </ModalFooter>
      </Modal>

      {/* MODAL QUẢN LÝ HỌC VIÊN */}
      <Modal isOpen={!!studentModalClassId} onClose={loading ? () => {} : () => setStudentModalClassId(null)}>
        <ModalHeader title="Quản lý học viên trong lớp" onClose={loading ? () => {} : () => setStudentModalClassId(null)} />
        <ModalBody>
          <form onSubmit={handleEnrollStudent} className="flex gap-2 mb-6">
            <div className="flex-1">
              <Select 
                value={selectedStudentToAdd} 
                onChange={e => setSelectedStudentToAdd(e.target.value)} 
                options={[
                  { value: '', label: '-- Chọn học viên --' },
                  ...availableStudents.map((s: any) => ({ value: s.id, label: `${s.name} - ${s.phone || 'Không SĐT'}` }))
                ]}
              />
            </div>
            <Button type="submit" variant="primary" disabled={loading || !selectedStudentToAdd}>Thêm</Button>
          </form>

          <h4 className="text-sm font-semibold text-secondary mb-3">Danh sách học viên ({activeStudentsInModal.length})</h4>
          {activeStudentsInModal.length === 0 ? (
            <p className="text-muted text-sm italic">Lớp chưa có học viên nào.</p>
          ) : (
            <ul className="flex-col gap-2 max-h-64 overflow-y-auto">
              {activeStudentsInModal.map((assignment: any) => {
                const studentName = assignment.students?.name || availableStudents.find((s: any) => s.id === assignment.student_id)?.name || 'Không rõ tên';
                return (
                <li key={assignment.id} className="flex justify-between items-center p-3 bg-background rounded-md border border-light">
                  <span className="font-medium text-main">{studentName}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-danger hover:bg-danger-bg"
                    onClick={() => handleUnenrollStudent(assignment.student_id)}
                    disabled={loading}
                    leftIcon={<span className="material-icons-round">remove_circle_outline</span>}
                  >
                    Xóa
                  </Button>
                </li>
              )})}
            </ul>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setStudentModalClassId(null)} disabled={loading}>Đóng</Button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
