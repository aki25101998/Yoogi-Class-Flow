import { ExportDefinition } from "../exportEngine";

export const PayrollExportDef: ExportDefinition = {
  sheetName: 'Bang_Luong',
  filenamePrefix: 'Bang_Luong',
  columns: [
    { key: 'period', label: 'Kỳ lương' },
    { key: 'coachName', label: 'Huấn luyện viên' },
    { key: 'total_classes', label: 'Số buổi dạy' },
    { key: 'base_salary', label: 'Lương cơ bản', format: (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '0' },
    { key: 'allowance', label: 'Phụ cấp', format: (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '0' },
    { key: 'bonus', label: 'Thưởng', format: (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '0' },
    { key: 'deduction', label: 'Khấu trừ', format: (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '0' },
    { key: 'total_salary', label: 'Tổng nhận', format: (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '0' },
    { key: 'status', label: 'Trạng thái', format: (v) => {
        if (v === 'draft') return 'Nháp';
        if (v === 'approved') return 'Đã duyệt';
        if (v === 'paid') return 'Đã thanh toán';
        return v;
    }}
  ]
};
