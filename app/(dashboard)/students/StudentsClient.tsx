'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addStudentAction, updateStudentAction, deleteStudentAction, importStudentsBatchAction } from './actions';
import { useStudents } from '@/hooks/useStudents';
import { useDashboardContext } from '../DashboardProvider';
import dynamic from 'next/dynamic';
const ImportModal = dynamic(() => import('@/app/components/excel/ImportModal').then(mod => mod.ImportModal), { ssr: false });
const ExportButton = dynamic(() => import('@/app/components/excel/ExportButton').then(mod => mod.ExportButton), { ssr: false });
import { StudentsImportDef, StudentsExportDef } from '@/services/excel/definitions/students.def';

import { PageHeader } from '@/app/components/ui/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import styles from '@/app/styles/page-standard.module.css';

function calculateAge(dobString?: string): string {
  if (!dobString) return '';
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? `${age} tuổi` : '< 1 tuổi';
}

function getBeltStyle(beltName?: string) {
  if (!beltName) {
    return { bg: 'rgba(148, 163, 184, 0.1)', text: 'var(--text-secondary)', border: 'rgba(148, 163, 184, 0.3)' };
  }
  const lower = beltName.toLowerCase();
  if (lower.includes('trắng')) {
    return { bg: 'rgba(241, 245, 249, 0.9)', text: '#334155', border: '#cbd5e1' };
  }
  if (lower.includes('vàng')) {
    return { bg: 'rgba(254, 240, 138, 0.35)', text: '#b45309', border: '#fde047' };
  }
  if (lower.includes('cam')) {
    return { bg: 'rgba(255, 107, 53, 0.15)', text: '#ea580c', border: '#fdba74' };
  }
  if (lower.includes('xanh lá')) {
    return { bg: 'rgba(34, 197, 94, 0.15)', text: '#15803d', border: '#86efac' };
  }
  if (lower.includes('xanh') || lower.includes('lam') || lower.includes('dương')) {
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#1d4ed8', border: '#93c5fd' };
  }
  if (lower.includes('đỏ')) {
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#b91c1c', border: '#fca5a5' };
  }
  if (lower.includes('nâu')) {
    return { bg: 'rgba(180, 83, 9, 0.18)', text: '#78350f', border: '#d97706' };
  }
  if (lower.includes('đen') || lower.includes('huyền đai') || lower.includes('đẳng')) {
    return { bg: 'rgba(15, 23, 42, 0.85)', text: '#f8fafc', border: '#0f172a' };
  }
  return { bg: 'var(--primary-light)', text: 'var(--primary)', border: 'rgba(20, 184, 166, 0.3)' };
}

