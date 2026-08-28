'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { assignCoachAction, removeCoachAction } from './actions';
import { useClasses } from '@/hooks/useClasses';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';

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

  const { classes, availableCoaches, isLoading } = useClasses(organizationId);
  const queryClient = useQueryClient();

  const [selectedClassForAssign, setSelectedClassForAssign] = useState<string | null>(null);
  const [coachId, setCoachId] = useState('');
  const [role, setRole] = useState<'HEAD_COACH' | 'ASSISTANT_COACH'>('ASSISTANT_COACH');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['classes', organizationId] });
  };

  const handleAssign = async (classId: string, e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await assignCoachAction(classId, coachId, role);
    setLoading(false);
    if (res.success) {
      setSelectedClassForAssign(null);
      setCoachId('');
      handleSuccess();
    } else {
      setError(res.error || 'Lỗi khi phân công');
    }
  };

  const handleRemove = async (classId: string, assignedCoachId: string) => {
    if (confirm('Bạn có chắc muốn gỡ HLV này khỏi lớp?')) {
      setLoading(true);
      const res = await removeCoachAction(classId, assignedCoachId);
      setLoading(false);
      if (res.success) {
        handleSuccess();
      } else {
        alert(res.error || 'Lỗi khi gỡ');
      }
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Lớp học" 
        description="Quản lý danh sách lớp học và phân công huấn luyện viên phụ trách"
        primaryAction={isAdminOrOwner ? (
          <Button leftIcon={<span className="material-icons-round">add</span>}>
            Tạo Lớp (Sắp ra mắt)
          </Button>
        ) : undefined}
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
        <div className="flex-col gap-6">
          {classes.map((cls: any) => (
            <Card key={cls.id}>
              <CardHeader>
                <div>
                  <CardTitle>{cls.name || 'Lớp chưa đặt tên'}</CardTitle>
                  <p className="text-secondary mt-2 text-sm">{cls.start_time} - {cls.end_time}</p>
                </div>
                {isAdminOrOwner && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedClassForAssign(selectedClassForAssign === cls.id ? null : cls.id)}
                    leftIcon={<span className="material-icons-round">{selectedClassForAssign === cls.id ? 'close' : 'person_add'}</span>}
                  >
                    {selectedClassForAssign === cls.id ? 'Hủy' : 'Thêm HLV'}
                  </Button>
                )}
              </CardHeader>
              
              <CardContent>


                <div>
                  <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">HLV phụ trách</h4>
                  {(!cls.class_coaches || cls.class_coaches.length === 0) ? (
                    <p className="text-muted text-sm italic">Chưa có HLV nào được phân công.</p>
                  ) : (
                    <ul className="flex-col gap-2">
                      {cls.class_coaches.map((assignment: any) => (
                        <li key={assignment.id} className="flex justify-between items-center p-3 bg-background rounded-md border border-light">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-main">{assignment.coaches?.name}</span>
                            <Badge variant={assignment.role === 'HEAD_COACH' ? 'primary' : 'default'}>
                              {assignment.role === 'HEAD_COACH' ? 'HLV Trưởng' : 'HLV Phụ'}
                            </Badge>
                          </div>
                          {isAdminOrOwner && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-danger hover:bg-danger-bg"
                              onClick={() => handleRemove(cls.id, assignment.coach_id)}
                              disabled={loading}
                              leftIcon={<span className="material-icons-round">person_remove</span>}
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
      <Modal isOpen={!!selectedClassForAssign} onClose={loading ? () => {} : () => { setSelectedClassForAssign(null); setCoachId(''); setRole('ASSISTANT_COACH'); }}>
        <ModalHeader title="Phân công HLV mới" onClose={loading ? () => {} : () => { setSelectedClassForAssign(null); setCoachId(''); setRole('ASSISTANT_COACH'); }} />
        <ModalBody>
          {error && <div className="text-danger mb-4 text-sm">{error}</div>}
          <form id="assign-coach-form" onSubmit={(e) => {
            if (selectedClassForAssign) handleAssign(selectedClassForAssign, e);
          }} className="flex flex-col gap-4">
            <Select 
              label="Chọn HLV"
              value={coachId} 
              onChange={e => setCoachId(e.target.value)} 
              required
              options={[
                { value: '', label: '-- Chọn --' },
                ...availableCoaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            <Select 
              label="Vai trò"
              value={role} 
              onChange={e => setRole(e.target.value as any)}
              options={[
                { value: 'ASSISTANT_COACH', label: 'HLV phụ (Assistant Coach)' },
                { value: 'HEAD_COACH', label: 'HLV trưởng (Head Coach)' }
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => { setSelectedClassForAssign(null); setCoachId(''); setRole('ASSISTANT_COACH'); }} disabled={loading}>Hủy</Button>
          <Button type="submit" form="assign-coach-form" isLoading={loading} variant="primary">Lưu phân công</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
