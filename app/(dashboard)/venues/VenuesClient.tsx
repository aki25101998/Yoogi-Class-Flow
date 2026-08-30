'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addVenueAction, updateVenueAction, deleteVenueAction, importVenuesBatchAction } from './actions';
import { useVenues } from '@/hooks/useVenues';
import { useDashboardContext } from '../DashboardProvider';
import { ImportModal } from '@/app/components/excel/ImportModal';
import { ExportButton } from '@/app/components/excel/ExportButton';
import { VenuesImportDef, VenuesExportDef } from '@/services/excel/definitions/venues.def';

// UI Components
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';

function VenueSkeleton() {
  return (
    <Card className="mb-4 animate-pulse">
      <CardContent className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4">
        <div className="flex items-start gap-4 w-full">
          <div className="w-10 h-10 bg-surface-hover rounded-md shrink-0"></div>
          <div className="flex-1">
            <div className="h-6 bg-surface-hover rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-surface-hover rounded w-1/2 mb-2"></div>
            <div className="h-5 bg-surface-hover rounded w-20"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VenuesClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { venues, isLoading } = useVenues(organizationId);
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [showImport, setShowImport] = useState(false);
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
    queryClient.invalidateQueries({ queryKey: ['venues', organizationId] });
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
        primaryAction={isAdminOrOwner ? (
          <div className="flex gap-2">
            <ExportButton data={venues} definition={VenuesExportDef} />
            <Button 
              variant="outline" 
              onClick={() => setShowImport(true)}
              leftIcon={<span className="material-icons-round">upload_file</span>}
            >
              Import Excel
            </Button>
            <Button 
              onClick={() => setIsAdding(true)}
              leftIcon={<span className="material-icons-round">add_location</span>}
            >
              Thêm Địa Điểm
            </Button>
          </div>
        ) : (
          <ExportButton data={venues} definition={VenuesExportDef} />
        )}
      />

      {showImport && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          definition={VenuesImportDef}
          existingRecords={venues}
          onImport={importVenuesBatchAction}
        />
      )}

      <Modal isOpen={isAdding || !!editingId} onClose={loading ? () => {} : resetForm}>
        <ModalHeader title={editingId ? 'Sửa thông tin địa điểm' : 'Thêm địa điểm mới'} onClose={loading ? () => {} : resetForm} />
        <ModalBody>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}
          <form id="venue-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
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
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="venue-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      {isLoading ? (
        <div className="flex-col gap-4 mt-6">
          <VenueSkeleton />
          <VenueSkeleton />
        </div>
      ) : venues.length === 0 ? (
        <EmptyState 
          title="Chưa có địa điểm nào" 
          description="Hệ thống chưa có dữ liệu địa điểm. Vui lòng thêm địa điểm mới." 
          icon="location_off"
        />
      ) : (
        <div className="flex-col gap-4">
          {venues.map((venue: any) => (
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
