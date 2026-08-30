'use client';

import { useState } from 'react';
import { useDashboardContext } from '../DashboardProvider';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { cancelSessionAction, overrideCoachAction, checkInSessionAction } from './actions';
import { useClasses } from '@/hooks/useClasses';
import { getBusinessDate, getBusinessDateString } from '@/utils/date';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Button } from '@/app/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { useQueryClient } from '@tanstack/react-query';

function StatSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="flex items-center gap-4">
        <div className="w-12 h-12 bg-surface-hover rounded-full shrink-0"></div>
        <div className="flex-1">
          <div className="h-8 bg-surface-hover rounded w-16 mb-2"></div>
          <div className="h-4 bg-surface-hover rounded w-24"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  
  const { stats, isLoading: statsLoading, isAdminOrOwner } = useDashboardStats(context);
  const { availableCoaches } = useClasses(organizationId);

  // We format date as YYYY-MM-DD for the backend
  const todayObj = getBusinessDate();
  const dateStr = getBusinessDateString(); // YYYY-MM-DD format
  const displayDate = todayObj.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // If coach, filter their sessions. If admin, show all
  const coachIdFilter = isAdminOrOwner ? undefined : context?.membership?.userId;
  
  const { sessions, isLoading: sessionsLoading } = useTodaySessions(organizationId, dateStr, coachIdFilter);
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [overrideModalSession, setOverrideModalSession] = useState<any>(null);
  const [selectedNewCoachId, setSelectedNewCoachId] = useState('');

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['todaySessions', organizationId, dateStr, coachIdFilter] });
  };

  const handleCancelSession = async (session: any) => {
    if (confirm('Bạn có chắc chắn muốn hủy buổi học này? Hệ thống sẽ ghi nhận trạng thái Hủy.')) {
      setLoading(true);
      const res = await cancelSessionAction(session.classId, dateStr, session.scheduleId, session.sessionId);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi hủy buổi học');
    }
  };

  const handleOverrideCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalSession || !selectedNewCoachId) return;
    
    setLoading(true);
    const res = await overrideCoachAction(
      overrideModalSession.classId, 
      dateStr, 
      selectedNewCoachId, 
      overrideModalSession.scheduleId, 
      overrideModalSession.sessionId
    );
    setLoading(false);
    
    if (res.success) {
      setOverrideModalSession(null);
      setSelectedNewCoachId('');
      handleSuccess();
    } else {
      alert(res.error || 'Lỗi khi xếp HLV dạy thay');
    }
  };

  const handleCheckIn = async (session: any) => {
    if (confirm('Xác nhận Check-in cho buổi học này?')) {
      setLoading(true);
      const res = await checkInSessionAction(session.classId, dateStr, 'checked_in', session.scheduleId, session.sessionId);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi Check-in');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cancelled': return <Badge variant="danger">Đã Hủy</Badge>;
      case 'checked_in': return <Badge variant="success">Đã Check-in</Badge>;
      case 'approved': return <Badge variant="primary">Đã Duyệt</Badge>;
      case 'paid': return <Badge variant="primary">Đã Thanh Toán</Badge>;
      case 'scheduled': return <Badge variant="warning">Dạy Thay</Badge>;
      default: return <Badge variant="default">Chưa Check-in</Badge>;
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Tổng Quan Hệ Thống" 
        description={`Hôm nay: ${displayDate}`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
        {statsLoading ? (
          <>
            {isAdminOrOwner && <StatSkeleton />}
            <StatSkeleton />
            {isAdminOrOwner && <StatSkeleton />}
            {isAdminOrOwner && <StatSkeleton />}
          </>
        ) : (
          <>
            {isAdminOrOwner && (
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-full)', display: 'flex' }}>
                    <span className="material-icons-round">people</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.coachCount}</div>
                    <div className="text-secondary text-sm font-medium">Huấn luyện viên</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="flex items-center gap-4">
                <div style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info-text)', padding: 'var(--space-3)', borderRadius: 'var(--radius-full)', display: 'flex' }}>
                  <span className="material-icons-round">class</span>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.classCount}</div>
                  <div className="text-secondary text-sm font-medium">{isAdminOrOwner ? 'Lớp học đang mở' : 'Lớp được phân công'}</div>
                </div>
              </CardContent>
            </Card>

            {isAdminOrOwner && (
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', padding: 'var(--space-3)', borderRadius: 'var(--radius-full)', display: 'flex' }}>
                    <span className="material-icons-round">school</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.studentCount}</div>
                    <div className="text-secondary text-sm font-medium">Học viên</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAdminOrOwner && (
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)', padding: 'var(--space-3)', borderRadius: 'var(--radius-full)', display: 'flex' }}>
                    <span className="material-icons-round">location_on</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.venueCount}</div>
                    <div className="text-secondary text-sm font-medium">Địa điểm</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Card>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg text-main">Lịch hôm nay ({sessions.length})</h3>
            <Button variant="ghost" size="sm" onClick={handleSuccess} leftIcon={<span className="material-icons-round">refresh</span>}>Làm mới</Button>
          </div>
          
          {sessionsLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-surface-hover rounded w-full"></div>
              <div className="h-20 bg-surface-hover rounded w-full"></div>
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState 
              title="Không có lịch dạy"
              description="Hiện không có lịch dạy nào trong ngày hôm nay."
              icon="event_busy"
            />
          ) : (
            <div className="flex-col gap-4">
              {sessions.map((s: any) => (
                <div key={s.classId + s.startTime} className="bg-surface rounded-md border border-light p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary-light text-primary font-bold px-3 py-2 rounded-md text-center min-w-[100px]">
                      <div>{s.startTime}</div>
                      <div className="text-xs font-normal opacity-80">{s.endTime}</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-main mb-1">{s.className}</h4>
                      <p className="text-sm text-secondary flex items-center gap-1 mb-1">
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>location_on</span> {s.venueName}
                      </p>
                      <p className="text-sm text-secondary flex items-center gap-1">
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>person</span> {s.currentCoachName || 'Chưa có HLV'}
                        {s.originalCoachId !== s.currentCoachId && (
                          <span className="text-xs text-warning ml-2">(Dạy thay {s.originalCoachName})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(s.status)}
                    
                    <div className="flex gap-2 flex-wrap justify-end">
                      {/* Admin Actions */}
                      {isAdminOrOwner && s.status !== 'cancelled' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={loading || s.status === 'checked_in' || s.status === 'approved' || s.status === 'paid'}
                            onClick={() => { setOverrideModalSession(s); setSelectedNewCoachId(s.currentCoachId); }}
                          >
                            Đổi HLV
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-danger hover:bg-danger-bg" 
                            disabled={loading}
                            onClick={() => handleCancelSession(s)}
                          >
                            Hủy Buổi
                          </Button>
                        </>
                      )}
                      
                      {/* Coach Actions */}
                      {(!isAdminOrOwner) && (s.status === 'pending' || s.status === 'scheduled') && (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          disabled={loading}
                          onClick={() => handleCheckIn(s)}
                        >
                          Check-in
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Coach Modal */}
      <Modal isOpen={!!overrideModalSession} onClose={loading ? () => {} : () => setOverrideModalSession(null)}>
        <ModalHeader title="Xếp HLV dạy thay" onClose={loading ? () => {} : () => setOverrideModalSession(null)} />
        <ModalBody>
          <form id="override-form" onSubmit={handleOverrideCoach} className="flex-col gap-4">
            <p className="text-sm text-secondary mb-4">
              Bạn đang xếp HLV dạy thay cho lớp <strong>{overrideModalSession?.className}</strong> (Giờ: {overrideModalSession?.startTime}).
            </p>
            <Select 
              label="Chọn HLV thay thế *"
              required
              value={selectedNewCoachId}
              onChange={e => setSelectedNewCoachId(e.target.value)}
              options={[
                { value: '', label: '-- Chọn HLV --' },
                ...availableCoaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setOverrideModalSession(null)} disabled={loading}>Hủy</Button>
          <Button type="submit" form="override-form" isLoading={loading} variant="primary">Lưu thay đổi</Button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
