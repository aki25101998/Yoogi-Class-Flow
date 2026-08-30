import * as XLSX from 'xlsx';

export interface ExportColumnDef {
  key: string;
  label: string;
  format?: (val: any, row: any) => any;
}

export interface ExportDefinition {
  sheetName: string;
  filenamePrefix: string;
  columns: ExportColumnDef[];
}

export class ExportEngine {
  
  static generateExcelFile(data: any[], definition: ExportDefinition): ArrayBuffer {
    const formattedData = data.map(row => {
      const out: Record<string, any> = {};
      for (const col of definition.columns) {
        let val = row[col.key];
        if (col.format) {
          val = col.format(val, row);
        }
        out[col.label] = val;
      }
      return out;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    
    // Auto adjust column widths based on content
    const colWidths = definition.columns.map(col => {
      let maxLen = col.label.length;
      formattedData.forEach(row => {
        const valStr = String(row[col.label] || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(maxLen + 2, 50) }; // cap at 50 chars width
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, definition.sheetName);

    // write as array buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return excelBuffer;
  }
  
  static downloadFile(buffer: ArrayBuffer, filename: string) {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

}
