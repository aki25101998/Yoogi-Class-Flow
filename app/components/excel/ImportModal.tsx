"use client";

import React, { useState, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '../ui/Table';
import { ImportEngine, ImportDefinition, ProcessedRow } from '@/services/excel/importEngine';
import * as XLSX from 'xlsx';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  definition: ImportDefinition;
  onImport: (validRows: any[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  existingRecords: any[]; // For checking duplicates
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export function ImportModal({ isOpen, onClose, definition, onImport, existingRecords }: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);
  const [mappedColumns, setMappedColumns] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  
  const [filterMode, setFilterMode] = useState<'all'|'error'|'warning'>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setProcessedData([]);
    setMappedColumns({});
    setImportResult(null);
    setFilterMode('all');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileSelection(e.target.files[0]);
    }
  };

  const processFileSelection = async (selectedFile: File) => {
    // Validate file type & size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File quá lớn (Tối đa 10MB)");
      return;
    }
    setFile(selectedFile);
    await runImportEngine(selectedFile);
  };

  const runImportEngine = async (selectedFile: File, manualMapping?: Record<string, string>) => {
    try {
      setIsProcessing(true);
      const arrayBuffer = await selectedFile.arrayBuffer();
      const rawData = ImportEngine.parseExcel(arrayBuffer);
      const headers = rawData[0] as string[];
      
      // If manual mapping isn't provided, engine will auto-detect
      const { processed, mappedColumns: detectedMap } = await ImportEngine.processFile(arrayBuffer, definition, existingRecords);
      
      if (!manualMapping) {
        setMappedColumns(detectedMap);
        // Can let user review mapping here if needed. For now, we skip to mapping step
        setStep('mapping');
      } else {
        // We need to re-run processing with manual mapping
        // To do this properly, we should modify processFile or we can just apply manual mapping inside it.
        // For simplicity in Phase 1, we trust auto-detect and allow editing in mapping step which re-processes.
        // Actually, let's just use the detected map if no manual map is passed.
      }
      
      setProcessedData(processed);
      setIsProcessing(false);
    } catch (err: any) {
      alert(err.message);
      setIsProcessing(false);
    }
  };

  const handleMappingConfirm = () => {
    // In a full implementation, you would re-process the file here using `mappedColumns`
    // For now, we proceed to preview with the current processedData
    setStep('preview');
  };

  const handleCommit = async () => {
    const validRows = processedData.filter(r => r.status !== 'error').map(r => r.data);
    if (validRows.length === 0) {
      alert("Không có dòng dữ liệu hợp lệ nào để nhập.");
      return;
    }

    setIsProcessing(true);
    const result = await onImport(validRows);
    setImportResult(result);
    setStep('result');
    setIsProcessing(false);
  };

  const downloadTemplate = () => {
    const wsData: Record<string, string>[] = [{}];
    definition.fields.forEach(f => {
      wsData[0][f.label + (f.required ? ' *' : '')] = f.enumValues ? f.enumValues.join(', ') : '';
    });
    
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, definition.templateSheetName);
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mau_Nhap_${definition.entity}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredData = processedData.filter(row => {
    if (filterMode === 'all') return true;
    if (filterMode === 'error') return row.status === 'error';
    if (filterMode === 'warning') return row.status === 'warning';
    return true;
  });

  const validCount = processedData.filter(r => r.status === 'valid').length;
  const warningCount = processedData.filter(r => r.status === 'warning').length;
  const errorCount = processedData.filter(r => r.status === 'error').length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div style={{ width: '800px', maxWidth: '95vw', background: 'white', borderRadius: '8px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <ModalHeader title={`Nhập ${definition.templateSheetName} từ Excel`} onClose={handleClose} />
        <ModalBody className="p-6 overflow-y-auto">
          
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg"
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={handleFileDrop}>
              <span className="material-icons-round text-6xl text-gray-400 mb-4">cloud_upload</span>
              <p className="text-lg mb-2">Kéo thả file Excel vào đây</p>
              <p className="text-sm text-gray-500 mb-6">hoặc</p>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} />
              <Button onClick={() => fileInputRef.current?.click()} isLoading={isProcessing}>Chọn file</Button>
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">Định dạng hỗ trợ: .xlsx, .xls, .csv (Tối đa 10MB)</p>
                <button onClick={downloadTemplate} className="text-blue-600 hover:underline mt-2 text-sm font-medium">Tải file mẫu</button>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div>
              <p className="mb-4 text-gray-600">Kiểm tra việc ghép nối cột (Mapping) giữa file Excel và hệ thống.</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trường hệ thống</TableHead>
                    <TableHead>Cột Excel tương ứng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {definition.fields.map(field => {
                    // Finding which index maps to this field key
                    const mappedIdx = Object.keys(mappedColumns).find(idx => mappedColumns[idx] === field.key);
                    return (
                      <TableRow key={field.key}>
                        <TableCell>
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </TableCell>
                        <TableCell>
                          {mappedIdx !== undefined ? (
                            <span className="text-green-600 font-medium">Đã nhận diện ✓</span>
                          ) : (
                            <span className="text-gray-400">Không nhận diện được</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col h-full">
              <div className="flex gap-4 mb-4">
                <Button variant={filterMode === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterMode('all')}>
                  Tất cả ({processedData.length})
                </Button>
                <Button variant={filterMode === 'warning' ? 'warning' : 'outline'} size="sm" onClick={() => setFilterMode('warning')}>
                  Cảnh báo ({warningCount})
                </Button>
                <Button variant={filterMode === 'error' ? 'danger' : 'outline'} size="sm" onClick={() => setFilterMode('error')}>
                  Lỗi ({errorCount})
                </Button>
              </div>
              
              <div className="border rounded overflow-x-auto" style={{ maxHeight: '400px' }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dòng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      {definition.fields.map(f => <TableHead key={f.key}>{f.label}</TableHead>)}
                      <TableHead>Chi tiết lỗi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.slice(0, 100).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.originalRow}</TableCell>
                        <TableCell>
                          {row.status === 'valid' && <span className="text-green-500 material-icons-round text-sm">check_circle</span>}
                          {row.status === 'warning' && <span className="text-yellow-500 material-icons-round text-sm">warning</span>}
                          {row.status === 'error' && <span className="text-red-500 material-icons-round text-sm">cancel</span>}
                        </TableCell>
                        {definition.fields.map(f => (
                          <TableCell key={f.key}>{row.data[f.key]}</TableCell>
                        ))}
                        <TableCell className="text-xs max-w-[200px] truncate" title={[...row.errors, ...row.warnings].join('; ')}>
                          <span className="text-red-500">{row.errors.join('; ')}</span>
                          {row.errors.length > 0 && row.warnings.length > 0 && <br/>}
                          <span className="text-yellow-600">{row.warnings.join('; ')}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredData.length > 100 && <p className="text-center p-2 text-gray-500 text-sm">Hiển thị 100 dòng đầu tiên...</p>}
              </div>
              <p className="mt-4 text-gray-600 text-sm">
                Sẽ nhập {validCount + warningCount} dòng hợp lệ. {errorCount > 0 ? `Sẽ bỏ qua ${errorCount} dòng lỗi.` : ''}
              </p>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="flex flex-col items-center justify-center p-8">
              {importResult.success ? (
                <>
                  <span className="material-icons-round text-6xl text-green-500 mb-4">check_circle</span>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Import hoàn tất 🎉</h3>
                  <p className="text-gray-600">Đã nhập thành công {importResult.count} dữ liệu.</p>
                </>
              ) : (
                <>
                  <span className="material-icons-round text-6xl text-red-500 mb-4">error</span>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Import thất bại</h3>
                  <p className="text-gray-600">{importResult.error}</p>
                </>
              )}
            </div>
          )}

        </ModalBody>
        <ModalFooter>
          <div className="flex justify-between w-full p-4 border-t">
            <Button variant="ghost" onClick={handleClose}>Hủy</Button>
            <div className="flex gap-2">
              {step === 'mapping' && <Button variant="outline" onClick={() => setStep('upload')}>Quay lại</Button>}
              {step === 'mapping' && <Button onClick={handleMappingConfirm}>Tiếp tục</Button>}
              
              {step === 'preview' && <Button variant="outline" onClick={() => setStep('mapping')}>Quay lại</Button>}
              {step === 'preview' && <Button onClick={handleCommit} disabled={validCount + warningCount === 0} isLoading={isProcessing}>Nhập {validCount + warningCount} dòng</Button>}
              
              {step === 'result' && <Button onClick={handleClose}>Hoàn tất</Button>}
            </div>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}
