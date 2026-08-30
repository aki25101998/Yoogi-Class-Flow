import * as XLSX from 'xlsx';

export type FieldType = 'string' | 'number' | 'date' | 'phone' | 'email' | 'enum';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  aliases?: string[];
  enumValues?: string[];
  transform?: (val: string) => any;
  validate?: (val: any) => string | null; // returns error message if invalid
}

export interface ImportDefinition {
  entity: string;
  fields: FieldDefinition[];
  identifyBy: string[]; // e.g., ['external_id'] or ['phone'] or ['name', 'phone']
  templateSheetName: string;
}

export type RowStatus = 'valid' | 'warning' | 'error';

export interface ProcessedRow {
  originalRow: number;
  data: Record<string, any>;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_]+/g, '').trim();
}

function matchColumn(header: string, defs: FieldDefinition[]): string | null {
  const normalized = normalizeHeader(header);
  for (const def of defs) {
    if (normalizeHeader(def.label) === normalized || normalizeHeader(def.key) === normalized) {
      return def.key;
    }
    if (def.aliases) {
      for (const alias of def.aliases) {
        if (normalizeHeader(alias) === normalized) return def.key;
      }
    }
  }
  return null;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel date serial
    const date = new Date((val - (25567 + 2)) * 86400 * 1000); // 25567 is offset, +2 for excel leap year bug
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }
  
  if (typeof val === 'string') {
    // Try DD/MM/YYYY
    let parts = val.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // DD/MM/YYYY or D/M/YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function normalizePhone(val: string): string {
  if (!val) return '';
  return val.toString().replace(/[^0-9+]/g, '');
}

export class ImportEngine {
  
  static parseExcel(fileBuffer: ArrayBuffer): any[] {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // header: 1 returns array of arrays, defval: '' handles empty cells
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    return data;
  }

  static async processFile(
    fileBuffer: ArrayBuffer, 
    definition: ImportDefinition,
    existingRecords: Record<string, any>[] // For duplicate checking against DB
  ): Promise<{
    processed: ProcessedRow[],
    mappedColumns: Record<string, string>
  }> {
    
    const rawData = this.parseExcel(fileBuffer);
    if (!rawData || rawData.length < 2) {
      throw new Error("File Excel không có dữ liệu hoặc sai định dạng.");
    }

    const headers = rawData[0] as string[];
    const rows = rawData.slice(1);

    const mappedColumns: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const matchedKey = matchColumn(h, definition.fields);
      if (matchedKey) {
        mappedColumns[idx.toString()] = matchedKey;
      }
    });

    const processed: ProcessedRow[] = [];
    const internalKeys = new Set<string>(); // to check duplicates within the file

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any[];
      // Skip completely empty rows
      if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;

      const data: Record<string, any> = {};
      
      // Map columns
      headers.forEach((_, idx) => {
        const key = mappedColumns[idx.toString()];
        if (key) {
          data[key] = row[idx] !== undefined ? String(row[idx]).trim() : '';
        }
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate & Normalize
      for (const field of definition.fields) {
        let val = data[field.key];

        if (!val && field.required) {
          errors.push(`Thiếu thông tin: ${field.label}`);
          continue;
        }

        if (val) {
          if (field.type === 'phone') {
            val = normalizePhone(val);
          } else if (field.type === 'date') {
            const parsed = parseDate(val);
            if (!parsed) {
              errors.push(`Định dạng ngày không hợp lệ (${field.label}): ${val}. Yêu cầu: DD/MM/YYYY hoặc YYYY-MM-DD.`);
            }
            val = parsed || val;
          } else if (field.type === 'email') {
            val = val.toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
              errors.push(`Email không hợp lệ: ${val}`);
            }
          } else if (field.type === 'enum' && field.enumValues) {
            if (!field.enumValues.includes(val)) {
              errors.push(`Giá trị không hợp lệ (${field.label}): ${val}. Hỗ trợ: ${field.enumValues.join(', ')}`);
            }
          }

          if (field.transform) {
            val = field.transform(val);
          }
          
          if (field.validate) {
            const err = field.validate(val);
            if (err) errors.push(err);
          }
        }
        data[field.key] = val;
      }

      // Check Duplicates (Internal & Database)
      let identityKey = definition.identifyBy.map(k => String(data[k] || '').toLowerCase()).join('|');
      let isDuplicate = false;

      if (identityKey && identityKey.replace(/\|/g, '') !== '') {
        if (internalKeys.has(identityKey)) {
          isDuplicate = true;
          warnings.push(`Dòng này bị trùng lặp bên trong file Excel.`);
        } else {
          internalKeys.add(identityKey);
        }

        // Check against existing DB records
        const existsInDb = existingRecords.some(rec => {
          return definition.identifyBy.every(k => 
            String(rec[k] || '').toLowerCase() === String(data[k] || '').toLowerCase()
          );
        });

        if (existsInDb) {
          isDuplicate = true;
          warnings.push(`Dòng này đã tồn tại trong hệ thống.`);
        }
      }

      let status: RowStatus = 'valid';
      if (errors.length > 0) status = 'error';
      else if (warnings.length > 0 || isDuplicate) status = 'warning';

      processed.push({
        originalRow: i + 2, // 1-indexed and account for header
        data,
        status,
        errors,
        warnings,
        isDuplicate
      });
    }

    return { processed, mappedColumns };
  }

}
