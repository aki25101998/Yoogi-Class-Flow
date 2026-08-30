import { ExportDefinition } from "../exportEngine";

export const ClassesExportDef: ExportDefinition = {
  sheetName: 'Danh_Sach_Lop',
  filenamePrefix: 'Lop_Hoc',
  columns: [
    { key: 'name', label: 'Tên lớp' },
    { key: 'venueName', label: 'Địa điểm' },
    { key: 'coachName', label: 'HLV phụ trách' },
    { key: 'tuition_fee', label: 'Học phí', format: (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '0' },
    { key: 'studentCount', label: 'Số lượng học viên' },
    { key: 'status', label: 'Trạng thái', format: (v) => v === 'active' ? 'Đang hoạt động' : 'Đã đóng' },
    { key: 'created_at', label: 'Ngày tạo', format: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '' }
  ]
};
