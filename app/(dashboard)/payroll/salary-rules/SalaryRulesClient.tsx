'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '../../DashboardProvider';
import { useSalaryRules } from '@/hooks/useSalaryRules';
import {
  createSalaryRuleAction,
  deactivateSalaryRuleAction,
} from './actions';

import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { EmptyState } from '@/app/components/ui/EmptyState';

import type { SalaryRule, CreateSalaryRuleInput, CalculationType, ScopeType, MergeMode, CreateTierInput } from '@/types/salary';
import {
  CALCULATION_TYPE_LABELS,
  SCOPE_TYPE_LABELS,
  MERGE_MODE_LABELS,
  CLASS_TYPE_LABELS,
  COACH_ROLE_LABELS,
} from '@/types/salary';

import { useCoaches } from '@/hooks/useCoaches';
// Note: useCoaches returns { members } with coach data nested inside
import { useVenues } from '@/hooks/useVenues';
import { useClasses } from '@/hooks/useClasses';

const DEFAULT_FORM: CreateSalaryRuleInput = {
  name: '',
  description: '',
  calculation_type: 'FIXED_PER_SESSION',
  scope_type: 'ORGANIZATION',
  merge_mode: 'ADD',
  priority: 10,
  amount: 0,
  effective_from: new Date().toISOString().split('T')[0],
};

