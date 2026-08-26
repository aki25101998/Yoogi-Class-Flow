'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addVenueAction, updateVenueAction, deleteVenueAction } from './actions';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';

export default function VenuesClient({ initialVenues, currentUserRole }: any) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', status: 'active' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ name: '', address: '', status: 'active' });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (editingId) {
      const res = await updateVenueAction(editingId, formData);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi cập nhật địa điểm');
    } else {
      const res = await addVenueAction(formData);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi thêm địa điểm');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa địa điểm này?')) {
      setLoading(true);
      const res = await deleteVenueAction(id);
      setLoading(false);
      if (res.success) handleSuccess();
      else alert(res.error || 'Lỗi khi xóa');
    }
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Địa điểm" 
        description="Quản lý danh sách các địa điểm, cơ sở đào tạo của trung tâm"
        primaryAction={isAdminOrOwner && !isAdding && !editingId ? (
          <Button 
            onClick={() => setIsAdding(true)}
            leftIcon={<span className="material-icons-round">add_location</span>}
          >
            Thêm Địa Điểm
          </Button>
        ) : undefined}
      />

      {(isAdding || editingId) && (
        <Card className="mb-6">
          <CardContent>
            <h3 className="font-semibold text-lg mb-4 text-main">
              {editingId ? 'Sửa thông tin địa điểm' : 'Thêm địa điểm mới'}
            </h3>
            {error && <div className="text-danger mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <Input 
                label="Tên địa điểm *" 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
              <Input 
                label="Địa chỉ" 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
              />
              <Select 
                label="Trạng thái" 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value})}
                options={[
                  { value: 'active', label: 'Hoạt động' },
                  { value: 'inactive', label: 'Tạm ngưng' }
                ]}
              />
              <div className="col-span-full mt-2 flex gap-2">
                <Button type="submit" isLoading={loading} variant="primary">Lưu</Button>
                <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {initialVenues.length === 0 ? (
        <EmptyState 
          title="Chưa có địa điểm nào" 
          description="Hệ thống chưa có dữ liệu địa điểm. Vui lòng thêm địa điểm mới." 
          icon="location_off"
        />
      ) : (
        <div className="flex-col gap-4">
          {initialVenues.map((venue: any) => (
            <Card key={venue.id}>
              <CardContent className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4">
                <div className="flex items-start gap-4">
                  <div style={{ backgroundColor: 'var(--surface-hover)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', display: 'flex', color: 'var(--text-secondary)' }}>
                    <span className="material-icons-round">place</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-main">{venue.name}</h3>
                    <p className="text-secondary text-sm mt-1 mb-2">Địa chỉ: {venue.address || 'Chưa cập nhật'}</p>
                    <Badge variant={venue.status === 'active' ? 'success' : 'default'}>
                      {venue.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                    </Badge>
                  </div>
                </div>
                {isAdminOrOwner && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => { setEditingId(venue.id); setFormData(venue); setIsAdding(false); }}
                      leftIcon={<span className="material-icons-round">edit</span>}
                    >
                      Sửa
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-danger border-danger hover:bg-danger-bg"
                      onClick={() => handleDelete(venue.id)}
                      disabled={loading}
                      leftIcon={<span className="material-icons-round">delete</span>}
                    >
                      Xóa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
