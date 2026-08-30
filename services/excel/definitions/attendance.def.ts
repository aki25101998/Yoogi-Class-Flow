import { ExportDefinition } from "../exportEngine";

export const AttendanceExportDef: ExportDefinition = {
  sheetName: 'Diem_Danh',
  filenamePrefix: 'Diem_Danh',
  columns: [
    { key: 'studentName', label: 'Tên học viên' },
    { key: 'className', label: 'Lớp học' },
    { key: 'date', label: 'Ngày', format: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '' },
    { key: 'status', label: 'Trạng thái', format: (v) => {
        if (v === 'present') return 'Có mặt';
        if (v === 'absent') return 'Vắng mặt';
        if (v === 'late') return 'Đi trễ';
        if (v === 'excused') return 'Có phép';
        return v;
    }},
    { key: 'note', label: 'Ghi chú' }
  ]
};
