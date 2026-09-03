'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveAttendanceAction } from './actions';
import { useAttendance, AttendanceSessionInfo } from '@/hooks/useAttendance';
import { useDashboardContext } from '../DashboardProvider';
import { getBusinessDateString } from '@/utils/date';
import dynamic from 'next/dynamic';
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { AttendanceExportDef } from '@/services/excel/definitions/attendance.def';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import styles from '@/app/styles/page-standard.module.css';

export default function AttendanceClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(getBusinessDateString());
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number | ''>('');
  
  const { sessions, isLoading: isFetching } = useAttendance(organizationId, selectedDate);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedSession: AttendanceSessionInfo | undefined = typeof selectedSessionIdx === 'number' ? sessions[selectedSessionIdx] : undefined;

  useEffect(() => {
    setSelectedSessionIdx('');
  }, [selectedDate, sessions.length]);

  useEffect(() => {
    if (!selectedSession) {
      setAttendanceRecords([]);
      return;
    }
    
    if (selectedSession.attendanceRecords && selectedSession.attendanceRecords.length > 0) {
      // If we have DB records, use them but ensure all students in class are represented
      // so if a student enrolled after the attendance was taken, they show up as 'pending'
      const existingMap = new Map(selectedSession.attendanceRecords.map(r => [r.student_id, r]));
      
      const mergedRecords = selectedSession.students.map(s => {
        const existing = existingMap.get(s.student_id);
        return existing || {
          student_id: s.student_id,
          status: 'pending',
          note: ''
        };
      });
      setAttendanceRecords(mergedRecords);
    } else {
      // Default to all pending
      const defaultRecords = selectedSession.students.map(s => ({
        student_id: s.student_id,
        status: 'pending',
        note: ''
      }));
      setAttendanceRecords(defaultRecords);
    }
  }, [selectedSession]);

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, status } : r));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceRecords(prev => prev.map(r => r.student_id === studentId ? { ...r, note } : r));
  };

  const handleMarkAllPresent = () => {
    setAttendanceRecords(prev => prev.map(r => r.status === 'pending' ? { ...r, status: 'present' } : r));
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!selectedSession || !selectedDate) return;
    
    setLoading(true);
    const res = await saveAttendanceAction(
      selectedSession.sessionId as string,
      attendanceRecords
    );
    setLoading(false);
    
    if (res.success) {
      setSuccess('Đã lưu điểm danh!');
      setTimeout(() => setSuccess(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['attendanceData', organizationId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['todaySessions'] }); // also invalidate dashboard
    } else {
      setError(res.error || 'Lỗi khi lưu điểm danh');
    }
  };

  const exportData = selectedSession ? attendanceRecords.map(r => {
    const student = selectedSession.students.find((s:any) => s.student_id === r.student_id);
    return {
      studentName: student?.name || '',
      className: selectedSession.className,
      date: selectedDate,
      status: r.status,
      note: r.note
    };
  }) : [];

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Điểm danh" 
        description="Quản lý điểm danh hàng ngày của các lớp học"
        primaryAction={
          <ExportButton data={exportData} definition={AttendanceExportDef} disabled={!selectedSession || attendanceRecords.length === 0} />
        }
      />

      {isFetching ? (
        <Card className="animate-pulse">
          <CardContent className="h-20 bg-surface-hover rounded-md"></CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Input 
                label="Ngày"
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)} 
              />
            </div>
            <div className="flex-1 w-full">
              <Select 
                label="Ca học"
                value={selectedSessionIdx} 
                onChange={e => setSelectedSessionIdx(e.target.value === '' ? '' : Number(e.target.value))}
                options={[
                  { value: '', label: '-- Chọn ca học --' },
                  ...sessions.map((s, idx) => ({ 
                    value: String(idx), 
                    label: `${s.className} (${s.startTime || '??'}-${s.endTime || '??'}) ${s.status === 'cancelled' ? '[Đã hủy]' : ''}` 
                  }))
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {error && <div className="text-danger text-sm font-medium">{error}</div>}
      {success && <div className="text-success text-sm font-medium">{success}</div>}

      {selectedSession ? (
        <div className={styles.listContainer}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Danh sách học viên ({selectedSession.students.length})</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllPresent}
              disabled={selectedSession.students.length === 0}
              leftIcon={<span className="material-icons-round">done_all</span>}
            >
              Tất cả có mặt
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Học viên</Th>
                  <Th>Trạng thái</Th>
                  <Th>Ghi chú</Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedSession.students.length === 0 ? (
                  <Tr>
                    <Td colSpan={3} className="text-center text-muted italic py-8">
                      Lớp chưa có học viên.
                    </Td>
                  </Tr>
                ) : (
                  selectedSession.students.map((student: any) => {
                    const record = attendanceRecords.find(r => r.student_id === student.student_id);
                    if (!record) return null;
                    
                    return (
                      <Tr key={student.student_id}>
                        <Td className="font-medium text-main">{student.name}</Td>
                        <Td>
                          <Select 
                            value={record.status} 
                            onChange={(e) => handleStatusChange(student.student_id, e.target.value)}
                            options={[
                              { value: 'pending', label: 'Chưa điểm danh' },
                              { value: 'present', label: 'Có mặt' },
                              { value: 'absent', label: 'Vắng' },
                              { value: 'excused', label: 'Có phép' },
                              { value: 'late', label: 'Đi muộn' }
                            ]}
                          />
                        </Td>
                        <Td>
                          <Input 
                            type="text" 
                            placeholder="Ghi chú..." 
                            value={record.note} 
                            onChange={(e) => handleNoteChange(student.student_id, e.target.value)}
                          />
                        </Td>
                      </Tr>
                    )
                  })
                )}
              </Tbody>
            </Table>
          </div>
          <div className="p-4 bg-surface-hover border-t border-light flex justify-between items-center">
            {!selectedSession.sessionId && (
              <span className="text-sm text-warning font-medium flex items-center gap-1">
                <span className="material-icons-round text-warning text-base">info</span>
                Bạn cần báo cáo Check-in hoặc Chọn trạng thái cho ca học trước khi điểm danh.
              </span>
            )}
            <div className={!selectedSession.sessionId ? "" : "ml-auto"}>
              <Button 
                onClick={handleSave} 
                disabled={!selectedSession.sessionId || selectedSession.students.length === 0 || loading || selectedSession.status === 'cancelled'} 
                isLoading={loading}
                variant="primary"
                leftIcon={<span className="material-icons-round">save</span>}
                title={!selectedSession.sessionId ? "Bạn cần Check-in ca học này trước khi điểm danh" : ""}
              >
                Lưu Điểm Danh
              </Button>
            </div>
          </div>
        </Card>
        </div>
      ) : (
        <EmptyState 
          title="Chưa chọn ca học" 
          description="Vui lòng chọn ngày và ca học để tiến hành điểm danh." 
          icon="event_available"
        />
      )}
    </div>
  );
}
