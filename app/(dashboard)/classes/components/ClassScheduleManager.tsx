'use client';

import { useState } from 'react';
import { 
  addScheduleToClassAction, 
  updateScheduleTimeAction, 
  deleteScheduleFromClassAction 
} from '../actions';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';

const DAYS_OPTIONS = [
  { value: '1', label: 'Thứ 2' },
  { value: '2', label: 'Thứ 3' },
  { value: '3', label: 'Thứ 4' },
  { value: '4', label: 'Thứ 5' },
  { value: '5', label: 'Thứ 6' },
  { value: '6', label: 'Thứ 7' },
  { value: '0', label: 'CN' }
];

export function formatDayOfWeek(day: number) {
  return day === 0 ? 'CN' : `Thứ ${day + 1}`;
}

export function formatClassSchedules(schedules?: any[]) {
  const activeSchedules = (schedules || []).filter((s:any) => s.status === 'active');
  if (activeSchedules.length === 0) return 'Chưa có lịch học';
  const days = activeSchedules.map((s:any) => formatDayOfWeek(s.day_of_week));
  const uniqueDays = Array.from(new Set(days));
  return uniqueDays.join(', ');
}

interface ClassScheduleManagerProps {
  classId: string;
  schedules: any[];
  onSuccess: () => void;
}

export default function ClassScheduleManager({ classId, schedules, onSuccess }: ClassScheduleManagerProps) {
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const [quickAddData, setQuickAddData] = useState({
    days_of_week: [] as number[],
    start_time: '18:00',
    end_time: '19:30',
    effective_from: '',
    effective_until: ''
  });

  const [editScheduleData, setEditScheduleData] = useState({
    day_of_week: 1,
    start_time: '18:00',
    end_time: '19:30',
    effective_from: '',
    effective_until: ''
  });

  const activeSchedules = schedules.filter((s: any) => s.status === 'active').sort((a: any, b: any) => a.day_of_week - b.day_of_week);

  const handleAddSchedule = async () => {
    setScheduleError('');
    setScheduleLoading(true);
    const res = await addScheduleToClassAction({
      class_id: classId,
      ...quickAddData
    });
    setScheduleLoading(false);
    if (res.success) {
      setIsAddingSchedule(false);
      setQuickAddData({
        days_of_week: [],
        start_time: '18:00',
        end_time: '19:30',
        effective_from: '',
        effective_until: ''
      });
      onSuccess();
    } else {
      setScheduleError(res.error || 'Lỗi thêm lịch học');
    }
  };

  const handleUpdateSchedule = async (id: string) => {
    setScheduleError('');
    setScheduleLoading(true);
    const res = await updateScheduleTimeAction(id, editScheduleData);
    setScheduleLoading(false);
    if (res.success) {
      setEditingScheduleId(null);
      onSuccess();
    } else {
      setScheduleError(res.error || 'Lỗi cập nhật lịch học');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa lịch này khỏi lớp?')) return;
    setScheduleLoading(true);
    const res = await deleteScheduleFromClassAction(id);
    setScheduleLoading(false);
    if (res.success) {
      onSuccess();
    } else {
      alert(res.error || 'Lỗi khi xóa');
    }
  };

  const toggleDaySelection = (dayValue: number) => {
    setQuickAddData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayValue)
        ? prev.days_of_week.filter(d => d !== dayValue)
        : [...prev.days_of_week, dayValue]
    }));
  };

  return (
    <div className="border-t border-light pt-6 mt-4">
      <h4 className="font-semibold text-main mb-4">LỊCH HỌC</h4>
      
      {scheduleError && <div className="text-danger text-sm mb-4">{scheduleError}</div>}

      <div className="border border-light rounded-md overflow-hidden bg-background mb-4">
        <div className="flex-col max-h-64 overflow-y-auto">
          {activeSchedules.map((sch: any) => (
            <div key={sch.id} className="border-b border-light last:border-b-0">
              {editingScheduleId === sch.id ? (
                <div className="p-3 bg-surface">
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <Select
                      label="Thứ"
                      value={editScheduleData.day_of_week.toString()}
                      onChange={(e) => setEditScheduleData({...editScheduleData, day_of_week: parseInt(e.target.value)})}
                      options={DAYS_OPTIONS}
                    />
                    <Input
                      label="Bắt đầu"
                      type="time"
                      value={editScheduleData.start_time}
                      onChange={(e) => setEditScheduleData({...editScheduleData, start_time: e.target.value})}
                    />
                    <Input
                      label="Kết thúc"
                      type="time"
                      value={editScheduleData.end_time}
                      onChange={(e) => setEditScheduleData({...editScheduleData, end_time: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingScheduleId(null)}>Hủy</Button>
                    <Button variant="primary" size="sm" isLoading={scheduleLoading} onClick={() => handleUpdateSchedule(sch.id)}>Lưu</Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center p-3 hover:bg-surface transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-16 font-semibold text-main">{formatDayOfWeek(sch.day_of_week)}</div>
                    <div className="text-secondary">{sch.start_time} – {sch.end_time}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Chỉnh sửa"
                      disabled={scheduleLoading}
                      onClick={() => {
                        setEditScheduleData({
                          day_of_week: sch.day_of_week,
                          start_time: sch.start_time,
                          end_time: sch.end_time,
                          effective_from: sch.effective_from || '',
                          effective_until: sch.effective_until || ''
                        });
                        setEditingScheduleId(sch.id);
                        setIsAddingSchedule(false);
                      }}
                    >
                      <span className="material-icons-round text-lg">edit</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Xóa"
                      className="text-danger hover:bg-danger-bg"
                      disabled={scheduleLoading}
                      onClick={() => handleDeleteSchedule(sch.id)}
                    >
                      <span className="material-icons-round text-lg">delete</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {activeSchedules.length === 0 && (
            <div className="p-4 text-center text-muted italic text-sm">Chưa có lịch học nào.</div>
          )}
        </div>
      </div>

      {!isAddingSchedule ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { setIsAddingSchedule(true); setEditingScheduleId(null); }}
          leftIcon={<span className="material-icons-round">add</span>}
        >
          Thêm lịch học
        </Button>
      ) : (
        <div className="bg-surface p-4 rounded-md border border-light">
          <h5 className="font-medium text-sm mb-3">Ngày học trong tuần</h5>
          <div className="flex flex-wrap gap-2 mb-4">
            {DAYS_OPTIONS.map(day => {
              const dayValueNum = parseInt(day.value);
              const isSelected = quickAddData.days_of_week.includes(dayValueNum);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDaySelection(dayValueNum)}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'bg-background text-secondary border border-light hover:bg-surface-hover'}`}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {day.label}
                </button>
              );
            })}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Bắt đầu"
              type="time"
              value={quickAddData.start_time}
              onChange={e => setQuickAddData({...quickAddData, start_time: e.target.value})}
            />
            <Input
              label="Kết thúc"
              type="time"
              value={quickAddData.end_time}
              onChange={e => setQuickAddData({...quickAddData, end_time: e.target.value})}
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" size="sm" onClick={() => setIsAddingSchedule(false)}>Hủy</Button>
            <Button variant="primary" size="sm" isLoading={scheduleLoading} onClick={handleAddSchedule}>Thêm lịch</Button>
          </div>
        </div>
      )}
    </div>
  );
}
