'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { previewSalaryAction } from '../salary-rules/actions';
import type { SalaryCalculationResult } from '@/types/salary';
import { CALCULATION_TYPE_LABELS } from '@/types/salary';

interface SalaryPreviewProps {
  organizationId: string;
  defaultVenueId?: string;
  defaultClassId?: string;
  defaultCoachId?: string;
}

export default function SalaryPreview({
  organizationId,
  defaultVenueId,
  defaultClassId,
  defaultCoachId,
}: SalaryPreviewProps) {
  const [studentCount, setStudentCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SalaryCalculationResult | null>(null);
  const [error, setError] = useState('');

  const handlePreview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await previewSalaryAction({
        venueId: defaultVenueId,
        classId: defaultClassId,
        coachId: defaultCoachId,
        studentCount,
      });

      if (res.success && res.result) {
        setResult(res.result);
      } else {
        setError(res.error || 'Lỗi preview');
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    }
    setLoading(false);
  };

  const formatMoney = (amount: number) =>
    `${Math.round(amount).toLocaleString('vi-VN')} đ`;

  return (
    <div style={{
      border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      backgroundColor: 'var(--surface)',
    }}>
      <h4 style={{ fontWeight: '600', marginBottom: '12px', fontSize: '14px', color: 'var(--text-main)' }}>
        🔍 Xem trước lương
      </h4>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <Input
            label="Số học viên có mặt"
            type="number"
            min="0"
            value={studentCount.toString()}
            onChange={e => setStudentCount(Number(e.target.value))}
          />
        </div>
        <Button
          onClick={handlePreview}
          variant="outline"
          size="sm"
          isLoading={loading}
          disabled={loading}
        >
          Tính lương
        </Button>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>
      )}

      {result && (
        <div style={{
          backgroundColor: 'var(--surface-hover)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px',
          fontSize: '13px',
        }}>
          {result.items.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '8px' }}>
              Không có quy tắc lương nào áp dụng.
            </div>
          ) : (
            <>
              {result.items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: idx < result.items.length - 1 ? '1px solid var(--border-light)' : 'none',
                }}>
                  <span>
                    <span style={{ fontWeight: '500' }}>{item.rule_name}</span>
                    <br />
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.details}</span>
                  </span>
                  <span style={{
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    color: item.calculation_type === 'DEDUCTION' ? 'var(--danger)' : 'var(--text-main)',
                  }}>
                    {item.calculation_type === 'DEDUCTION' ? '-' : ''}{formatMoney(item.amount)}
                  </span>
                </div>
              ))}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '8px',
                marginTop: '8px',
                borderTop: '2px solid var(--border)',
                fontWeight: 'bold',
              }}>
                <span>Tổng cộng</span>
                <span style={{ color: 'var(--primary)' }}>{formatMoney(result.final_amount)}</span>
              </div>

              {result.minimum_applied && (
                <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
                  ⚠ Đã áp dụng lương tối thiểu: {formatMoney(result.minimum_salary || 0)}
                </div>
              )}
              {result.maximum_applied && (
                <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px' }}>
                  ⚠ Đã áp dụng lương tối đa: {formatMoney(result.maximum_salary || 0)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
