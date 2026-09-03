'use client';

import { useDashboardContext } from '../DashboardProvider';
import { useMyAttendance } from '@/hooks/useMyAttendance';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import styles from '@/app/styles/page-standard.module.css';

export default function MyAttendanceClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const coachId = context?.coach?.id;

  const { sessions, isLoading } = useMyAttendance(organizationId, coachId);

  if (!coachId) {
    return (
      <div className="flex-col gap-6">
        <PageHeader title="Lịch sử điểm danh" />
        <Card>
          <div className="p-6 text-danger font-medium">
            Bạn chưa được liên kết với hồ sơ HLV nào trong hệ thống.
          </div>
        </Card>
      </div>
    );
  }

  // Lịch sử 30 buổi gần nhất
  const displaySessions = sessions.slice(0, 30);

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Lịch sử điểm danh" 
        description="Lịch sử dạy và tính lương 30 buổi gần nhất"
      />
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-surface-hover rounded w-full"></div>
          <div className="h-12 bg-surface-hover rounded w-full"></div>
          <div className="h-12 bg-surface-hover rounded w-full"></div>
        </div>
      ) : displaySessions.length === 0 ? (
        <EmptyState 
          title="Chưa có dữ liệu điểm danh"
          description="Hệ thống chưa ghi nhận buổi dạy nào của bạn."
          icon="history"
        />
      ) : (
        <div className={styles.listContainer}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Lịch sử điểm danh</h3>
            <span className={styles.sectionCount}>{displaySessions.length} buổi</span>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Ngày</Th>
                    <Th>Lớp</Th>
                    <Th>Trạng thái</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {displaySessions.map((s: any) => (
                    <Tr key={s.id}>
                      <Td className="font-medium text-main">{s.date}</Td>
                      <Td>{s.venue_classes?.name || '---'}</Td>
                      <Td>
                        {s.status === 'checked_in' && <Badge variant="warning">Đã Check-in</Badge>}
                        {s.status === 'approved' && <Badge variant="primary">Đã được duyệt</Badge>}
                        {s.status === 'paid' && <Badge variant="success">Đã thanh toán lương</Badge>}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
