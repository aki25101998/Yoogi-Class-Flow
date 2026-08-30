import { ImportDefinition } from "../importEngine";
import { ExportDefinition } from "../exportEngine";

export const CoachesImportDef: ImportDefinition = {
  entity: 'coaches',
  templateSheetName: 'HLV',
  identifyBy: ['phone', 'name'],
  fields: [
    {
      key: 'name',
      label: 'Họ tên',
      type: 'string',
      required: true,
    },
    {
      key: 'phone',
      label: 'Số điện thoại',
      type: 'phone',
      aliases: ['SĐT', 'Điện thoại', 'Phone', 'Phone Number']
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email'
    },
    {
      key: 'dob',
      label: 'Ngày sinh',
      type: 'date',
    },
    {
      key: 'gender',
      label: 'Giới tính',
      type: 'enum',
      enumValues: ['Nam', 'Nữ', 'Khác', 'Male', 'Female', 'Other'],
    },
    {
      key: 'address',
      label: 'Địa chỉ',
      type: 'string',
    },
    {
      key: 'level',
      label: 'Chuyên môn',
      type: 'string',
    },
    {
      key: 'cccd',
      label: 'CCCD',
      type: 'string',
      aliases: ['CMND', 'ID Card']
    },
    {
      key: 'membership_number',
      label: 'Số thẻ thành viên',
      type: 'string',
    },
    {
      key: 'note',
      label: 'Ghi chú',
      type: 'string',
    },
    {
      key: 'external_id',
      label: 'Mã HLV (External ID)',
      type: 'string',
      aliases: ['Mã HLV', 'Coach ID']
    }
  ]
};

export const CoachesExportDef: ExportDefinition = {
  sheetName: 'Danh_Sach_HLV',
  filenamePrefix: 'HLV',
  columns: [
    { key: 'name', label: 'Họ tên' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'email', label: 'Email' },
    { key: 'level', label: 'Chuyên môn' },
    { key: 'status', label: 'Trạng thái', format: (v) => v === 'active' ? 'Đang làm việc' : 'Đã nghỉ' },
    { key: 'created_at', label: 'Ngày tạo', format: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '' }
  ]
};
