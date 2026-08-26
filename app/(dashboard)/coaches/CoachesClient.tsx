'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  inviteMemberAction, 
  revokeInvitationAction, 
  removeMemberAction,
  suspendMemberAction,
  reactivateMemberAction,
  changeRoleAction
} from './actions';
import { OrganizationRole } from '@/types/organization';
import { useCoaches } from '@/hooks/useCoaches';
import { useDashboardContext } from '../DashboardProvider';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { Table, TableContainer, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { Badge } from '@/app/components/ui/Badge';
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
    if (!confirm(`Bạn có chắc muốn đổi vai trò thành ${newRole}?`)) return;
    setLoading(true);
    const res = await changeRoleAction(id, newRole);
    if (res.success) handleSuccess();
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
          <Button 
            onClick={() => { setIsInviting(!isInviting); setInvitationResult(null); setError(''); }}
            leftIcon={<span className="material-icons-round">person_add</span>}
          >
            Mời HLV
          </Button>
        ) : undefined}
      />

      {isInviting && isAdminOrOwner && (
        <Card className="mb-6">
          <CardContent>
            {/* Invitation Result — Link display */}
            {invitationResult ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-icons-round text-success" style={{ fontSize: '24px' }}>check_circle</span>
                  <h3 className="font-semibold" style={{ color: 'var(--success)' }}>Đã tạo lời mời HLV</h3>
                </div>
                
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Gửi liên kết này cho HLV để tham gia:
                </p>

                <div style={{
                  backgroundColor: 'var(--surface-hover)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                  border: '1px solid var(--border-light)',
                  wordBreak: 'break-all',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)'
                }}>
                  {invitationResult.url}
                </div>

                <div className="flex gap-3 items-center flex-wrap mb-4">
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
                  <div className="text-warning text-sm mb-3 p-2 bg-warning/10 rounded">
                    Không thể tự động sao chép. Vui lòng chọn và copy liên kết phía trên thủ công.
                  </div>
                )}

                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="material-icons-round" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span>
                  Lời mời có hiệu lực đến {formatExpiryDate(invitationResult.expiresAt)}.
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span className="material-icons-round" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>chat</span>
                  Hãy gửi liên kết này cho HLV qua Zalo, Messenger hoặc phương thức liên lạc khác.
                </p>
              </div>
            ) : (
              /* Invitation form */
              <div>
                <h3 className="font-semibold mb-4">Tạo lời mời mới</h3>
                {error && <div className="text-warning mb-4 text-sm font-medium p-3 bg-warning/10 rounded">{error}</div>}
                <form onSubmit={handleInvite} className="flex gap-4 items-end flex-wrap">
                  <div style={{ flex: '1 1 250px' }}>
                    <Input 
                      label="Email Google"
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
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
                  </div>
                  <Button type="submit" isLoading={loading} variant="success">
                    Tạo lời mời
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              {isAdminOrOwner && <TableHead>Hành động</TableHead>}
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
                    <TableCell className="font-medium">{m.profiles?.name || '-'}</TableCell>
                    <TableCell className="text-secondary">{m.profiles?.email || '-'}</TableCell>
                    <TableCell>
                      {isAdminOrOwner && m.id !== currentUserId && currentUserRole === 'owner' ? (
                         <Select 
                            value={m.role} 
                            onChange={(e) => executeChangeRole(m.id, e.target.value as OrganizationRole)}
                            disabled={loading}
                            options={[
                              { value: 'assistant_coach', label: 'HLV phụ' },
                              { value: 'head_coach', label: 'HLV trưởng' },
                              { value: 'admin', label: 'Quản trị viên' },
                              { value: 'owner', label: 'Chủ tổ chức' }
                            ]}
                          />
                      ) : (
                        <Badge variant={m.role === 'owner' || m.role === 'admin' ? 'primary' : 'default'}>
                          {roleLabels[m.role] || m.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{m.classCount} lớp</TableCell>
                    {isAdminOrOwner && (
                      <TableCell>
                        {m.id !== currentUserId && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="warning" onClick={() => executeAction(suspendMemberAction, m.id, 'Tạm ngưng HLV này?')} disabled={loading}>Tạm ngưng</Button>
                            <Button size="sm" variant="danger" onClick={() => executeAction(removeMemberAction, m.id, 'Xóa hoàn toàn HLV này?')} disabled={loading}>Xóa</Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {activeTab === 'suspended' && suspendedMembers.map((m: any) => (
                  <TableRow key={m.id} style={{ opacity: 0.7 }}>
                    <TableCell>{m.profiles?.name || '-'}</TableCell>
                    <TableCell className="text-secondary">{m.profiles?.email || '-'}</TableCell>
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
    </div>
  );
}
