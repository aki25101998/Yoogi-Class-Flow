'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  inviteMemberAction, 
  revokeInvitationAction, 
  removeMemberAction,
  suspendMemberAction,
  reactivateMemberAction,
  changeRoleAction,
  importCoachesBatchAction
} from './actions';
import { OrganizationRole } from '@/types/organization';
import { useCoaches } from '@/hooks/useCoaches';
import { useDashboardContext } from '../DashboardProvider';
import dynamic from 'next/dynamic';
const ImportModal = dynamic(() => import('@/app/components/excel/ImportModal').then(mod => mod.ImportModal), { ssr: false });
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { CoachesImportDef, CoachesExportDef } from '@/services/excel/definitions/coaches.def';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { Table, TableContainer, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { Badge } from '@/app/components/ui/Badge';
import { ChangeRoleModal } from '@/app/components/ui/ChangeRoleModal';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { EmptyState } from '@/app/components/ui/EmptyState';

function CoachSkeleton() {
  return (
    <TableRow className="animate-pulse">
      <TableCell><div className="h-4 bg-surface-hover rounded w-3/4"></div></TableCell>
      <TableCell><div className="h-4 bg-surface-hover rounded w-1/2"></div></TableCell>
      <TableCell><div className="h-6 bg-surface-hover rounded w-20"></div></TableCell>
      <TableCell><div className="h-4 bg-surface-hover rounded w-1/4"></div></TableCell>
      <TableCell><div className="h-8 bg-surface-hover rounded w-24"></div></TableCell>
    </TableRow>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

export default function CoachesClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const currentUserId = context?.membership?.id;

  const { members, invitations, isLoading } = useCoaches(organizationId);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'active' | 'invitations' | 'suspended'>('active');
  const [showImport, setShowImport] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('assistant_coach');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Link-first invitation result state
  const [invitationResult, setInvitationResult] = useState<{ url: string; id: string; expiresAt: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Copy link state for invitation list
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);
  const [editingRoleMember, setEditingRoleMember] = useState<{id: string, name: string, role: OrganizationRole} | null>(null);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['coaches', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['invitations', organizationId] });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInvitationResult(null);
    setCopySuccess(false);
    setCopyError(false);
    setLoading(true);
    const res = await inviteMemberAction(email, role);
    setLoading(false);
    
    if (res.success && res.invitationUrl && res.invitationId && res.expiresAt) {
      setInvitationResult({
        url: res.invitationUrl,
        id: res.invitationId,
        expiresAt: res.expiresAt
      });
      setEmail('');
      handleSuccess();
    } else {
      setError(res.error || 'Lỗi tạo lời mời');
    }
  };

  const handleCopyLink = async (url: string, invId?: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      if (invId) {
        setCopiedInvitationId(invId);
        setTimeout(() => setCopiedInvitationId(null), 2000);
      } else {
        setCopySuccess(true);
        setCopyError(false);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } else {
      if (!invId) {
        setCopyError(true);
        setCopySuccess(false);
      }
    }
  };

  const handleCloseInvitationResult = () => {
    setInvitationResult(null);
    setCopySuccess(false);
    setCopyError(false);
    setIsInviting(false);
  };

  const executeAction = async (actionFn: (id: string) => Promise<any>, id: string, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setLoading(true);
    const res = await actionFn(id);
    if (res.success) handleSuccess();
    else {
      alert(res.error || 'Lỗi hệ thống');
    }
    setLoading(false);
  };

  const executeChangeRole = async (id: string, newRole: OrganizationRole) => {
    setLoading(true);
    const res = await changeRoleAction(id, newRole);
    if (res.success) {
      handleSuccess();
      setEditingRoleMember(null);
    }
    else {
      alert(res.error || 'Lỗi đổi quyền');
    }
    setLoading(false);
  };

  const roleLabels: Record<string, string> = {
    owner: 'Chủ tổ chức',
    admin: 'Quản trị viên',
    head_coach: 'HLV trưởng',
    assistant_coach: 'HLV phụ'
  };

  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  const getInvitationUrl = (invId: string) => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${appUrl}/invite/${invId}`;
  };

  const activeMembers = members.filter((m: any) => m.status === 'active');
  const suspendedMembers = members.filter((m: any) => m.status === 'suspended');

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Huấn luyện viên" 
        description="Quản lý danh sách huấn luyện viên và phân quyền"
        primaryAction={isAdminOrOwner ? (
          <div className="flex gap-2">
            <ExportButton data={activeMembers} definition={CoachesExportDef} />
            <Button 
              variant="outline" 
              onClick={() => setShowImport(true)}
              leftIcon={<span className="material-icons-round">upload_file</span>}
            >
              Import Excel
            </Button>
            <Button 
              onClick={() => { setIsInviting(!isInviting); setInvitationResult(null); setError(''); }}
              leftIcon={<span className="material-icons-round">person_add</span>}
            >
              Mời HLV
            </Button>
          </div>
        ) : (
          <ExportButton data={activeMembers} definition={CoachesExportDef} />
        )}
      />

      {showImport && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          definition={CoachesImportDef}
          existingRecords={members}
          onImport={importCoachesBatchAction}
        />
      )}

      <Modal isOpen={isInviting} onClose={loading ? () => {} : handleCloseInvitationResult}>
        <ModalHeader title={invitationResult ? 'Đã tạo lời mời HLV' : 'Tạo lời mời mới'} onClose={loading ? () => {} : handleCloseInvitationResult} />
        <ModalBody>
          {invitationResult ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className="material-icons-round" style={{ fontSize: '24px', color: 'var(--success)' }}>check_circle</span>
                <h3 style={{ fontWeight: 600, color: 'var(--success)' }}>Thành công!</h3>
              </div>
              
              <p style={{ fontSize: '0.875rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Gửi liên kết này cho HLV để tham gia:
              </p>

              <div style={{
                backgroundColor: 'var(--surface-hover)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                border: '1px solid var(--border-light)',
                wordBreak: 'break-all',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: 'var(--text-main)'
              }}>
                {invitationResult.url}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Button
                  variant={copySuccess ? 'success' : 'primary'}
                  size="sm"
                  onClick={() => handleCopyLink(invitationResult.url)}
                  leftIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>{copySuccess ? 'done' : 'content_copy'}</span>}
                >
                  {copySuccess ? 'Đã sao chép!' : 'Sao chép liên kết'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCloseInvitationResult}>
                  Đóng
                </Button>
              </div>

              {copyError && (
                <div style={{ color: 'var(--warning)', fontSize: '0.875rem', marginBottom: '12px', padding: '8px', backgroundColor: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)' }}>
                  Không thể tự động sao chép. Vui lòng chọn và copy liên kết phía trên thủ công.
                </div>
              )}

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span className="material-icons-round" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span>
                Lời mời có hiệu lực đến {formatExpiryDate(invitationResult.expiresAt)}.
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span className="material-icons-round" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>chat</span>
                Hãy gửi liên kết này cho HLV qua Zalo, Messenger hoặc phương thức liên lạc khác.
              </p>
            </div>
          ) : (
            <div>
              {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 500, padding: '12px', backgroundColor: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
              <form id="invite-form" onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input 
                  label="Email Google"
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
                <Select 
                  label="Vai trò"
                  value={role} 
                  onChange={(e) => setRole(e.target.value as OrganizationRole)}
                  options={[
                    { value: 'assistant_coach', label: 'HLV phụ' },
                    { value: 'head_coach', label: 'HLV trưởng' },
                    ...(currentUserRole === 'owner' ? [{ value: 'admin', label: 'Quản trị viên' }] : [])
                  ]}
                />
              </form>
            </div>
          )}
        </ModalBody>
        {!invitationResult && (
          <ModalFooter>
            <Button variant="secondary" onClick={handleCloseInvitationResult} disabled={loading}>Hủy</Button>
            <Button type="submit" form="invite-form" isLoading={loading} variant="primary">Tạo lời mời</Button>
          </ModalFooter>
        )}
      </Modal>

      {/* Tabs */}
      <div className="flex gap-6 mb-6" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <button 
          onClick={() => setActiveTab('active')} 
          style={{ 
            background: 'none', border: 'none', padding: '0 0 var(--space-3) 0', cursor: 'pointer',
            borderBottom: activeTab === 'active' ? '2px solid var(--primary)' : '2px solid transparent', 
            color: activeTab === 'active' ? 'var(--primary)' : 'var(--text-secondary)', 
            fontWeight: activeTab === 'active' ? 600 : 500 
          }}
        >
          Đang hoạt động ({activeMembers.length})
        </button>
        <button 
          onClick={() => setActiveTab('invitations')} 
          style={{ 
            background: 'none', border: 'none', padding: '0 0 var(--space-3) 0', cursor: 'pointer',
            borderBottom: activeTab === 'invitations' ? '2px solid var(--warning)' : '2px solid transparent', 
            color: activeTab === 'invitations' ? 'var(--warning)' : 'var(--text-secondary)', 
            fontWeight: activeTab === 'invitations' ? 600 : 500 
          }}
        >
          Lời mời ({invitations.length})
        </button>
        <button 
          onClick={() => setActiveTab('suspended')} 
          style={{ 
            background: 'none', border: 'none', padding: '0 0 var(--space-3) 0', cursor: 'pointer',
            borderBottom: activeTab === 'suspended' ? '2px solid var(--danger)' : '2px solid transparent', 
            color: activeTab === 'suspended' ? 'var(--danger)' : 'var(--text-secondary)', 
            fontWeight: activeTab === 'suspended' ? 600 : 500 
          }}
        >
          Đã tạm ngưng ({suspendedMembers.length})
        </button>
      </div>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              {activeTab === 'invitations' ? (
                <TableHead>Hết hạn</TableHead>
              ) : (
                <TableHead>Số lớp phụ trách</TableHead>
              )}
              {isAdminOrOwner && <TableHead className="font-semibold">Hành động</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <CoachSkeleton />
                <CoachSkeleton />
                <CoachSkeleton />
              </>
            ) : (
              <>
                {activeTab === 'active' && activeMembers.length === 0 && (
                  <TableRow><TableCell colSpan={5}><EmptyState title="Chưa có HLV đang hoạt động" description="Không tìm thấy HLV nào trong danh sách." /></TableCell></TableRow>
                )}
                {activeTab === 'suspended' && suspendedMembers.length === 0 && (
                  <TableRow><TableCell colSpan={5}><EmptyState title="Không có HLV nào bị tạm ngưng" description="Danh sách trống." icon="check_circle" /></TableCell></TableRow>
                )}
                {activeTab === 'invitations' && invitations.length === 0 && (
                  <TableRow><TableCell colSpan={5}><EmptyState title="Không có lời mời nào đang chờ" description="Bạn có thể mời HLV mới ở nút phía trên." icon="link" /></TableCell></TableRow>
                )}

                {activeTab === 'active' && activeMembers.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-secondary">{m.email}</TableCell>
                    <TableCell>
                      <Badge variant={m.role === 'owner' || m.role === 'admin' ? 'primary' : 'default'}>
                        {roleLabels[m.role] || m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.classCount} lớp</TableCell>
                    {isAdminOrOwner && (
                      <TableCell>
                        {m.id !== currentUserId && (
                          <div>
                            {currentUserRole === 'owner' && (
                              <button
                                onClick={() => setEditingRoleMember({ id: m.id, name: m.name, role: m.role as OrganizationRole })}
                                className="text-action text-action-primary"
                                disabled={loading}
                              >
                                Chỉnh sửa
                              </button>
                            )}
                            {currentUserRole === 'owner' && (
                              <span className="text-action-separator" aria-hidden="true">|</span>
                            )}
                            <button
                              onClick={() => executeAction(removeMemberAction, m.id, 'Xóa hoàn toàn HLV này?')}
                              className="text-action text-action-danger"
                              disabled={loading}
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {activeTab === 'suspended' && suspendedMembers.map((m: any) => (
                  <TableRow key={m.id} style={{ opacity: 0.7 }}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="text-secondary">{m.email}</TableCell>
                    <TableCell><Badge variant="danger">{roleLabels[m.role] || m.role}</Badge></TableCell>
                    <TableCell>{m.classCount} lớp</TableCell>
                    {isAdminOrOwner && (
                      <TableCell>
                        <Button size="sm" variant="success" onClick={() => executeAction(reactivateMemberAction, m.id, 'Kích hoạt lại HLV này?')} disabled={loading}>Kích hoạt lại</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {activeTab === 'invitations' && invitations.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-secondary">-</TableCell>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell><Badge variant="info">{roleLabels[inv.role] || inv.role}</Badge></TableCell>
                    <TableCell className="text-secondary">
                      {inv.expires_at ? (
                        isExpired(inv.expires_at) ? (
                          <Badge variant="danger">Đã hết hạn</Badge>
                        ) : (
                          formatExpiryDate(inv.expires_at)
                        )
                      ) : '-'}
                    </TableCell>
                    {isAdminOrOwner && (
                      <TableCell>
                        <div className="flex gap-2">
                          {inv.expires_at && !isExpired(inv.expires_at) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyLink(getInvitationUrl(inv.id), inv.id)}
                              disabled={loading}
                              leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>{copiedInvitationId === inv.id ? 'done' : 'content_copy'}</span>}
                            >
                              {copiedInvitationId === inv.id ? 'Đã sao chép' : 'Sao chép link'}
                            </Button>
                          )}
                          <Button size="sm" variant="danger" onClick={() => executeAction(revokeInvitationAction, inv.id, 'Thu hồi lời mời này?')} disabled={loading}>Thu hồi</Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {editingRoleMember && (
        <ChangeRoleModal
          isOpen={!!editingRoleMember}
          onClose={() => setEditingRoleMember(null)}
          currentRole={editingRoleMember.role}
          memberName={editingRoleMember.name}
          onSave={async (newRole) => {
            await executeChangeRole(editingRoleMember.id, newRole);
          }}
          isLoading={loading}
        />
      )}
    </div>
  );
}
