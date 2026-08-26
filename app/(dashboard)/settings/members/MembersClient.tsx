'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inviteMemberAction, revokeInvitationAction, removeMemberAction } from './actions';
import { OrganizationRole } from '@/types/organization';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/app/components/ui/Table';
import { EmptyState } from '@/app/components/ui/EmptyState';

export default function MembersClient({ initialMembers, initialInvitations, currentUserRole, currentUserId }: any) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('assistant_coach');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await inviteMemberAction(email, role);
    setLoading(false);
    if (res.success) {
      setIsInviting(false);
      setEmail('');
      router.refresh();
    } else {
      setError(res.error || 'Lỗi gửi lời mời');
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Bạn có chắc muốn thu hồi lời mời này?')) {
      setLoading(true);
      await revokeInvitationAction(id);
      setLoading(false);
      router.refresh();
    }
  };

  const handleRemove = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa thành viên này?')) {
      setLoading(true);
      const res = await removeMemberAction(id);
      setLoading(false);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Lỗi khi xóa thành viên');
      }
    }
  };

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Danh sách thành viên" 
        description="Quản lý thành viên và phân quyền trong trung tâm"
        primaryAction={isAdminOrOwner && !isInviting ? (
          <Button 
            onClick={() => setIsInviting(true)}
            leftIcon={<span className="material-icons-round">person_add</span>}
          >
            Mời thành viên
          </Button>
        ) : undefined}
      />

      {isInviting && (
        <Card className="mb-6">
          <CardContent>
            <h3 className="font-semibold text-lg mb-4 text-main">Gửi lời mời</h3>
            {error && <div className="text-danger mb-4 text-sm">{error}</div>}
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Input 
                  label="Email"
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="w-full sm:w-48">
                <Select 
                  label="Vai trò"
                  value={role} 
                  onChange={(e) => setRole(e.target.value as OrganizationRole)}
                  options={[
                    { value: 'assistant_coach', label: 'Assistant Coach' },
                    { value: 'head_coach', label: 'Head Coach' },
                    ...(currentUserRole === 'owner' ? [{ value: 'admin', label: 'Admin' }] : [])
                  ]}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="submit" isLoading={loading} variant="primary" className="flex-1 sm:flex-none">
                  Gửi
                </Button>
                <Button type="button" variant="secondary" onClick={() => setIsInviting(false)} disabled={loading} className="flex-1 sm:flex-none">
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {members.length === 0 && invitations.length === 0 ? (
        <EmptyState 
          title="Không có thành viên" 
          description="Chưa có thành viên nào trong hệ thống." 
          icon="groups"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Tên</Th>
                  <Th>Email</Th>
                  <Th>Vai trò</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Hành động</Th>
                </Tr>
              </Thead>
              <Tbody>
                {members.map((m: any) => (
                  <Tr key={m.id}>
                    <Td className="font-medium text-main">{m.profiles?.name || '-'}</Td>
                    <Td>{m.profiles?.email || '-'}</Td>
                    <Td className="capitalize">{m.role.replace('_', ' ')}</Td>
                    <Td>
                      <Badge variant="success">Active</Badge>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      {isAdminOrOwner && m.id !== currentUserId && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger-bg"
                          onClick={() => handleRemove(m.id)}
                          disabled={loading}
                        >
                          Xóa
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
                {invitations.map((inv: any) => (
                  <Tr key={inv.id} className="bg-surface-hover/50">
                    <Td className="text-muted">-</Td>
                    <Td>{inv.email}</Td>
                    <Td className="capitalize">{inv.role.replace('_', ' ')}</Td>
                    <Td>
                      <Badge variant="warning">Pending</Badge>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      {isAdminOrOwner && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="text-warning hover:bg-warning-bg"
                          onClick={() => handleRevoke(inv.id)}
                          disabled={loading}
                        >
                          Thu hồi
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
