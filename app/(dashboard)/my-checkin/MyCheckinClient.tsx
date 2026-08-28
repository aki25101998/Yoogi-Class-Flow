'use client';

import { useState } from 'react';
import { useDashboardContext } from '../DashboardProvider';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { checkInSessionAction } from '../dashboard/actions';
import { useQueryClient } from '@tanstack/react-query';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

export default function MyCheckinClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const coachId = context?.membership?.user_id;

  const todayObj = new Date();
  const dateStr = todayObj.toLocaleDateString('en-CA');
  const displayDate = todayObj.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Fetch only sessions for this coach
  const { sessions, isLoading } = useTodaySessions(organizationId, dateStr, coachId);
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['todaySessions', organizationId, dateStr, coachId] });
  };

  const handleCheckIn = async (classId: string) => {
    if (confirm('Xác nhận Check-in cho buổi học này?')) {
      setLoading(true);
      const res = await checkInSessionAction(classId, dateStr, 'checked_in');
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi Check-in');
    }
  };

  if (!coachId) {
    return (
      <div className="flex-col gap-6">
        <PageHeader title="Check-in Hôm Nay" description={displayDate} />
        <Card>
          <CardContent>
            <p className="text-danger">Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Check-in Hôm Nay" 
        description={`Ngày: ${displayDate}`}
      />
      
      <Card>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg text-main">Lịch dạy của bạn ({sessions.length})</h3>
            <Button variant="ghost" size="sm" onClick={handleSuccess} leftIcon={<span className="material-icons-round">refresh</span>}>Làm mới</Button>
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-surface-hover rounded w-full"></div>
              <div className="h-24 bg-surface-hover rounded w-full"></div>
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState 
              title="Không có lịch dạy"
              description="Bạn không có lịch dạy nào trong ngày hôm nay."
              icon="event_busy"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((s: any) => (
                <div key={s.classId + s.startTime} className="bg-surface rounded-md border border-light p-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="bg-primary-light text-primary font-bold px-3 py-1 rounded-md">
                        {s.startTime} - {s.end_time || s.endTime}
                      </div>
                      {s.status === 'checked_in' && <Badge variant="success">Đã Check-in</Badge>}
                      {s.status === 'approved' && <Badge variant="primary">Đã Duyệt</Badge>}
                      {s.status === 'paid' && <Badge variant="primary">Đã Thanh Toán</Badge>}
                      {s.status === 'cancelled' && <Badge variant="danger">Đã Hủy</Badge>}
                      {(s.status === 'pending' || s.status === 'scheduled') && <Badge variant="default">Chưa Check-in</Badge>}
                    </div>
                    
                    <h4 className="font-semibold text-main mb-2 text-lg">{s.className}</h4>
                    <p className="text-sm text-secondary flex items-center gap-2 mb-4">
                      <span className="material-icons-round text-muted" style={{ fontSize: '18px' }}>location_on</span> 
                      {s.venueName}
                    </p>
                    
                    {s.originalCoachId !== s.currentCoachId && (
                      <p className="text-xs text-warning mb-4 p-2 bg-warning-bg rounded-md">
                        Bạn đang dạy thay cho HLV {s.originalCoachName}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-light">
                    {(s.status === 'pending' || s.status === 'scheduled') ? (
                      <Button 
                        variant="primary" 
                        className="w-full"
                        disabled={loading}
                        onClick={() => handleCheckIn(s.classId)}
                        leftIcon={<span className="material-icons-round">check_circle</span>}
                      >
                        Check-in Ngay
                      </Button>
                    ) : (
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        disabled
                        leftIcon={<span className="material-icons-round">check</span>}
                      >
                        Đã Hoàn Thành
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
