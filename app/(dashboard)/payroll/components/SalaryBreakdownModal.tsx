'use client';

import { Modal, ModalHeader, ModalBody } from '@/app/components/ui/Modal';
import { Badge } from '@/app/components/ui/Badge';
import type { SalarySnapshot } from '@/types/salary';
import { CALCULATION_TYPE_LABELS } from '@/types/salary';

interface SalaryBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: SalarySnapshot | null;
  sessionDate?: string;
  className?: string;
  coachName?: string;
  status?: string;
}

export default function SalaryBreakdownModal({
  isOpen,
  onClose,
  snapshot,
  sessionDate,
  className: clsName,
  coachName,
  status,
}: SalaryBreakdownModalProps) {
  if (!snapshot) return null;

  const formatMoney = (amount: number) =>
    `${Math.round(amount).toLocaleString('vi-VN')} đ`;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        title="Chi tiết tính lương"
        onClose={onClose}
      />
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '12px',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
          }}>
            {coachName && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>HLV: </span>
                <strong>{coachName}</strong>
              </div>
            )}
            {clsName && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Lớp: </span>
                <strong>{clsName}</strong>
              </div>
            )}
            {sessionDate && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Ngày: </span>
                <strong>{sessionDate}</strong>
              </div>
            )}
            {status && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Trạng thái: </span>
                <Badge variant={
                  status === 'paid' ? 'success' :
                  status === 'approved' ? 'primary' :
                  status === 'checked_in' ? 'warning' : 'default'
                }>
                  {status === 'paid' ? 'Đã thanh toán' :
                   status === 'approved' ? 'Đã duyệt' :
                   status === 'checked_in' ? 'Chờ duyệt' : status}
                </Badge>
              </div>
            )}
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Học viên có mặt: </span>
              <strong>{snapshot.context.students_present}</strong>
            </div>
            {snapshot.context.coach_role && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Vai trò: </span>
                <strong>{snapshot.context.coach_role === 'HEAD_COACH' ? 'HLV Trưởng' : 'HLV Phụ'}</strong>
              </div>
            )}
          </div>

          {/* Breakdown table */}
          <div style={{
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-hover)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>
                    Quy tắc
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>
                    Loại
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13px', fontWeight: '600', borderBottom: '1px solid var(--border-light)' }}>
                    Số tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rules.map((rule, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 12px', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>{rule.rule_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {rule.details}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                      <Badge variant="default">
                        {CALCULATION_TYPE_LABELS[rule.calculation_type] || rule.calculation_type}
                      </Badge>
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      fontWeight: '500',
                      fontSize: '14px',
                      color: rule.calculation_type === 'DEDUCTION' ? 'var(--danger)' : 'var(--text-main)',
                    }}>
                      {rule.calculation_type === 'DEDUCTION' ? '-' : ''}{formatMoney(rule.amount)}
                    </td>
                  </tr>
                ))}

                {snapshot.rules.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Không có quy tắc lương nào được áp dụng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Lương cơ bản</span>
              <span>{formatMoney(snapshot.subtotal)}</span>
            </div>
            {snapshot.bonuses > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--success)' }}>+ Thưởng</span>
                <span style={{ color: 'var(--success)' }}>{formatMoney(snapshot.bonuses)}</span>
              </div>
            )}
            {snapshot.allowances > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--info)' }}>+ Phụ cấp</span>
                <span style={{ color: 'var(--info)' }}>{formatMoney(snapshot.allowances)}</span>
              </div>
            )}
            {snapshot.deductions > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--danger)' }}>- Khấu trừ</span>
                <span style={{ color: 'var(--danger)' }}>-{formatMoney(snapshot.deductions)}</span>
              </div>
            )}
            {snapshot.minimum_applied && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontStyle: 'italic' }}>
                <span style={{ color: 'var(--warning)' }}>⚠ Áp dụng lương tối thiểu</span>
                <span>{formatMoney(snapshot.minimum_salary || 0)}</span>
              </div>
            )}
            {snapshot.maximum_applied && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontStyle: 'italic' }}>
                <span style={{ color: 'var(--warning)' }}>⚠ Áp dụng lương tối đa</span>
                <span>{formatMoney(snapshot.maximum_salary || 0)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '8px',
              marginTop: '8px',
              borderTop: '2px solid var(--border)',
              fontWeight: 'bold',
              fontSize: '16px',
            }}>
              <span>Tổng cộng</span>
              <span style={{ color: 'var(--primary)' }}>{formatMoney(snapshot.final_amount)}</span>
            </div>
          </div>

          {/* Engine version */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
            Salary Engine v{snapshot.engine_version} • {new Date(snapshot.calculated_at).toLocaleString('vi-VN')}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
