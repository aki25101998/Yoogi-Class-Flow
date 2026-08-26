'use client';

import { useState } from 'react';
import { 
  inviteMemberAction, 
  revokeInvitationAction, 
  removeMemberAction,
  suspendMemberAction,
  reactivateMemberAction,
  changeRoleAction
} from './actions';
import { OrganizationRole } from '@/types/organization';

export default function CoachesClient({ initialMembers, initialInvitations, currentUserRole, currentUserId }: any) {
  const [activeTab, setActiveTab] = useState<'active' | 'invitations' | 'suspended'>('active');
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('assistant_coach');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await inviteMemberAction(email, role);
    setLoading(false);
    if (res.success) {
      setIsInviting(false);
      setEmail('');
      window.location.reload();
    } else {
      setError(res.error || 'Lỗi gửi lời mời');
    }
  };

  const executeAction = async (actionFn: (id: string) => Promise<any>, id: string, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setLoading(true);
    const res = await actionFn(id);
    if (res.success) window.location.reload();
    else {
      alert(res.error || 'Lỗi hệ thống');
      setLoading(false);
    }
  };

  const executeChangeRole = async (id: string, newRole: OrganizationRole) => {
    if (!confirm(`Bạn có chắc muốn đổi vai trò thành ${newRole}?`)) return;
    setLoading(true);
    const res = await changeRoleAction(id, newRole);
    if (res.success) window.location.reload();
    else {
      alert(res.error || 'Lỗi đổi quyền');
      setLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    owner: 'Chủ tổ chức',
    admin: 'Quản trị viên',
    head_coach: 'HLV trưởng',
    assistant_coach: 'HLV phụ'
  };

  const activeMembers = initialMembers.filter((m: any) => m.status === 'active');
  const suspendedMembers = initialMembers.filter((m: any) => m.status === 'suspended');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Huấn luyện viên</h1>
        {isAdminOrOwner && (
          <button 
            onClick={() => setIsInviting(!isInviting)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', backgroundColor: '#6200ea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Mời HLV
          </button>
        )}
      </div>

      {isInviting && isAdminOrOwner && (
        <div style={{ marginBottom: '24px', padding: '24px', borderRadius: '8px', backgroundColor: 'var(--surface-color)', boxShadow: 'var(--card-shadow)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Gửi lời mời mới</h3>
          {error && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 250px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Email Google</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Vai trò</label>
              <select value={role} onChange={(e) => setRole(e.target.value as OrganizationRole)} style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
                <option value="assistant_coach">HLV phụ (Assistant Coach)</option>
                <option value="head_coach">HLV trưởng (Head Coach)</option>
                {currentUserRole === 'owner' && <option value="admin">Quản trị viên (Admin)</option>}
              </select>
            </div>
            <div>
              <button type="submit" disabled={loading} style={{ padding: '10px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                {loading ? 'Đang gửi...' : 'Gửi lời mời'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <div onClick={() => setActiveTab('active')} style={{ cursor: 'pointer', paddingBottom: '12px', borderBottom: activeTab === 'active' ? '2px solid #6200ea' : 'none', color: activeTab === 'active' ? '#6200ea' : 'var(--text-secondary)', fontWeight: activeTab === 'active' ? 600 : 400 }}>
          Đang hoạt động ({activeMembers.length})
        </div>
        <div onClick={() => setActiveTab('invitations')} style={{ cursor: 'pointer', paddingBottom: '12px', borderBottom: activeTab === 'invitations' ? '2px solid #f59e0b' : 'none', color: activeTab === 'invitations' ? '#f59e0b' : 'var(--text-secondary)', fontWeight: activeTab === 'invitations' ? 600 : 400 }}>
          Lời mời ({initialInvitations.length})
        </div>
        <div onClick={() => setActiveTab('suspended')} style={{ cursor: 'pointer', paddingBottom: '12px', borderBottom: activeTab === 'suspended' ? '2px solid #ef4444' : 'none', color: activeTab === 'suspended' ? '#ef4444' : 'var(--text-secondary)', fontWeight: activeTab === 'suspended' ? 600 : 400 }}>
          Đã tạm ngưng ({suspendedMembers.length})
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '8px', boxShadow: 'var(--card-shadow)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Tên</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Vai trò</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Số lớp phụ trách</th>
              {isAdminOrOwner && <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Hành động</th>}
            </tr>
          </thead>
          <tbody>
            {activeTab === 'active' && activeMembers.length === 0 && <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có HLV đang hoạt động</td></tr>}
            {activeTab === 'suspended' && suspendedMembers.length === 0 && <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Không có HLV nào bị tạm ngưng</td></tr>}
            {activeTab === 'invitations' && initialInvitations.length === 0 && <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Không có lời mời nào đang chờ</td></tr>}

            {activeTab === 'active' && activeMembers.map((m: any) => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px', fontWeight: 500 }}>{m.profiles?.name || '-'}</td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{m.profiles?.email || '-'}</td>
                <td style={{ padding: '16px' }}>
                  {isAdminOrOwner && m.id !== currentUserId && currentUserRole === 'owner' ? (
                     <select 
                        value={m.role} 
                        onChange={(e) => executeChangeRole(m.id, e.target.value as OrganizationRole)}
                        disabled={loading}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                      >
                        <option value="assistant_coach">HLV phụ</option>
                        <option value="head_coach">HLV trưởng</option>
                        <option value="admin">Quản trị viên</option>
                        <option value="owner">Chủ tổ chức</option>
                      </select>
                  ) : (
                    <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-color)', fontSize: '14px' }}>
                      {roleLabels[m.role] || m.role}
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px' }}>{m.classCount} lớp</td>
                {isAdminOrOwner && (
                  <td style={{ padding: '16px' }}>
                    {m.id !== currentUserId && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => executeAction(suspendMemberAction, m.id, 'Tạm ngưng HLV này?')} disabled={loading} style={{ padding: '4px 8px', fontSize: '13px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Tạm ngưng</button>
                        <button onClick={() => executeAction(removeMemberAction, m.id, 'Xóa hoàn toàn HLV này?')} disabled={loading} style={{ padding: '4px 8px', fontSize: '13px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {activeTab === 'suspended' && suspendedMembers.map((m: any) => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.7 }}>
                <td style={{ padding: '16px' }}>{m.profiles?.name || '-'}</td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{m.profiles?.email || '-'}</td>
                <td style={{ padding: '16px' }}>{roleLabels[m.role] || m.role}</td>
                <td style={{ padding: '16px' }}>{m.classCount} lớp</td>
                {isAdminOrOwner && (
                  <td style={{ padding: '16px' }}>
                    <button onClick={() => executeAction(reactivateMemberAction, m.id, 'Kích hoạt lại HLV này?')} disabled={loading} style={{ padding: '4px 8px', fontSize: '13px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Kích hoạt lại</button>
                  </td>
                )}
              </tr>
            ))}

            {activeTab === 'invitations' && initialInvitations.map((inv: any) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>-</td>
                <td style={{ padding: '16px' }}>{inv.email}</td>
                <td style={{ padding: '16px' }}>{roleLabels[inv.role] || inv.role}</td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>-</td>
                {isAdminOrOwner && (
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => executeAction(revokeInvitationAction, inv.id, 'Thu hồi lời mời này?')} disabled={loading} style={{ padding: '4px 8px', fontSize: '13px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Thu hồi</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
