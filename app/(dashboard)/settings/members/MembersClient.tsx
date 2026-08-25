'use client';

import { useState } from 'react';
import { inviteMemberAction, revokeInvitationAction, removeMemberAction } from './actions';
import { OrganizationRole } from '@/types/organization';

export default function MembersClient({ initialMembers, initialInvitations, currentUserRole, currentUserId }: any) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('assistant_coach');
  const [error, setError] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await inviteMemberAction(email, role);
    if (res.success) {
      setIsInviting(false);
      setEmail('');
      // In a real app, refresh data here
      alert('Đã gửi lời mời thành công!');
      window.location.reload();
    } else {
      setError(res.error || 'Lỗi gửi lời mời');
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Bạn có chắc muốn thu hồi lời mời này?')) {
      await revokeInvitationAction(id);
      window.location.reload();
    }
  };

  const handleRemove = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa thành viên này?')) {
      const res = await removeMemberAction(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error || 'Lỗi khi xóa thành viên');
      }
    }
  };

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Danh sách thành viên</h2>
        {isAdminOrOwner && (
          <button 
            onClick={() => setIsInviting(true)}
            style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Mời thành viên
          </button>
        )}
      </div>

      {isInviting && (
        <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>Gửi lời mời</h3>
          {error && <div style={{ color: 'red', marginBottom: '12px' }}>{error}</div>}
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Vai trò</label>
              <select value={role} onChange={(e) => setRole(e.target.value as OrganizationRole)} style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                <option value="assistant_coach">Assistant Coach</option>
                <option value="head_coach">Head Coach</option>
                {currentUserRole === 'owner' && <option value="admin">Admin</option>}
              </select>
            </div>
            <div>
              <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Gửi</button>
              <button type="button" onClick={() => setIsInviting(false)} style={{ padding: '8px 16px', marginLeft: '8px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f3f4f6' }}>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Tên</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Vai trò</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: any) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px' }}>{m.profiles?.name || '-'}</td>
                <td style={{ padding: '12px 16px' }}>{m.profiles?.email || '-'}</td>
                <td style={{ padding: '12px 16px' }}>{m.role}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ color: '#10b981' }}>● Active</span></td>
                <td style={{ padding: '12px 16px' }}>
                  {isAdminOrOwner && m.id !== currentUserId && (
                    <button onClick={() => handleRemove(m.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Xóa</button>
                  )}
                </td>
              </tr>
            ))}
            {invitations.map((inv: any) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>-</td>
                <td style={{ padding: '12px 16px' }}>{inv.email}</td>
                <td style={{ padding: '12px 16px' }}>{inv.role}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ color: '#f59e0b' }}>● Pending</span></td>
                <td style={{ padding: '12px 16px' }}>
                  {isAdminOrOwner && (
                    <button onClick={() => handleRevoke(inv.id)} style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>Thu hồi</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
