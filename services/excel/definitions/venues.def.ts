import { ImportDefinition } from "../importEngine";
import { ExportDefinition } from "../exportEngine";

export const VenuesImportDef: ImportDefinition = {
  entity: 'venues',
  templateSheetName: 'Dia_Diem',
  identifyBy: ['name'],
  fields: [
    {
      key: 'name',
      label: 'Tên địa điểm',
      type: 'string',
      required: true,
      aliases: ['Tên', 'Venue Name']
    },
    {
      key: 'address',
      label: 'Địa chỉ',
      type: 'string',
      aliases: ['Address']
    },
    {
      key: 'note',
      label: 'Ghi chú',
      type: 'string',
      aliases: ['Notes']
    },
    {
      key: 'external_id',
      label: 'Mã địa điểm (External ID)',
      type: 'string',
      aliases: ['Mã ĐĐ', 'Venue ID']
    }
  ]
};

export const VenuesExportDef: ExportDefinition = {
  sheetName: 'Danh_Sach_Dia_Diem',
  filenamePrefix: 'Dia_Diem',
  columns: [
    { key: 'name', label: 'Tên địa điểm' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'note', label: 'Ghi chú' },
    { key: 'status', label: 'Trạng thái', format: (v) => v === 'active' ? 'Đang hoạt động' : 'Tạm dừng' },
    { key: 'created_at', label: 'Ngày tạo', format: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '' }
  ]
};
