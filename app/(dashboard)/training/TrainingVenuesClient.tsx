'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '../DashboardProvider';
import { useTrainingManagement } from '@/hooks/useTrainingManagement';
import { addVenueAction, updateVenueAction, importVenuesBatchAction } from './actions';
import dynamic from 'next/dynamic';

const ImportModal = dynamic(() => import('@/app/components/excel/ImportModal').then(mod => mod.ImportModal), { ssr: false });
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { VenuesImportDef, VenuesExportDef } from '@/services/excel/definitions/venues.def';
import styles from '@/app/styles/page-standard.module.css';

import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';

export default function TrainingVenuesClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const { venues, isVenuesLoading } = useTrainingManagement(organizationId);
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', address: '', status: 'active' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', address: '', status: 'active' });
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['training', organizationId, 'venues'] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên địa điểm');
      return;
    }

    setLoading(true);
    
    if (editingId) {
      const res = await updateVenueAction(editingId, formData);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi cập nhật');
    } else {
      const res = await addVenueAction(formData);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi thêm mới');
    }
  };

  const handleEdit = (venue: any) => {
    setEditingId(venue.id);
    setFormData({
      name: venue.name,
      address: venue.address || '',
      status: venue.status || 'active'
    });
    setIsAdding(false);
  };

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Đào tạo" 
        description="Quản lý danh sách địa điểm, lớp học và học viên"
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
              leftIcon={<span className="material-icons-round">add_location_alt</span>}
            >
              Thêm Địa Điểm
            </Button>
          </div>
        ) : null}
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
          {error && (
            <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-md text-sm mb-5 flex items-center gap-2">
              <span className="material-icons-round text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}
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
                { value: 'inactive', label: 'Ngừng hoạt động' }
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="venue-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      {isVenuesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-6 bg-surface-hover rounded w-2/3"></div></CardHeader>
              <CardContent><div className="h-4 bg-surface-hover rounded w-1/2"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : venues.length === 0 ? (
        <EmptyState 
          title="Chưa có địa điểm nào" 
          description="Hệ thống cần ít nhất một địa điểm để bắt đầu tạo lớp học." 
          icon="domain"
        />
      ) : (
        <div className={styles.listContainer}>
          {venues.map((venue: any) => (
            <div key={venue.id} className={styles.rowItem}>
              <div className={styles.rowMainInfo}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-icons-round text-primary text-[18px]">location_on</span>
                  <Link href={`/training/${venue.id}`} className={`${styles.rowTitle} hover:text-primary transition-colors`}>
                    {venue.name}
                  </Link>
                  <Badge variant={venue.status === 'active' ? 'success' : 'default'} className="ml-2">
                    {venue.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                  </Badge>
                </div>
                <div className={styles.rowSubTitle}>
                  {venue.address || 'Chưa cập nhật địa chỉ'}
                </div>
              </div>
              
              <div className={styles.rowMeta}>
                <div className={styles.rowMetaItem}>
                  <span className={styles.rowMetaLabel}>Lớp học</span>
                  <span className={styles.rowMetaValue}>{venue.activeClassesCount} lớp</span>
                </div>
                <div className={styles.rowMetaItem}>
                  <span className={styles.rowMetaLabel}>Học viên</span>
                  <span className={styles.rowMetaValue}>{venue.totalStudentsCount} hv</span>
                </div>
              </div>

              <div className={styles.rowActions}>
                {isAdminOrOwner && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(venue)}
                    title="Sửa"
                    leftIcon={<span className="material-icons-round">edit</span>}
                  >
                    Sửa
                  </Button>
                )}
                <Link href={`/training/${venue.id}`}>
                  <Button variant="outline" size="sm">
                    Chi Tiết
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