function StudentCardSkeleton() {
  return (
    <div className={`${styles.cardSkeleton} animate-pulse`} style={{ gridTemplateColumns: '48px 1.4fr 120px 1.2fr 1.2fr 100px auto' }}>
      <div className={styles.entityAvatar} style={{ background: 'var(--surface-hover)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '16px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '45%' }} />
        <div style={{ height: '12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '65%' }} />
      </div>
      <div style={{ height: '24px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-full)', width: '90px' }} />
      <div style={{ height: '28px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '130px' }} />
      <div style={{ height: '28px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', width: '130px' }} />
      <div style={{ height: '24px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-full)', width: '80px' }} />
      <div style={{ height: '32px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-full)', width: '110px' }} />
    </div>
  );
}

export default function StudentsClient() {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;

  const { students, stats, availableClasses, availableBelts, availableVenues, isLoading } = useStudents(organizationId);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'suspended' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedBeltFilter, setSelectedBeltFilter] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    parent_name: '', 
    parent_phone: '', 
    dob: '', 
    status: 'active', 
    current_belt_id: '', 
    venue_id: '' 
  });
  
  const [editingClassId, setEditingClassId] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const resetForm = () => {
    setFormData({ 
      name: '', 
      phone: '', 
      parent_name: '', 
      parent_phone: '', 
      dob: '', 
      status: 'active', 
      current_belt_id: '', 
      venue_id: '' 
    });
    setEditingClassId('');
    setIsAdding(false);
    setEditingId(null);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['students', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['student_kpi_stats', organizationId] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Vui lòng nhập họ tên võ sinh');
      return;
    }
    if (!formData.dob) {
      setError('Vui lòng chọn ngày sinh');
      return;
    }
    if (!formData.venue_id) {
      setError('Vui lòng chọn địa điểm học');
      return;
    }

    setLoading(true);
    
    const submitData = {
      ...formData,
      current_belt_id: formData.current_belt_id === '' ? null : formData.current_belt_id,
      venue_id: formData.venue_id
    };
    
    if (editingId) {
      const res = await updateStudentAction(editingId, submitData, editingClassId);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else {
        setError(res.error || 'Lỗi khi cập nhật học viên');
      }
    } else {
      const res = await addStudentAction(submitData, editingClassId);
      setLoading(false);
      if (res.success) {
        resetForm();
        handleSuccess();
      } else {
        setError(res.error || 'Lỗi khi thêm học viên');
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa học viên "${name}" khỏi hệ thống?`)) {
      setLoading(true);
      const res = await deleteStudentAction(id);
      setLoading(false);
      if (res.success) {
        handleSuccess();
      } else {
        alert(res.error || 'Lỗi khi xóa học viên');
      }
    }
  };

  const handleEdit = (student: any) => {
    setEditingId(student.id);
    setFormData({
      name: student.name || '',
      phone: student.phone || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      dob: student.dob || '',
      status: student.status || 'active',
      current_belt_id: student.current_belt_id || '',
      venue_id: student.venue_id || ''
    });
    
    const activeClass = student.class_students && student.class_students.length > 0 ? student.class_students[0] : null;
    setEditingClassId(activeClass ? activeClass.class_id : '');
    setIsAdding(false);
  };

  // Status Counts
  const totalCount = students.length;
  const activeCount = useMemo(() => students.filter((s: any) => s.status === 'active').length, [students]);
  const suspendedCount = useMemo(() => students.filter((s: any) => s.status === 'suspended').length, [students]);
  const inactiveCount = useMemo(() => students.filter((s: any) => s.status === 'inactive').length, [students]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((student: any) => {
      // 1. Tab Status Filter
      if (activeTab !== 'all' && student.status !== activeTab) {
        return false;
      }

      // 2. Search query filter (Name, Phone, Parent Name, Parent Phone)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const nameMatch = student.name?.toLowerCase().includes(query);
        const phoneMatch = student.phone?.includes(query);
        const parentNameMatch = student.parent_name?.toLowerCase().includes(query);
        const parentPhoneMatch = student.parent_phone?.includes(query);
        if (!nameMatch && !phoneMatch && !parentNameMatch && !parentPhoneMatch) {
          return false;
        }
      }

      // 3. Venue filter
      if (selectedVenueFilter && student.venue_id !== selectedVenueFilter) {
        return false;
      }

      // 4. Belt filter
      if (selectedBeltFilter && student.current_belt_id !== selectedBeltFilter) {
        return false;
      }

      // 5. Class filter
      if (selectedClassFilter) {
        const hasClass = student.class_students?.some((cs: any) => cs.class_id === selectedClassFilter);
        if (!hasClass) return false;
      }

      return true;
    });
  }, [students, activeTab, searchTerm, selectedVenueFilter, selectedBeltFilter, selectedClassFilter]);

  // Classes filtered by venue for the modal
  const modalClasses = useMemo(() => {
    if (!formData.venue_id) return availableClasses;
    return availableClasses.filter((c: any) => c.venue_id === formData.venue_id);
  }, [availableClasses, formData.venue_id]);

  return (
    <div className="flex-col gap-6">
      <PageHeader 
        title="Quản lý Học viên" 
        description="Quản lý danh sách võ sinh, theo dõi chuyên cần, phân lớp và hồ sơ đào tạo"
        primaryAction={isAdminOrOwner ? (
          <div className="flex gap-2">
            <ExportButton data={students} definition={StudentsExportDef} />
            <Button 
              variant="outline" 
              onClick={() => setShowImport(true)}
              leftIcon={<span className="material-icons-round">upload_file</span>}
            >
              Import Excel
            </Button>
            <Button 
              onClick={() => { resetForm(); setIsAdding(true); }}
              leftIcon={<span className="material-icons-round">person_add</span>}
            >
              Thêm Học Viên
            </Button>
          </div>
        ) : (
          <ExportButton data={students} definition={StudentsExportDef} />
        )}
      />

      {showImport && (
        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          definition={StudentsImportDef}
          existingRecords={students}
          onImport={importStudentsBatchAction}
        />
      )}

      {/* OVERVIEW KPI GRID (4 CÂN ĐỐI) */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <div className={styles.overviewTitle}>
            <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>analytics</span>
            TỔNG QUAN HỌC VIÊN
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Số liệu cập nhật thời gian thực
          </div>
        </div>
        <div className={styles.overviewGrid}>
          {/* 1. Tổng võ sinh */}
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Tổng võ sinh</div>
            <div className={styles.kpiValue}>{stats.total}</div>
            <div className={styles.kpiCaption}>Đã đăng ký trong hệ thống</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--primary)' }}>groups</span>
          </div>

          {/* 2. Đang tập luyện */}
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Đang tập luyện</div>
            <div className={styles.kpiValue}>{stats.active}</div>
            <div className={styles.kpiCaption}>Sinh hoạt & tập luyện đều đặn</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--success)' }}>sports_kabaddi</span>
          </div>

          {/* 3. Học phí chưa hoàn thành */}
          <div className={`${styles.kpiItem} ${styles.kpiWarning}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Học phí chưa thu</div>
            <div className={styles.kpiValue}>{stats.unpaidTuition}</div>
            <div className={styles.kpiCaption}>Chưa đóng hoặc nợ kỳ này</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--warning)' }}>pending_actions</span>
          </div>

          {/* 4. Tỷ lệ đi học */}
          <div className={`${styles.kpiItem} ${styles.kpiInfo}`}>
            <div className={styles.kpiLabel}><div className={styles.kpiDot}></div> Tỷ lệ đi học</div>
            <div className={styles.kpiValue}>{stats.attendanceRate}%</div>
            <div className={styles.kpiCaption}>Chuyên cần toàn trung tâm</div>
            <span className={`material-icons-round ${styles.kpiWatermark}`} style={{ color: 'var(--info)' }}>fact_check</span>
          </div>
        </div>
      </div>

      {/* TOOLBAR & FILTERS */}
      <div className={styles.toolbar} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search box */}
          <div className={styles.searchWrapper} style={{ maxWidth: '460px', flex: 1, minWidth: '260px' }}>
            <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
            <input 
              type="text" 
              className={styles.searchInput} 
              placeholder="Tìm võ sinh theo tên, SĐT hoặc SĐT phụ huynh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button" 
                className={styles.searchClearBtn}
                onClick={() => setSearchTerm('')}
                title="Xóa tìm kiếm"
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>close</span>
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className={styles.filterGroup}>
            <button
              type="button"
              className={`${styles.filterPill} ${activeTab === 'all' ? styles.filterPillActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả <span className={styles.filterPillCount}>{totalCount}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${activeTab === 'active' ? styles.filterPillActive : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Đang học <span className={styles.filterPillCount}>{activeCount}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${activeTab === 'suspended' ? styles.filterPillActive : ''}`}
              onClick={() => setActiveTab('suspended')}
            >
              Bảo lưu <span className={styles.filterPillCount}>{suspendedCount}</span>
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${activeTab === 'inactive' ? styles.filterPillActive : ''}`}
              onClick={() => setActiveTab('inactive')}
            >
              Đã nghỉ <span className={styles.filterPillCount}>{inactiveCount}</span>
            </button>
          </div>
        </div>

        {/* Finer Dropdown Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          paddingTop: '10px',
          borderTop: '1px dashed var(--border-light)'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-icons-round" style={{ fontSize: '16px' }}>filter_alt</span>
            Bộ lọc:
          </span>

          {/* Filter by Venue */}
          <select 
            value={selectedVenueFilter} 
            onChange={(e) => {
              setSelectedVenueFilter(e.target.value);
              setSelectedClassFilter(''); // reset class filter when venue changes
            }}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              background: 'var(--surface)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="">-- Tất cả cơ sở --</option>
            {availableVenues.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          {/* Filter by Class */}
          <select 
            value={selectedClassFilter} 
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              background: 'var(--surface)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="">-- Tất cả lớp học --</option>
            {availableClasses
              .filter((c: any) => !selectedVenueFilter || c.venue_id === selectedVenueFilter)
              .map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>

          {/* Filter by Belt */}
          <select 
            value={selectedBeltFilter} 
            onChange={(e) => setSelectedBeltFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              background: 'var(--surface)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="">-- Tất cả cấp đai --</option>
            {availableBelts.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {(selectedVenueFilter || selectedClassFilter || selectedBeltFilter) && (
            <button
              type="button"
              onClick={() => {
                setSelectedVenueFilter('');
                setSelectedClassFilter('');
                setSelectedBeltFilter('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '15px' }}>restart_alt</span>
              Đặt lại lọc
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Hiển thị <strong>{filteredStudents.length}</strong> / {students.length} học viên
          </div>
        </div>
      </div>

      {/* STUDENT MODAL (CREATE / EDIT) */}
      <Modal isOpen={isAdding || !!editingId} onClose={loading ? () => {} : resetForm}>
        <ModalHeader 
          title={editingId ? 'Chỉnh sửa hồ sơ võ sinh' : 'Thêm học viên mới'} 
          onClose={loading ? () => {} : resetForm} 
        />
        <ModalBody>
          {error && (
            <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-md text-sm mb-5 flex items-center gap-2">
              <span className="material-icons-round text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}
          <form id="student-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            {/* NHÓM 1: THÔNG TIN CÁ NHÂN */}
            <div style={{ padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons-round" style={{ fontSize: '16px' }}>person</span>
                1. Thông tin võ sinh
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <Input 
                  label="Họ và tên võ sinh *" 
                  required 
                  placeholder="VD: Trần Bảo Nam"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />

                <Input 
                  label="Ngày sinh *" 
                  type="date"
                  required 
                  value={formData.dob} 
                  onChange={e => setFormData({...formData, dob: e.target.value})} 
                />

                <Input 
                  label="Số điện thoại cá nhân" 
                  placeholder="09xx... (nếu có)"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
            </div>

            {/* NHÓM 2: NGƯỜI GIÁM HỘ / PHỤ HUYNH */}
            <div style={{ padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-energy)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons-round" style={{ fontSize: '16px' }}>family_restroom</span>
                2. Thông tin phụ huynh / Người giám hộ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <Input 
                  label="Tên phụ huynh" 
                  placeholder="VD: Trần Văn Bình"
                  value={formData.parent_name} 
                  onChange={e => setFormData({...formData, parent_name: e.target.value})} 
                />

                <Input 
                  label="SĐT phụ huynh" 
                  placeholder="09xx..."
                  value={formData.parent_phone} 
                  onChange={e => setFormData({...formData, parent_phone: e.target.value})} 
                />
              </div>
            </div>

            {/* NHÓM 3: ĐÀO TẠO & PHÂN LỚP */}
            <div style={{ padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons-round" style={{ fontSize: '16px' }}>school</span>
                3. Cơ sở đào tạo & Phân lớp
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <Select 
                  label="Địa điểm / Cơ sở học *"
                  required
                  value={formData.venue_id} 
                  onChange={e => {
                    const newVenue = e.target.value;
                    setFormData({...formData, venue_id: newVenue});
                    // Reset class if not in this venue
                    setEditingClassId('');
                  }} 
                  options={[
                    { value: '', label: '-- Chọn địa điểm học --' },
                    ...availableVenues.map((venue: any) => ({
                      value: venue.id,
                      label: venue.name
                    }))
                  ]}
                />

                <Select 
                  label="Lớp học tham gia"
                  value={editingClassId} 
                  onChange={e => setEditingClassId(e.target.value)} 
                  options={[
                    { value: '', label: '-- Chưa xếp lớp --' },
                    ...modalClasses.map((c: any) => ({ 
                      value: c.id, 
                      label: `${c.name} (${c.venues?.name || 'Chi nhánh'})` 
                    }))
                  ]}
                />

                <Select 
                  label="Cấp đai hiện tại"
                  value={formData.current_belt_id} 
                  onChange={e => setFormData({...formData, current_belt_id: e.target.value})} 
                  options={[
                    { value: '', label: '-- Chọn cấp đai --' },
                    ...availableBelts.map((belt: any) => ({
                      value: belt.id,
                      label: belt.name
                    }))
                  ]}
                />

                <Select 
                  label="Trạng thái học tập"
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})} 
                  options={[
                    { value: 'active', label: 'Đang theo học (Active)' },
                    { value: 'suspended', label: 'Bảo lưu / Tạm ngưng (Suspended)' },
                    { value: 'inactive', label: 'Đã nghỉ học (Inactive)' }
                  ]}
                />
              </div>
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>Hủy</Button>
          <Button type="submit" form="student-form" isLoading={loading} variant="primary">
            {editingId ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* CARD-ROW ENTITY LIST */}
      {isLoading ? (
        <div className={styles.entityList}>
          <StudentCardSkeleton />
          <StudentCardSkeleton />
          <StudentCardSkeleton />
        </div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState 
          title="Không tìm thấy học viên nào" 
          description={searchTerm || selectedVenueFilter || selectedClassFilter || selectedBeltFilter 
            ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." 
            : "Chưa có dữ liệu học viên trong trung tâm. Hãy bấm nút Thêm Học Viên để tạo mới."} 
          icon="sports_kabaddi"
          action={
            isAdminOrOwner && !searchTerm && !selectedVenueFilter ? (
              <Button onClick={() => setIsAdding(true)} leftIcon={<span className="material-icons-round">person_add</span>}>
                Thêm học viên đầu tiên
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={styles.entityList}>
          {filteredStudents.map((student: any) => {
            const activeClass = student.class_students && student.class_students.length > 0 ? student.class_students[0] : null;
            const currentClassName = activeClass ? activeClass.venue_classes?.name : null;
            const currentVenueName = activeClass 
              ? (activeClass.venue_classes?.venues?.name || 'Chi nhánh') 
              : (student.venues?.name || 'Chưa chọn cơ sở');

            const beltName = student.organization_belts?.name;
            const beltStyle = getBeltStyle(beltName);
            const ageText = calculateAge(student.dob);

            return (
              <div 
                key={student.id} 
                className={styles.entityCard}
                style={{ 
                  gridTemplateColumns: '48px 1.4fr 130px 1.2fr 1.2fr 100px auto',
                  alignItems: 'center'
                }}
              >
                {/* 1. Avatar */}
                <div 
                  className={styles.entityAvatar}
                  style={{
                    backgroundColor: beltStyle.bg,
                    color: beltStyle.text,
                    borderColor: beltStyle.border
                  }}
                >
                  <span>{student.name?.[0]?.toUpperCase() || 'V'}</span>
                </div>

                {/* 2. Main Info (Tên, Ngày sinh & Tuổi) */}
                <div className={styles.entityMain}>
                  <div className={styles.entityTitleRow}>
                    <span className={styles.entityTitle}>{student.name}</span>
                  </div>
                  <div className={styles.entitySubtitle} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons-round" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>cake</span>
                    <span>
                      {student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : 'Chưa có NS'}
                      {ageText && ` (${ageText})`}
                    </span>
                    {student.phone && (
                      <>
                        <span style={{ color: 'var(--border)' }}>•</span>
                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{student.phone}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Cấp đai võ thuật */}
                <div className={styles.entityBadge}>
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: beltStyle.bg,
                      color: beltStyle.text,
                      border: `1px solid ${beltStyle.border}`
                    }}
                  >
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: beltStyle.text 
                      }} 
                    />
                    {beltName || 'Chưa có đai'}
                  </span>
                </div>

                {/* 4. Phân lớp & Cơ sở */}
                <div className={styles.entityMetric} style={{ width: 'auto' }}>
                  <span className={styles.metricLabel}>LỚP HỌC & CƠ SỞ</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {currentClassName ? (
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {currentClassName}
                      </span>
                    ) : (
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        color: 'var(--accent-energy)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <span className="material-icons-round" style={{ fontSize: '14px' }}>warning_amber</span>
                        Chưa xếp lớp
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {currentVenueName}
                    </span>
                  </div>
                </div>

                {/* 5. Phụ huynh / Liên hệ */}
                <div className={styles.entityMetric} style={{ width: 'auto' }}>
                  <span className={styles.metricLabel}>NGƯỜI GIÁM HỘ</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>
                      {student.parent_name || 'Chưa cập nhật PH'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 500 }}>
                      {student.parent_phone ? `SĐT: ${student.parent_phone}` : ''}
                    </span>
                  </div>
                </div>

                {/* 6. Trạng thái */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Badge 
                    variant={
                      student.status === 'active' 
                        ? 'success' 
                        : student.status === 'suspended' 
                        ? 'warning' 
                        : 'default'
                    }
                  >
                    {student.status === 'active' 
                      ? 'Đang học' 
                      : student.status === 'suspended' 
                      ? 'Bảo lưu' 
                      : 'Đã nghỉ'}
                  </Badge>
                </div>

                {/* 7. Cột Thao tác */}
                {isAdminOrOwner && (
                  <div className={styles.entityActions} style={{ width: 'auto', gap: '6px' }}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(student)}
                      leftIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>}
                    >
                      Sửa
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-danger hover:bg-danger-bg"
                      onClick={() => handleDelete(student.id, student.name)}
                      disabled={loading}
                      title="Xóa võ sinh"
                    >
                      <span className="material-icons-round" style={{ fontSize: '16px' }}>delete_outline</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