export default function SalaryRulesClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const isAdmin = context?.membership?.role === 'admin' || context?.membership?.role === 'owner';

  const { rules, isLoading } = useSalaryRules(organizationId);
  const { members } = useCoaches(organizationId);
  const { venues } = useVenues(organizationId);
  const { classes } = useClasses(organizationId);
  const queryClient = useQueryClient();

  // Map members to coach list for selectors
  const coaches = (members || []).filter((m: any) => m.coaches && m.coaches.length > 0).map((m: any) => ({
    id: m.coaches[0].id,
    name: m.name || m.profiles?.name || 'Unknown',
  }));

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateSalaryRuleInput>({ ...DEFAULT_FORM });
  const [tiers, setTiers] = useState<CreateTierInput[]>([{ min_students: 1, max_students: 5, amount: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const filteredRules = rules.filter((r: SalaryRule) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên quy tắc.');
      return;
    }

    setLoading(true);
    setError('');

    const input: CreateSalaryRuleInput = {
      ...form,
      tiers: form.calculation_type === 'TIERED_STUDENT_COUNT' ? tiers : undefined,
    };

    const res = await createSalaryRuleAction(input);
    setLoading(false);

    if (res.success) {
      setShowCreate(false);
      setForm({ ...DEFAULT_FORM });
      setTiers([{ min_students: 1, max_students: 5, amount: 0 }]);
      setSuccess('Đã tạo quy tắc lương thành công!');
      setTimeout(() => setSuccess(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['salaryRules', organizationId] });
    } else {
      setError(res.error || 'Lỗi tạo quy tắc');
    }
  };

  const handleDeactivate = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Bạn có chắc muốn vô hiệu hóa quy tắc "${ruleName}"?`)) return;

    setLoading(true);
    const res = await deactivateSalaryRuleAction(ruleId);
    setLoading(false);

    if (res.success) {
      setSuccess('Đã vô hiệu hóa quy tắc.');
      setTimeout(() => setSuccess(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['salaryRules', organizationId] });
    } else {
      setError(res.error || 'Lỗi');
    }
  };

  const updateForm = (updates: Partial<CreateSalaryRuleInput>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  // Auto-set priority based on scope
  const handleScopeChange = (scopeType: ScopeType) => {
    const priorityMap: Record<ScopeType, number> = {
      ORGANIZATION: 10,
      VENUE: 20,
      CLASS: 30,
      COACH: 40,
      COACH_ROLE: 25,
      CLASS_TYPE: 25,
    };
    updateForm({ scope_type: scopeType, priority: priorityMap[scopeType] });
  };

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    setTiers([...tiers, {
      min_students: (lastTier?.max_students || 0) + 1,
      max_students: (lastTier?.max_students || 0) + 5,
      amount: 0,
    }]);
  };

  const removeTier = (idx: number) => {
    setTiers(tiers.filter((_, i) => i !== idx));
  };

  const updateTier = (idx: number, updates: Partial<CreateTierInput>) => {
    setTiers(tiers.map((t, i) => i === idx ? { ...t, ...updates } : t));
  };

  const formatMoney = (amount: number) =>
    `${Math.round(amount).toLocaleString('vi-VN')} đ`;

  const getScopeDisplay = (rule: SalaryRule) => {
    switch (rule.scope_type) {
      case 'VENUE':
        return rule.scope_venue?.name || rule.scope_venue_id || '—';
      case 'CLASS':
        return rule.scope_class?.name || rule.scope_class_id || '—';
      case 'COACH':
        return (rule.scope_coach as any)?.name || rule.scope_coach_id || '—';
      case 'COACH_ROLE':
        return rule.scope_coach_role ? COACH_ROLE_LABELS[rule.scope_coach_role] : '—';
      case 'CLASS_TYPE':
        return rule.scope_class_type ? CLASS_TYPE_LABELS[rule.scope_class_type] : '—';
      default:
        return 'Toàn tổ chức';
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader
        title="Quy tắc lương"
        description="Cấu hình các quy tắc tính lương cho huấn luyện viên"
      />

      {error && <div className="text-danger mb-4 text-sm font-medium">{error}</div>}
      {success && <div className="text-success mb-4 text-sm font-medium">{success}</div>}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['active', 'inactive', 'all'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'active' ? 'Đang hoạt động' : f === 'inactive' ? 'Đã vô hiệu' : 'Tất cả'}
            </Button>
          ))}
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            onClick={() => setShowCreate(true)}
            leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}
          >
            Thêm quy tắc
          </Button>
        )}
      </div>

      {/* Rules list */}
      {isLoading ? (
        <Card>
          <CardContent>
            <div className="animate-pulse" style={{ height: '200px', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }} />
          </CardContent>
        </Card>
      ) : filteredRules.length === 0 ? (
        <EmptyState
          title="Chưa có quy tắc lương"
          description="Tạo quy tắc lương đầu tiên để bắt đầu cấu hình hệ thống tính lương linh hoạt."
          icon="rule"
        />
      ) : (
        <Card>
          <CardContent style={{ padding: 0 }}>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Tên</Th>
                    <Th>Loại</Th>
                    <Th>Phạm vi</Th>
                    <Th>Đối tượng</Th>
                    <Th className="text-right">Số tiền</Th>
                    <Th>Ưu tiên</Th>
                    <Th>Hiệu lực</Th>
                    <Th>Trạng thái</Th>
                    {isAdmin && <Th className="text-right">Thao tác</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredRules.map((rule: SalaryRule) => (
                    <Tr key={rule.id}>
                      <Td>
                        <div style={{ fontWeight: '500' }}>{rule.name}</div>
                        {rule.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {rule.description}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <Badge variant="default">
                          {CALCULATION_TYPE_LABELS[rule.calculation_type]}
                        </Badge>
                      </Td>
                      <Td>
                        <span style={{ fontSize: '12px' }}>
                          {SCOPE_TYPE_LABELS[rule.scope_type]}
                        </span>
                      </Td>
                      <Td>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>
                          {getScopeDisplay(rule)}
                        </span>
                      </Td>
                      <Td className="text-right" style={{ fontWeight: '500' }}>
                        {rule.calculation_type === 'PERCENT_REVENUE'
                          ? `${rule.percentage}%`
                          : rule.calculation_type === 'TIERED_STUDENT_COUNT'
                          ? `${(rule.tiers || []).length} bậc`
                          : formatMoney(Number(rule.amount))
                        }
                      </Td>
                      <Td>
                        <Badge variant="default">{rule.priority}</Badge>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          {MERGE_MODE_LABELS[rule.merge_mode]}
                        </span>
                      </Td>
                      <Td style={{ fontSize: '12px' }}>
                        {rule.effective_from}
                        {rule.effective_to ? ` → ${rule.effective_to}` : ' → ∞'}
                      </Td>
                      <Td>
                        <Badge variant={rule.status === 'active' ? 'success' : 'warning'}>
                          {rule.status === 'active' ? 'Hoạt động' : 'Đã tắt'}
                        </Badge>
                      </Td>
                      {isAdmin && (
                        <Td className="text-right">
                          {rule.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeactivate(rule.id, rule.name)}
                              disabled={loading}
                            >
                              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--danger)' }}>
                                block
                              </span>
                            </Button>
                          )}
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Rule Modal */}
      <Modal isOpen={showCreate} onClose={loading ? () => {} : () => setShowCreate(false)}>
        <ModalHeader
          title="Tạo quy tắc lương mới"
          onClose={loading ? () => {} : () => setShowCreate(false)}
        />
        <ModalBody>
          <form id="create-rule-form" onSubmit={handleCreate} className="flex-col gap-4">
            <Input
              label="Tên quy tắc *"
              placeholder="VD: HLV Trưởng — Chi nhánh Quận 1"
              value={form.name}
              onChange={e => updateForm({ name: e.target.value })}
              required
            />

            <Input
              label="Mô tả"
              placeholder="Mô tả chi tiết quy tắc"
              value={form.description || ''}
              onChange={e => updateForm({ description: e.target.value })}
            />

            {/* Calculation Type */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-main)' }}>
                Loại tính lương *
              </label>
              <select
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', fontSize: '14px',
                  backgroundColor: 'var(--surface)', color: 'var(--text-main)',
                }}
                value={form.calculation_type}
                onChange={e => updateForm({ calculation_type: e.target.value as CalculationType })}
              >
                {Object.entries(CALCULATION_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Scope */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-main)' }}>
                Phạm vi áp dụng *
              </label>
              <select
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', fontSize: '14px',
                  backgroundColor: 'var(--surface)', color: 'var(--text-main)',
                }}
                value={form.scope_type}
                onChange={e => handleScopeChange(e.target.value as ScopeType)}
              >
                {Object.entries(SCOPE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Scope target selectors */}
            {form.scope_type === 'VENUE' && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Chi nhánh</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)' }}
                  value={form.scope_venue_id || ''}
                  onChange={e => updateForm({ scope_venue_id: e.target.value || undefined })}
                >
                  <option value="">Chọn chi nhánh</option>
                  {(venues || []).map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.scope_type === 'CLASS' && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Lớp</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)' }}
                  value={form.scope_class_id || ''}
                  onChange={e => updateForm({ scope_class_id: e.target.value || undefined })}
                >
                  <option value="">Chọn lớp</option>
                  {(classes || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.scope_type === 'COACH' && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>HLV</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)' }}
                  value={form.scope_coach_id || ''}
                  onChange={e => updateForm({ scope_coach_id: e.target.value || undefined })}
                >
                  <option value="">Chọn HLV</option>
                  {(coaches || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.scope_type === 'COACH_ROLE' && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Vai trò HLV</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)' }}
                  value={form.scope_coach_role || ''}
                  onChange={e => updateForm({ scope_coach_role: (e.target.value || undefined) as any })}
                >
                  <option value="">Chọn vai trò</option>
                  {Object.entries(COACH_ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {form.scope_type === 'CLASS_TYPE' && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Loại lớp</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)' }}
                  value={form.scope_class_type || ''}
                  onChange={e => updateForm({ scope_class_type: (e.target.value || undefined) as any })}
                >
                  <option value="">Chọn loại lớp</option>
                  {Object.entries(CLASS_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            {form.calculation_type !== 'TIERED_STUDENT_COUNT' && form.calculation_type !== 'PERCENT_REVENUE' && (
              <Input
                label="Số tiền (đ) *"
                type="number"
                min="0"
                required
                value={form.amount.toString()}
                onChange={e => updateForm({ amount: Number(e.target.value) })}
              />
            )}

            {/* Percentage for PERCENT_REVENUE */}
            {form.calculation_type === 'PERCENT_REVENUE' && (
              <Input
                label="Phần trăm (%) *"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={(form.percentage || 0).toString()}
                onChange={e => updateForm({ percentage: Number(e.target.value) })}
              />
            )}

            {/* Tiers for TIERED_STUDENT_COUNT */}
            {form.calculation_type === 'TIERED_STUDENT_COUNT' && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Bậc học viên
                </label>
                {tiers.map((tier, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <Input
                      label=""
                      type="number"
                      min="0"
                      placeholder="Từ"
                      value={tier.min_students.toString()}
                      onChange={e => updateTier(idx, { min_students: Number(e.target.value) })}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    <Input
                      label=""
                      type="number"
                      min="0"
                      placeholder="Đến"
                      value={(tier.max_students || '').toString()}
                      onChange={e => updateTier(idx, { max_students: e.target.value ? Number(e.target.value) : undefined })}
                    />
                    <Input
                      label=""
                      type="number"
                      min="0"
                      placeholder="Số tiền"
                      value={tier.amount.toString()}
                      onChange={e => updateTier(idx, { amount: Number(e.target.value) })}
                    />
                    {tiers.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTier(idx)}>
                        <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--danger)' }}>close</span>
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={addTier}>
                  + Thêm bậc
                </Button>
              </div>
            )}

            {/* Merge Mode */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Chế độ kết hợp</label>
              <select
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: 'var(--surface)' }}
                value={form.merge_mode}
                onChange={e => updateForm({ merge_mode: e.target.value as MergeMode })}
              >
                {Object.entries(MERGE_MODE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {form.merge_mode === 'ADD' ? 'Cộng thêm vào quy tắc khác cùng loại.' : 'Thay thế quy tắc cùng loại có priority thấp hơn.'}
              </div>
            </div>

            {/* Priority */}
            <Input
              label="Độ ưu tiên"
              type="number"
              min="1"
              max="100"
              value={form.priority.toString()}
              onChange={e => updateForm({ priority: Number(e.target.value) })}
            />

            {/* Min / Max */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Lương tối thiểu (đ)"
                type="number"
                min="0"
                value={(form.minimum_salary || '').toString()}
                onChange={e => updateForm({ minimum_salary: e.target.value ? Number(e.target.value) : undefined })}
              />
              <Input
                label="Lương tối đa (đ)"
                type="number"
                min="0"
                value={(form.maximum_salary || '').toString()}
                onChange={e => updateForm({ maximum_salary: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>

            {/* Effective Period */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Hiệu lực từ *"
                type="date"
                required
                value={form.effective_from}
                onChange={e => updateForm({ effective_from: e.target.value })}
              />
              <Input
                label="Hiệu lực đến"
                type="date"
                value={form.effective_to || ''}
                onChange={e => updateForm({ effective_to: e.target.value || undefined })}
              />
            </div>

            {/* Day conditions */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                Điều kiện ngày (tùy chọn)
              </label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, idx) => {
                  const selected = (form.condition_days_of_week || []).includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selected ? 'var(--primary-light)' : 'var(--surface)',
                        color: selected ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: selected ? '600' : '400',
                      }}
                      onClick={() => {
                        const current = form.condition_days_of_week || [];
                        updateForm({
                          condition_days_of_week: selected
                            ? current.filter(d => d !== idx)
                            : [...current, idx],
                        });
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time conditions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Từ giờ"
                type="time"
                value={form.condition_start_time || ''}
                onChange={e => updateForm({ condition_start_time: e.target.value || undefined })}
              />
              <Input
                label="Đến giờ"
                type="time"
                value={form.condition_end_time || ''}
                onChange={e => updateForm({ condition_end_time: e.target.value || undefined })}
              />
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" form="create-rule-form" isLoading={loading} variant="primary">
            Tạo quy tắc
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
