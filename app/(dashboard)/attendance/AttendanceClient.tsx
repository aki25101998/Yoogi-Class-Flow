'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveAttendanceAction } from './actions';
import { useAttendance } from '@/hooks/useAttendance';
import { useDashboardContext } from '../DashboardProvider';
import { getBusinessDateString } from '@/utils/date';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';

export default function AttendanceClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(getBusinessDateString());
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const { classes, allStudentAttendance, isLoading: isFetching } = useAttendance(organizationId, selectedDate);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedClass = classes.find((c: any) => c.id === selectedClassId);

  useEffect(() => {
    if (!selectedClassId) {
      setAttendanceRecords([]);
      return;
    }
    
    // Check if we have existing attendance for this date and class
    const existingLog = allStudentAttendance.find((a: any) => a.class_id === selectedClassId && a.date === selectedDate);
    
    if (existingLog && existingLog.records) {
      setAttendanceRecords(existingLog.records);
    } else {
      // Default to all present
      if (selectedClass && selectedClass.class_students) {
        const defaultRecords = selectedClass.class_students.map((cs: any) => ({
          student_id: cs.student_id,
          status: 'pending', // pending, present, absent, excused
          note: ''
        }));
        setAttendanceRecords(defaultRecords);
      }
    }
  }, [selectedClassId, selectedDate, allStudentAttendance, selectedClass]);

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
    if (!selectedClassId || !selectedDate) return;
    
    setLoading(true);
    const res = await saveAttendanceAction(selectedClassId, selectedDate, attendanceRecords);
    setLoading(false);
    if (res.success) {
      setSuccess('Đã lưu điểm danh!');
      setTimeout(() => setSuccess(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['studentAttendance', organizationId] });
    } else {
      setError(res.error || 'Lỗi khi lưu điểm danh');
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Điểm danh" 
        description="Quản lý điểm danh hàng ngày của các lớp học"
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
                label="Lớp học"
                value={selectedClassId} 
                onChange={e => setSelectedClassId(e.target.value)}
                options={[
                  { value: '', label: '-- Chọn lớp --' },
                  ...classes.map((c: any) => ({ value: c.id, label: `${c.name} (${c.start_time}-${c.end_time})` }))
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {error && <div className="text-danger text-sm font-medium">{error}</div>}
      {success && <div className="text-success text-sm font-medium">{success}</div>}

      {selectedClassId ? (
        <Card>
          <div className="overflow-x-auto">
            <div className="flex justify-between items-center p-4 border-b border-light">
              <h3 className="font-semibold text-main">Danh sách học viên ({selectedClass?.class_students?.length || 0})</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleMarkAllPresent}
                disabled={selectedClass?.class_students?.length === 0}
                leftIcon={<span className="material-icons-round">done_all</span>}
              >
                Tất cả có mặt
              </Button>
            </div>
            <Table>
              <Thead>
                <Tr>
                  <Th>Học viên</Th>
                  <Th>Trạng thái</Th>
                  <Th>Ghi chú</Th>
                </Tr>
              </Thead>
              <Tbody>
                {selectedClass?.class_students?.length === 0 ? (
                  <Tr>
                    <Td colSpan={3} className="text-center text-muted italic py-8">
                      Lớp chưa có học viên.
                    </Td>
                  </Tr>
                ) : (
                  selectedClass?.class_students?.map((cs: any) => {
                    const record = attendanceRecords.find(r => r.student_id === cs.student_id);
                    if (!record) return null;
                    
                    return (
                      <Tr key={cs.student_id}>
                        <Td className="font-medium text-main">{cs.students?.name}</Td>
                        <Td>
                          <Select 
                            value={record.status} 
                            onChange={(e) => handleStatusChange(cs.student_id, e.target.value)}
                            options={[
                              { value: 'pending', label: 'Chưa điểm danh' },
                              { value: 'present', label: 'Có mặt' },
                              { value: 'absent', label: 'Vắng' },
                              { value: 'excused', label: 'Có phép' }
                            ]}
                          />
                        </Td>
                        <Td>
                          <Input 
                            type="text" 
                            placeholder="Ghi chú..." 
                            value={record.note} 
                            onChange={(e) => handleNoteChange(cs.student_id, e.target.value)}
                          />
                        </Td>
                      </Tr>
                    )
                  })
                )}
              </Tbody>
            </Table>
          </div>
          <div className="p-4 bg-surface-hover border-t border-light flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={selectedClass?.class_students?.length === 0 || loading} 
              isLoading={loading}
              variant="primary"
              leftIcon={<span className="material-icons-round">save</span>}
            >
              Lưu Điểm Danh
            </Button>
          </div>
        </Card>
      ) : (
        <EmptyState 
          title="Chưa chọn lớp" 
          description="Vui lòng chọn ngày và lớp học để tiến hành điểm danh." 
          icon="event_available"
        />
      )}
    </div>
  );
}
