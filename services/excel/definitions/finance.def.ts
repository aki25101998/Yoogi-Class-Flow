import { ExportDefinition } from "../exportEngine";

export const FinanceExportDef: ExportDefinition = {
  sheetName: 'Thu_Chi',
  filenamePrefix: 'Tai_Chinh',
  columns: [
    { key: 'date', label: 'Ngày', format: (v) => v || '' },
    { key: 'type', label: 'Loại', format: (v) => v === 'income' ? 'Thu (+)' : 'Chi (-)' },
    { key: 'venue', label: 'Cơ sở', format: (_, row) => row.venues?.name || 'Chung toàn trung tâm' },
    { key: 'parent_category', label: 'Nhóm danh mục', format: (v, row) => v || row.category || 'Khác' },
    { key: 'sub_category', label: 'Hạng mục chi tiết', format: (v, row) => v || row.category || 'Khác' },
    { key: 'payment_method', label: 'Phương thức', format: (v) => v === 'cash' ? 'Tiền mặt' : v === 'bank_transfer' ? 'Chuyển khoản' : 'Khác' },
    { key: 'amount', label: 'Số tiền (VNĐ)', format: (v) => v ? Number(v).toLocaleString('vi-VN') : '0' },
    { key: 'description', label: 'Mô tả' },
    { key: 'source_type', label: 'Nguồn', format: (v) => v === 'MANUAL' ? 'Thủ công' : v === 'TUITION_PAYMENT' ? 'Học phí' : v === 'PAYROLL_PAYMENT' ? 'Lương' : (v || 'Hệ thống') }
  ]
};
