"use client";

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ExportEngine, ExportDefinition } from '@/services/excel/exportEngine';

interface ExportButtonProps {
  data: any[];
  definition: ExportDefinition;
  disabled?: boolean;
}

export function ExportButton({ data, definition, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      if (data.length === 0) {
        alert("Không có dữ liệu để xuất.");
        setIsExporting(false);
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${definition.filenamePrefix}_${dateStr}.xlsx`;
      
      const buffer = ExportEngine.generateExcelFile(data, definition);
      ExportEngine.downloadFile(buffer, filename);
      
    } catch (error) {
      console.error("Export error:", error);
      alert("Đã xảy ra lỗi khi xuất file Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleExport} 
      isLoading={isExporting}
      disabled={disabled || data.length === 0}
      leftIcon={<span className="material-icons-round text-sm">download</span>}
    >
      Export Excel
    </Button>
  );
}
