import { ExportDefinition } from "../exportEngine";

export const FinanceExportDef: ExportDefinition = {
  sheetName: 'Thu_Chi',
  filenamePrefix: 'Tai_Chinh',
  columns: [
    { key: 'date', label: 'Ngày', format: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '' },
    { key: 'type', label: 'Loại', format: (v) => v === 'income' ? 'Thu' : 'Chi' },
    { key: 'category', label: 'Danh mục' },
    { key: 'amount', label: 'Số tiền', format: (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v) : '0' },
    { key: 'description', label: 'Mô tả' },
    { key: 'created_by_name', label: 'Người tạo' }
  ]
};
