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
      <ModalHeader title={`Nhập ${definition.templateSheetName} từ Excel`} onClose={handleClose} />
      <ModalBody className="p-6 overflow-y-auto">
        
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center w-full">
            <div 
              className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--surface-hover)] hover:border-[var(--primary)] hover:bg-[var(--primary-bg)] transition-all cursor-pointer"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--primary)]', 'bg-[var(--primary-bg)]'); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary-bg)]'); }}
              onDrop={(e) => { 
                e.preventDefault(); 
                e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary-bg)]');
                handleFileDrop(e);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-icons-round text-5xl text-[var(--primary)] opacity-80 mb-4">cloud_upload</span>
              
              {file ? (
                <div className="text-center">
                  <p className="text-base font-semibold text-[var(--text-main)] flex items-center justify-center gap-2">
                    <span className="material-icons-round text-[var(--success)] text-xl">check_circle</span>
                    {file.name}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <p className="text-sm text-[var(--primary)] font-medium mt-3 hover:underline">Nhấn hoặc kéo thả để đổi file</p>
                </div>
              ) : (
                <>
                  <p className="text-base font-medium text-[var(--text-main)] mb-1">Kéo thả file Excel vào đây</p>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">hoặc</p>
                  <Button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} isLoading={isProcessing}>Chọn file</Button>
                  <p className="mt-4 text-xs text-[var(--text-muted)]">Hỗ trợ .xlsx, .xls, .csv</p>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx, .xls, .csv" className="hidden" />
            </div>

            <div className="mt-6 w-full flex justify-center">
              <Button variant="ghost" size="sm" onClick={downloadTemplate} leftIcon={<span className="material-icons-round text-[var(--primary)]">download</span>}>
                Tải file mẫu
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text-secondary)]">Kiểm tra việc ghép nối cột (Mapping) giữa file Excel và hệ thống.</p>
            <div className="border border-[var(--border-light)] rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trường hệ thống</TableHead>
                    <TableHead>Cột Excel tương ứng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {definition.fields.map(field => {
                    const mappedIdx = Object.keys(mappedColumns).find(idx => mappedColumns[idx] === field.key);
                    return (
                      <TableRow key={field.key}>
                        <TableCell>
                          <span className="font-medium text-[var(--text-main)]">{field.label}</span> {field.required && <span className="text-[var(--danger)]">*</span>}
                        </TableCell>
                        <TableCell>
                          {mappedIdx !== undefined ? (
                            <span className="text-[var(--success)] font-medium flex items-center gap-1">
                              <span className="material-icons-round text-sm">check_circle</span> Đã nhận diện
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">Không nhận diện được</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col h-full gap-4">
            <div className="flex gap-2 flex-wrap">
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
            
            <div className="border border-[var(--border-light)] rounded-lg overflow-x-auto" style={{ maxHeight: '400px' }}>
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
                      <TableCell className="text-[var(--text-secondary)]">{row.originalRow}</TableCell>
                      <TableCell>
                        {row.status === 'valid' && <span className="text-[var(--success)] material-icons-round text-lg">check_circle</span>}
                        {row.status === 'warning' && <span className="text-[var(--warning)] material-icons-round text-lg">warning</span>}
                        {row.status === 'error' && <span className="text-[var(--danger)] material-icons-round text-lg">cancel</span>}
                      </TableCell>
                      {definition.fields.map(f => (
                        <TableCell key={f.key} className="text-[var(--text-main)]">{row.data[f.key]}</TableCell>
                      ))}
                      <TableCell className="text-xs max-w-[200px] truncate" title={[...row.errors, ...row.warnings].join('; ')}>
                        <span className="text-[var(--danger)]">{row.errors.join('; ')}</span>
                        {row.errors.length > 0 && row.warnings.length > 0 && <br/>}
                        <span className="text-[var(--warning)]">{row.warnings.join('; ')}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredData.length > 100 && <p className="text-center p-3 text-[var(--text-muted)] text-sm bg-[var(--surface-hover)]">Hiển thị 100 dòng đầu tiên...</p>}
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">
              Sẽ nhập {validCount + warningCount} dòng hợp lệ. {errorCount > 0 ? `Sẽ bỏ qua ${errorCount} dòng lỗi.` : ''}
            </p>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            {importResult.success ? (
              <>
                <span className="material-icons-round text-6xl text-[var(--success)] mb-4">check_circle</span>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Import hoàn tất 🎉</h3>
                <p className="text-[var(--text-secondary)]">Đã nhập thành công <strong className="text-[var(--text-main)]">{importResult.count}</strong> dữ liệu.</p>
              </>
            ) : (
              <>
                <span className="material-icons-round text-6xl text-[var(--danger)] mb-4">error</span>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Import thất bại</h3>
                <p className="text-[var(--danger)] bg-[var(--danger-bg)] p-3 rounded-md text-sm mt-2">{importResult.error}</p>
              </>
            )}
          </div>
        )}

      </ModalBody>
      <ModalFooter>
        <div className="flex justify-between items-center w-full">
          <Button variant="ghost" onClick={handleClose}>Hủy</Button>
          <div className="flex gap-2">
            {step === 'upload' && <Button onClick={() => runImportEngine(file!)} disabled={!file} isLoading={isProcessing}>Tiếp tục</Button>}
            {step === 'mapping' && <Button variant="outline" onClick={() => setStep('upload')}>Quay lại</Button>}
            {step === 'mapping' && <Button onClick={handleMappingConfirm}>Tiếp tục</Button>}
            
            {step === 'preview' && <Button variant="outline" onClick={() => setStep('mapping')}>Quay lại</Button>}
            {step === 'preview' && <Button onClick={handleCommit} disabled={validCount + warningCount === 0} isLoading={isProcessing}>Nhập {validCount + warningCount} dòng</Button>}
            
            {step === 'result' && <Button onClick={handleClose}>Hoàn tất</Button>}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
