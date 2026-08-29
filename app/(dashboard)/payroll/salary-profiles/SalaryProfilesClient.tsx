'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '../../DashboardProvider';
import { useSalaryProfiles } from '@/hooks/useSalaryProfiles';
import { useSalaryRules } from '@/hooks/useSalaryRules';
import { useCoaches } from '@/hooks/useCoaches';
import { assignRuleToCoachAction, unassignRuleFromCoachAction } from '../salary-rules/actions';

import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { EmptyState } from '@/app/components/ui/EmptyState';
import SalaryPreview from '../components/SalaryPreview';

import { CALCULATION_TYPE_LABELS, MERGE_MODE_LABELS } from '@/types/salary';
import type { SalaryRule } from '@/types/salary';

export default function SalaryProfilesClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const isAdmin = context?.membership?.role === 'admin' || context?.membership?.role === 'owner';

  const { members } = useCoaches(organizationId);
  const { rules } = useSalaryRules(organizationId);
  const { profiles, isLoading } = useSalaryProfiles(organizationId);
  const queryClient = useQueryClient();

  // Map members to coach list
  const coaches = (members || []).filter((m: any) => m.coaches && m.coaches.length > 0).map((m: any) => ({
    id: m.coaches[0].id,
    name: m.name || m.profiles?.name || 'Unknown',
  }));

  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignCoachId, setAssignCoachId] = useState('');
  const [assignRuleId, setAssignRuleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const coachProfiles = (coaches || []).map((coach: any) => {
    const coachRules = (profiles || [])
      .filter((p: any) => p.coach_id === coach.id)
      .map((p: any) => p.salary_rules)
      .filter(Boolean);

    return { coach, rules: coachRules };
  });

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCoachId || !assignRuleId) return;

    setLoading(true);
    setError('');
    const res = await assignRuleToCoachAction(assignCoachId, assignRuleId);
    setLoading(false);

    if (res.success) {
      setShowAssign(false);
      setAssignCoachId('');
      setAssignRuleId('');
      setSuccess('Đã gán quy tắc lương thành công!');
      setTimeout(() => setSuccess(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['salaryProfiles', organizationId] });
    } else {
      setError(res.error || 'Lỗi gán quy tắc');
    }
  };

  const handleUnassign = async (coachId: string, ruleId: string, ruleName: string) => {
    if (!confirm(`Bạn có chắc muốn gỡ quy tắc "${ruleName}" khỏi HLV này?`)) return;

    setLoading(true);
    const res = await unassignRuleFromCoachAction(coachId, ruleId);
    setLoading(false);

    if (res.success) {
      setSuccess('Đã gỡ quy tắc.');
      setTimeout(() => setSuccess(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['salaryProfiles', organizationId] });
    } else {
      setError(res.error || 'Lỗi');
    }
  };

  const formatMoney = (amount: number) =>
    `${Math.round(amount).toLocaleString('vi-VN')} đ`;

  return (
    <div className="flex-col gap-6">
      <PageHeader
        title="Hồ sơ lương HLV"
        description="Xem và quản lý quy tắc lương được gán cho từng huấn luyện viên"
      />

      {error && <div className="text-danger mb-4 text-sm font-medium">{error}</div>}
      {success && <div className="text-success mb-4 text-sm font-medium">{success}</div>}

      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            onClick={() => setShowAssign(true)}
            leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>link</span>}
          >
            Gán quy tắc cho HLV
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse" style={{ height: '300px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }} />
      ) : coachProfiles.length === 0 ? (
        <EmptyState
          title="Chưa có HLV"
          description="Chưa có huấn luyện viên nào trong hệ thống."
          icon="group"
        />
      ) : (
        <div className="grid gap-4">
          {coachProfiles.map(({ coach, rules: coachRules }: any) => (
            <Card key={coach.id}>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-light pb-3">
                <CardTitle className="text-lg">{coach.name}</CardTitle>
                <Badge variant={coachRules.length > 0 ? 'primary' : 'warning'}>
                  {coachRules.length} quy tắc
                </Badge>
              </CardHeader>
              <CardContent className="pt-3">
                {coachRules.length === 0 ? (
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                    Chưa có quy tắc lương nào được gán. Sử dụng quy tắc cấp tổ chức (nếu có).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {coachRules.map((rule: SalaryRule) => (
                      <div key={rule.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: 'var(--surface-hover)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '14px',
                      }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{rule.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <Badge variant="default">{CALCULATION_TYPE_LABELS[rule.calculation_type]}</Badge>
                            <span>
                              {rule.calculation_type === 'PERCENT_REVENUE'
                                ? `${rule.percentage}%`
                                : rule.calculation_type === 'TIERED_STUDENT_COUNT'
                                ? `${(rule.tiers || ((rule as any).salary_rule_tiers) || []).length} bậc`
                                : formatMoney(Number(rule.amount))}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {rule.effective_from}{rule.effective_to ? ` → ${rule.effective_to}` : ' → ∞'}
                            </span>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnassign(coach.id, rule.id, rule.name)}
                            disabled={loading}
                          >
                            <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--danger)' }}>link_off</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview */}
                {selectedCoachId === coach.id && organizationId && (
                  <div style={{ marginTop: '12px' }}>
                    <SalaryPreview
                      organizationId={organizationId}
                      defaultCoachId={coach.id}
                    />
                  </div>
                )}

                <div style={{ marginTop: '8px' }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCoachId(selectedCoachId === coach.id ? null : coach.id)}
                  >
                    {selectedCoachId === coach.id ? 'Ẩn xem trước' : '🔍 Xem trước lương'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Rule Modal */}
      <Modal isOpen={showAssign} onClose={loading ? () => {} : () => setShowAssign(false)}>
        <ModalHeader title="Gán quy tắc lương cho HLV" onClose={loading ? () => {} : () => setShowAssign(false)} />
        <ModalBody>
          <form id="assign-form" onSubmit={handleAssign} className="flex-col gap-4">
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>HLV *</label>
              <select
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)' }}
                value={assignCoachId}
                onChange={e => setAssignCoachId(e.target.value)}
                required
              >
                <option value="">Chọn HLV</option>
                {(coaches || []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Quy tắc *</label>
              <select
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)' }}
                value={assignRuleId}
                onChange={e => setAssignRuleId(e.target.value)}
                required
              >
                <option value="">Chọn quy tắc</option>
                {(rules || []).filter((r: SalaryRule) => r.status === 'active').map((r: SalaryRule) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({CALCULATION_TYPE_LABELS[r.calculation_type]})
                  </option>
                ))}
              </select>
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setShowAssign(false)} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" form="assign-form" isLoading={loading} variant="primary">
            Gán quy tắc
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
