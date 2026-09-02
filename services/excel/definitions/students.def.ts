import { ImportDefinition } from "../importEngine";
import { ExportDefinition } from "../exportEngine";
import { ExportColumnDef } from "../exportEngine";

export const StudentsImportDef: ImportDefinition = {
  entity: 'students',
  templateSheetName: 'Students',
  identifyBy: ['phone', 'name'], // If they don't have external_id, fallback to phone + name
  fields: [
    {
      key: 'name',
      label: 'Họ tên',
      type: 'string',
      required: true,
      aliases: ['Tên', 'Tên học viên', 'Tên bé', 'Name', 'Full Name', 'Student Name']
    },
    {
      key: 'phone',
      label: 'Số điện thoại',
      type: 'phone',
      aliases: ['SĐT', 'Điện thoại', 'Phone', 'Phone Number']
    },
    {
      key: 'parent_name',
      label: 'Tên phụ huynh',
      type: 'string',
      aliases: ['Phụ huynh']
    },
    {
      key: 'parent_phone',
      label: 'SĐT phụ huynh',
      type: 'phone',
    },
    {
      key: 'dob',
      label: 'Ngày sinh',
      type: 'date',
      required: true,
      aliases: ['DOB', 'Date of Birth', 'Birth Date', 'Ngày sinh bé']
    },
    {
      key: 'venue_name',
      label: 'Tên địa điểm học',
      type: 'string',
      required: true,
      aliases: ['Địa điểm học', 'Cơ sở', 'Venue', 'Chi nhánh']
    },
    {
      key: 'gender',
      label: 'Giới tính',
      type: 'enum',
      enumValues: ['Nam', 'Nữ', 'Khác', 'Male', 'Female', 'Other'],
      aliases: ['Giới tính bé', 'Sex']
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email'
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
      label: 'Mã học viên (External ID)',
      type: 'string',
      aliases: ['Mã HV', 'ID', 'Student ID']
    }
  ]
};

export const StudentsExportDef: ExportDefinition = {
  sheetName: 'Danh_Sach_Hoc_Vien',
  filenamePrefix: 'Hoc_Vien',
  columns: [
    { key: 'name', label: 'Họ tên' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'dob', label: 'Ngày sinh' },
    { key: 'gender', label: 'Giới tính' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'email', label: 'Email' },
    { key: 'parent_name', label: 'Tên phụ huynh' },
    { key: 'parent_phone', label: 'SĐT phụ huynh' },
    { key: 'status', label: 'Trạng thái', format: (v) => v === 'active' ? 'Đang học' : 'Đã nghỉ' },
    { key: 'created_at', label: 'Ngày tạo', format: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '' }
  ]
};
