'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '../DashboardProvider';
import { useTrainingManagement } from '@/hooks/useTrainingManagement';
import { 
  addVenueAction, 
  updateVenueAction, 
  uploadVenueImageAction, 
  updateVenueImagePositionAction, 
  importVenuesBatchAction 
} from './actions';
import dynamic from 'next/dynamic';

const ImportModal = dynamic(() => import('@/app/components/excel/ImportModal').then(mod => mod.ImportModal), { ssr: false });
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { VenuesImportDef, VenuesExportDef } from '@/services/excel/definitions/venues.def';
import styles from './TrainingVenues.module.css';

import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
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
  
  // Form State
  const [formData, setFormData] = useState({ 
    name: '', 
    address: '', 
    status: 'active', 
    image_url: '', 
    image_position: '50% 50%' 
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Direct Card Photo Upload
  const [quickUploadVenueId, setQuickUploadVenueId] = useState<string | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  // Live Image Position Adjuster Modal
  const [adjustingVenue, setAdjustingVenue] = useState<any | null>(null);
  const [currentAdjustY, setCurrentAdjustY] = useState<number>(50);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', address: '', status: 'active', image_url: '', image_position: '50% 50%' });
    setImageFile(null);
    setImagePreview(null);
    setIsAdding(false);
    setEditingId(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['training', organizationId] });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Kích thước ảnh không được vượt quá 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick photo upload directly from card
  const handleQuickPhotoClick = (venueId: string) => {
    setQuickUploadVenueId(venueId);
    if (quickFileInputRef.current) {
      quickFileInputRef.current.value = '';
      quickFileInputRef.current.click();
    }
  };

  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadVenueId) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
      return;
    }

    setLoading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);
    const res = await uploadVenueImageAction(quickUploadVenueId, uploadData);
    setLoading(false);

    if (res.success) {
      handleSuccess();
    } else {
      alert(res.error || 'Lỗi khi tải ảnh lên');
    }
  };

  // Open position adjuster modal
  const handleOpenAdjuster = (venue: any) => {
    setAdjustingVenue(venue);
    // Parse current vertical position: "50% 20%" -> 20
    const posStr = venue.image_position || '50% 50%';
    const parts = posStr.split(' ');
    const yStr = parts[1] || parts[0] || '50%';
    const yVal = parseInt(yStr.replace('%', ''), 10);
    setCurrentAdjustY(isNaN(yVal) ? 50 : yVal);
  };

  const handleSavePosition = async () => {
    if (!adjustingVenue) return;
    setLoading(true);
    const posString = `50% ${currentAdjustY}%`;
    const res = await updateVenueImagePositionAction(adjustingVenue.id, posString);
    setLoading(false);
    if (res.success) {
      setAdjustingVenue(null);
      handleSuccess();
    } else {
      alert(res.error || 'Lỗi khi lưu vị trí ảnh');
    }
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
      const res = await updateVenueAction(editingId, {
        name: formData.name,
        address: formData.address,
        status: formData.status,
        image_url: formData.image_url,
        image_position: formData.image_position
      });

      if (!res.success) {
        setLoading(false);
        setError(res.error || 'Lỗi khi cập nhật địa điểm');
        return;
      }

      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await uploadVenueImageAction(editingId, uploadData);
        if (!uploadRes.success) {
          setLoading(false);
          setError(uploadRes.error || 'Lỗi khi tải ảnh lên');
          return;
        }
      }

      setLoading(false);
      resetForm();
      handleSuccess();
    } else {
      const res = await addVenueAction({
        name: formData.name,
        address: formData.address,
        status: formData.status,
        image_url: formData.image_url,
        image_position: formData.image_position
      });

      if (!res.success) {
        setLoading(false);
        setError(res.error || 'Lỗi khi thêm địa điểm mới');
        return;
      }

      if (imageFile && res.venueId) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        await uploadVenueImageAction(res.venueId, uploadData);
      }

      setLoading(false);
      resetForm();
      handleSuccess();
    }
  };

  const handleEdit = (venue: any) => {
    setEditingId(venue.id);
    setFormData({
      name: venue.name,
      address: venue.address || '',
      status: venue.status || 'active',
      image_url: venue.image_url || '',
      image_position: venue.image_position || '50% 50%'
    });
    setImageFile(null);
    setImagePreview(venue.image_url || null);
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

      {/* Hidden quick upload input */}
      <input 
        type="file"
        ref={quickFileInputRef}
        onChange={handleQuickFileChange}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
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

      {/* ═══════════════════════════════════════════════════════
          MODAL: THÊM / SỬA ĐỊA ĐIỂM
          ═══════════════════════════════════════════════════════ */}
      <Modal isOpen={isAdding || !!editingId} onClose={loading ? () => {} : resetForm}>
        <ModalHeader title={editingId ? 'Sửa thông tin địa điểm' : 'Thêm địa điểm mới'} onClose={loading ? () => {} : resetForm} />
        <ModalBody>
          {error && (
            <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-md text-sm mb-5 flex items-center gap-2">
              <span className="material-icons-round text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}
          <form id="venue-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
            {/* Ảnh điểm tập */}
            <div className={styles.modalImageSection}>
              <label className={styles.modalImageLabel}>Hình ảnh địa điểm / Nơi tập luyện</label>
              <div 
                className={styles.modalImagePreviewBox}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className={styles.modalImagePreviewImg}
                      style={{ objectPosition: formData.image_position || '50% 50%' }}
                    />
                    <div className={styles.modalImageOverlay}>
                      <span className="material-icons-round" style={{ fontSize: 24 }}>photo_camera</span>
                      <span>Bấm để đổi ảnh</span>
                    </div>
                    <button 
                      type="button" 
                      className={styles.modalImageRemoveBtn}
                      onClick={handleRemoveImage}
                      title="Gỡ ảnh"
                    >
                      <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
                    </button>
                  </>
                ) : (
                  <div className={styles.modalImageEmptyState}>
                    <span className={`material-icons-round ${styles.modalImageEmptyIcon}`}>add_photo_alternate</span>
                    <div>Tải ảnh nơi tập luyện (Võ đường, Sân tập, Cơ sở)</div>
                    <div className={styles.modalImageHelp}>Định dạng JPG, PNG, WEBP (Tối đa 5MB)</div>
                  </div>
                )}
              </div>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
              />
            </div>

            <Input 
              label="Tên địa điểm *" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="VD: CC Riverside, Võ Đường Lam Sơn..."
            />
            <Input 
              label="Địa chỉ" 
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
              placeholder="VD: Tầng 3, Tòa nhà A, Số 123..."
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

      {/* ═══════════════════════════════════════════════════════
          MODAL: BỘ ĐIỀU CHỈNH GÓC ẢNH TRỰC QUAN (IMAGE ADJUSTER)
          ═══════════════════════════════════════════════════════ */}
      {adjustingVenue && (
        <Modal isOpen={!!adjustingVenue} onClose={() => setAdjustingVenue(null)}>
          <ModalHeader 
            title={`Chỉnh góc ảnh: ${adjustingVenue.name}`} 
            onClose={() => setAdjustingVenue(null)} 
          />
          <ModalBody>
            <div className={styles.positionAdjusterModal}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Kéo thanh trượt hoặc bấm chọn căn chỉnh để hiển thị đúng phần đẹp nhất của nơi tập (tránh bị cắt chữ hoặc góc nhìn quan trọng):
              </p>

              {/* Live Preview Container */}
              <div className={styles.positionPreviewContainer}>
                <img 
                  src={adjustingVenue.image_url} 
                  alt={adjustingVenue.name} 
                  className={styles.positionPreviewImg}
                  style={{ objectPosition: `50% ${currentAdjustY}%` }}
                />
              </div>

              {/* Preset Buttons */}
              <div className={styles.presetBtnGroup}>
                <button 
                  type="button"
                  className={`${styles.presetBtn} ${currentAdjustY === 0 ? styles.presetBtnActive : ''}`}
                  onClick={() => setCurrentAdjustY(0)}
                >
                  <span className="material-icons-round" style={{ fontSize: 16 }}>vertical_align_top</span>
                  Căn đỉnh (Top 0%)
                </button>
                <button 
                  type="button"
                  className={`${styles.presetBtn} ${currentAdjustY === 50 ? styles.presetBtnActive : ''}`}
                  onClick={() => setCurrentAdjustY(50)}
                >
                  <span className="material-icons-round" style={{ fontSize: 16 }}>vertical_align_center</span>
                  Căn giữa (50%)
                </button>
                <button 
                  type="button"
                  className={`${styles.presetBtn} ${currentAdjustY === 100 ? styles.presetBtnActive : ''}`}
                  onClick={() => setCurrentAdjustY(100)}
                >
                  <span className="material-icons-round" style={{ fontSize: 16 }}>vertical_align_bottom</span>
                  Căn đáy (100%)
                </button>
              </div>

              {/* Smooth Slider */}
              <div className={styles.sliderContainer}>
                <div className={styles.sliderHeader}>
                  <span>Tinh chỉnh vị trí dọc:</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{currentAdjustY}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={currentAdjustY}
                  onChange={e => setCurrentAdjustY(parseInt(e.target.value, 10))}
                  className={styles.rangeSlider}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setAdjustingVenue(null)} disabled={loading}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleSavePosition} isLoading={loading}>
              Lưu vị trí góc ảnh
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════
          VENUE LIST / CARDS GRID
          ═══════════════════════════════════════════════════════ */}
      {isVenuesLoading ? (
        <div className={styles.venuesGrid}>
          {[1, 2, 3].map(i => (
            <div key={i} className={`${styles.venueCard} animate-pulse`} style={{ height: 380 }}>
              <div style={{ height: 210, background: 'var(--surface-hover)' }} />
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ height: 24, background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '60%' }} />
                <div style={{ height: 14, background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '85%' }} />
                <div style={{ height: 56, background: 'var(--surface-hover)', borderRadius: 'var(--radius-xl)' }} />
                <div style={{ height: 36, background: 'var(--surface-hover)', borderRadius: 'var(--radius-full)', marginTop: 'auto' }} />
              </div>
            </div>
          ))}
        </div>
      ) : venues.length === 0 ? (
        <EmptyState 
          title="Chưa có địa điểm nào" 
          description="Hệ thống cần ít nhất một địa điểm để bắt đầu tạo lớp học." 
          icon="domain"
        />
      ) : (
        <div className={styles.venuesGrid}>
          {venues.map((venue: any) => {
            const imagePosition = venue.image_position || '50% 50%';

            return (
              <div key={venue.id} className={styles.venueCard}>
                {/* ── Photo Banner ── */}
                <div className={styles.venueImageContainer}>
                  {venue.image_url ? (
                    <img 
                      src={venue.image_url} 
                      alt={venue.name} 
                      className={styles.venueImage} 
                      style={{ objectPosition: imagePosition }}
                    />
                  ) : (
                    <div className={styles.venuePlaceholder}>
                      <span className={`material-icons-round ${styles.venuePlaceholderWatermark}`}>sports_martial_arts</span>
                      <div className={styles.venuePlaceholderBadge}>
                        <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--primary)' }}>location_city</span>
                        <span>Võ Đường / Điểm Tập</span>
                      </div>
                    </div>
                  )}

                  <div className={styles.venueGradientFade} />

                  {/* Status Indicator Pill (Top Left) */}
                  <div className={styles.venueStatusPill}>
                    <span 
                      className={`${styles.statusIndicatorDot} ${
                        venue.status === 'active' 
                          ? styles.statusIndicatorDotActive 
                          : styles.statusIndicatorDotInactive
                      }`} 
                    />
                    <span>{venue.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}</span>
                  </div>

                  {/* Quick photo & position controls (Top Right) */}
                  {isAdminOrOwner && (
                    <div className={styles.imageControlToolbar}>
                      {venue.image_url && (
                        <button 
                          type="button"
                          className={styles.imageControlBtn}
                          onClick={() => handleOpenAdjuster(venue)}
                          title="Căn chỉnh vị trí ảnh (Pan 0-100%)"
                        >
                          <span className="material-icons-round" style={{ fontSize: 18 }}>crop</span>
                        </button>
                      )}
                      <button 
                        type="button"
                        className={styles.imageControlBtn}
                        onClick={() => handleQuickPhotoClick(venue.id)}
                        title={venue.image_url ? "Thay đổi ảnh địa điểm" : "Tải ảnh địa điểm"}
                      >
                        <span className="material-icons-round" style={{ fontSize: 18 }}>photo_camera</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Card Body with Quiz-App Refined Typography ── */}
                <div className={styles.venueBody}>
                  {/* Watermark in background */}
                  <span className={`material-icons-round ${styles.cardWatermark}`}>sports_martial_arts</span>

                  {/* Category Pill Tag */}
                  <div className={styles.venueCategoryRow}>
                    <div className={styles.venueCategoryTag}>
                      <span className="material-icons-round" style={{ fontSize: 12 }}>stars</span>
                      <span>CƠ SỞ ĐÀO TẠO</span>
                    </div>
                  </div>

                  {/* Prominent Venue Title */}
                  <div className={styles.venueTitleRow}>
                    <Link href={`/training/${venue.id}`} className={styles.venueName} title={venue.name}>
                      {venue.name}
                    </Link>
                  </div>



                  {/* Two-Tone Bento Athletic Stat Chips */}
                  <div className={styles.venueStatsRow}>
                    <div className={styles.statChipTeal}>
                      <div className={`${styles.statChipHeader} ${styles.statChipHeaderTeal}`}>
                        <span className="material-icons-round" style={{ fontSize: 15 }}>sports_martial_arts</span>
                        <span>LỚP ĐANG DẠY</span>
                      </div>
                      <div className={styles.statChipValue}>
                        <span className={styles.statNumberTeal}>{venue.activeClassesCount}</span>
                        <span className={styles.statUnit}>lớp</span>
                      </div>
                    </div>

                    <div className={styles.statChipOrange}>
                      <div className={`${styles.statChipHeader} ${styles.statChipHeaderOrange}`}>
                        <span className="material-icons-round" style={{ fontSize: 15 }}>groups</span>
                        <span>VÕ SINH</span>
                      </div>
                      <div className={styles.statChipValue}>
                        <span className={styles.statNumberOrange}>{venue.totalStudentsCount}</span>
                        <span className={styles.statUnit}>học viên</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className={styles.venueFooter}>
                    {isAdminOrOwner && (
                      <button 
                        type="button"
                        className={styles.btnEditVenue}
                        onClick={() => handleEdit(venue)}
                        title="Chỉnh sửa thông tin"
                      >
                        <span className="material-icons-round" style={{ fontSize: 16 }}>edit</span>
                        <span>Sửa</span>
                      </button>
                    )}
                    <Link href={`/training/${venue.id}`} className={styles.btnDetailsVenue}>
                      <span>Xem chi tiết cơ sở</span>
                      <span className={`material-icons-round ${styles.btnDetailsArrow}`}>arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
