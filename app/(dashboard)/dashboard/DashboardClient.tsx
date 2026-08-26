'use client';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';

export default function DashboardClient({ isAdminOrOwner, stats, context }: any) {
  const currentDate = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Tổng Quan Hệ Thống" 
        description={`Hôm nay: ${currentDate}`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
        
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
            <div style={{ backgroundColor: '#fce4ec', color: '#c2185b', padding: 'var(--space-3)', borderRadius: 'var(--radius-full)', display: 'flex' }}>
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
      </div>

      <Card>
        <CardContent>
          <h3 className="font-semibold text-lg mb-4 text-main">Lịch hôm nay</h3>
          <EmptyState 
            title="Không có lịch dạy"
            description="Hiện không có lịch dạy nào trong ngày hôm nay."
            icon="event_busy"
          />
        </CardContent>
      </Card>
    </div>
  );
}
