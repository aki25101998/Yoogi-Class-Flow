'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '../../DashboardProvider';
import { useTrainingVenueDetails, useTrainingFormLookups } from '@/hooks/useTrainingManagement';
import { addClassAction, updateClassAction, addStudentAction } from '../actions';

import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';

export default function VenueDetailsClient({ venueId }: { venueId: string }) {
  const router = useRouter();
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const { venue, isVenueLoading } = useTrainingVenueDetails(organizationId, venueId);
  const { activeCoaches, activeBelts, activeClassesForVenue } = useTrainingFormLookups(organizationId, venueId);
  
  const queryClient = useQueryClient();

  // Class Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState({ name: '', head_coach_id: '', assistant_coach_id: '', status: 'active' });

  // Student Modal State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', current_belt_id: '', class_id: '' });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForms = () => {
    setClassForm({ name: '', head_coach_id: '', assistant_coach_id: '', status: 'active' });
    setStudentForm({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', current_belt_id: '', class_id: '' });
    setIsClassModalOpen(false);
    setIsStudentModalOpen(false);
    setEditingClassId(null);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['training', organizationId] });
  };

  // --- Class Submission ---
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!classForm.name.trim()) {
      setError('Vui lòng nhập tên lớp học');
      return;
    }

    setLoading(true);
    
    const payload = {
      ...classForm,
      venue_id: venueId,
      head_coach_id: classForm.head_coach_id || undefined,
      assistant_coach_id: classForm.assistant_coach_id || undefined,
    };

    if (editingClassId) {
      const res = await updateClassAction(editingClassId, payload);
      setLoading(false);
      if (res.success) {
        resetForms();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi cập nhật lớp');
    } else {
      const res = await addClassAction(payload);
      setLoading(false);
      if (res.success) {
        resetForms();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi thêm lớp');
    }
  };

  const handleEditClass = (cls: any) => {
    setEditingClassId(cls.id);
    setClassForm({
      name: cls.name,
      head_coach_id: cls.head_coach_id || '',
      assistant_coach_id: cls.assistant_coach_id || '',
      status: cls.status || 'active'
    });
    setIsClassModalOpen(true);
  };

  // --- Student Submission ---
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
  };

  if (isVenueLoading) {
    return <div className="p-8 text-center text-secondary">Đang tải thông tin địa điểm...</div>;
  }

  if (!venue) {
    return (
      <div className="flex-col gap-6">
        <div className="mb-2">
          <Link href="/training" className="text-secondary hover:text-primary flex items-center gap-1 text-sm font-medium">
            <span className="material-icons-round text-sm">arrow_back</span>
            Quay lại
          </Link>
        </div>
        <PageHeader title="Không tìm thấy địa điểm" />
        <EmptyState title="Lỗi" description="Địa điểm không tồn tại hoặc bạn không có quyền truy cập." icon="error" />
      </div>
    );
  }

  const classes = venue.classes || [];
  const totalStudents = classes.reduce((acc: number, c: any) => acc + c.studentsCount, 0);

  return (
    <div className="flex-col gap-6">
      <div className="mb-2">
        <Link href="/training" className="text-secondary hover:text-primary flex items-center gap-1 text-sm font-medium">
          <span className="material-icons-round text-sm">arrow_back</span>
          Quay lại danh sách
        </Link>
      </div>
      <PageHeader 
        title={venue.name} 
        description={venue.address || 'Chưa cập nhật địa chỉ'}
        primaryAction={isAdminOrOwner ? (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsStudentModalOpen(true)}
              leftIcon={<span className="material-icons-round">person_add</span>}
            >
              Thêm Học Viên
            </Button>
            <Button 
              onClick={() => setIsClassModalOpen(true)}
              leftIcon={<span className="material-icons-round">add_circle</span>}
            >
              Tạo Lớp
            </Button>
          </div>
        ) : null}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary font-medium uppercase tracking-wider mb-1">Tổng số lớp</p>
              <h3 className="text-2xl font-bold text-primary">{classes.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-icons-round">class</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary font-medium uppercase tracking-wider mb-1">Tổng học viên</p>
              <h3 className="text-2xl font-bold text-success">{totalStudents}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success">
              <span className="material-icons-round">school</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary font-medium uppercase tracking-wider mb-1">Trạng thái</p>
              <h3 className="text-lg font-bold text-main mt-2">
                <Badge variant={venue.status === 'active' ? 'success' : 'default'}>
                  {venue.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </Badge>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-secondary">
              <span className="material-icons-round">info</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-bold text-main mb-4">Danh sách lớp học</h3>
        {classes.length === 0 ? (
          <EmptyState 
            title="Chưa có lớp học nào" 
            description="Bấm 'Tạo Lớp' để thêm lớp học mới vào địa điểm này." 
            icon="event_seat"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls: any) => (
              <Card key={cls.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3 border-b border-light">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg text-main">{cls.name}</CardTitle>
                    <Badge variant={cls.status === 'active' ? 'success' : 'default'}>
                      {cls.status === 'active' ? 'Hoạt động' : 'Đã đóng'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary">HLV trưởng:</span>
                      <span className="text-sm font-medium text-main">{cls.head_coach?.name || 'Chưa phân công'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-secondary">HLV phụ:</span>
                      <span className="text-sm font-medium text-main">{cls.assistant_coach?.name || 'Không có'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-surface-hover p-2 rounded-md mt-2">
                      <span className="text-sm text-secondary font-medium">Học viên hiện tại:</span>
                      <span className="text-base font-bold text-primary">{cls.studentsCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/training/${venueId}/classes/${cls.id}`} className="flex-1">
                      <Button variant="primary" className="w-full justify-center">
                        Xem Học Viên
                      </Button>
                    </Link>
                    {isAdminOrOwner && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleEditClass(cls)}
                        className="px-3"
                        title="Sửa lớp"
                      >
                        <span className="material-icons-round text-secondary">edit</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Class Modal */}
      <Modal isOpen={isClassModalOpen} onClose={loading ? () => {} : resetForms}>
        <ModalHeader title={editingClassId ? 'Sửa thông tin lớp' : 'Tạo lớp học mới'} onClose={loading ? () => {} : resetForms} />
        <ModalBody>
          {error && (
            <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-md text-sm mb-5 flex items-center gap-2">
              <span className="material-icons-round text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}
          <form id="class-form" onSubmit={handleClassSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Input 
              label="Tên lớp học *" 
              required 
              value={classForm.name} 
              onChange={e => setClassForm({...classForm, name: e.target.value})} 
            />
            
            <Select 
              label="HLV Trưởng"
              value={classForm.head_coach_id} 
              onChange={e => setClassForm({...classForm, head_coach_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chọn HLV --' },
                ...activeCoaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            
            <Select 
              label="HLV Phụ (Không bắt buộc)"
              value={classForm.assistant_coach_id} 
              onChange={e => setClassForm({...classForm, assistant_coach_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chọn HLV --' },
                ...activeCoaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            
            <Select 
              label="Trạng thái"
              value={classForm.status} 
              onChange={e => setClassForm({...classForm, status: e.target.value})} 
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Ngừng hoạt động' }
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForms} disabled={loading}>Hủy</Button>
          <Button type="submit" form="class-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      {/* Student Modal */}
      <Modal isOpen={isStudentModalOpen} onClose={loading ? () => {} : resetForms}>
        <ModalHeader title="Thêm học viên mới" onClose={loading ? () => {} : resetForms} />
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
              label="Xếp vào lớp học"
              value={studentForm.class_id} 
              onChange={e => setStudentForm({...studentForm, class_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chỉ ghi danh, chưa xếp lớp --' },
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
