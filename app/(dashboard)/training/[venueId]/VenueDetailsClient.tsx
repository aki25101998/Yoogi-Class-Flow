'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardContext } from '../../DashboardProvider';
import { useTrainingVenueDetails, useTrainingFormLookups } from '@/hooks/useTrainingManagement';
import { addClassAction, updateClassAction, addStudentAction, updateStudentAction } from '../actions';

import { Button } from '@/app/components/ui/Button';
import { Input, Select } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/app/components/ui/Modal';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import styles from './VenueDetails.module.css';

export default function VenueDetailsClient({ venueId }: { venueId: string }) {
  const { context } = useDashboardContext();
  const organizationId = context?.organization?.id;
  const currentUserRole = context?.membership?.role;
  const isAdminOrOwner = currentUserRole === 'admin' || currentUserRole === 'owner';

  const { venue, isVenueLoading, venueError } = useTrainingVenueDetails(organizationId, venueId);
  const { activeCoaches, activeBelts, activeClassesForVenue } = useTrainingFormLookups(organizationId, venueId);
  
  const queryClient = useQueryClient();

  // Class Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState({ name: '', head_coach_id: '', assistant_coach_id: '', status: 'active' });

  // Student Modal State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', current_belt_id: '', class_id: '' });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForms = () => {
    setClassForm({ name: '', head_coach_id: '', assistant_coach_id: '', status: 'active' });
    setStudentForm({ name: '', phone: '', parent_name: '', parent_phone: '', dob: '', current_belt_id: '', class_id: '' });
    setIsClassModalOpen(false);
    setIsStudentModalOpen(false);
    setEditingClassId(null);
    setEditingStudentId(null);
    setError('');
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['training', organizationId] });
  };

  // --- Class Submission ---
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!classForm.name.trim()) {
      setError('Vui lòng nhập tên lớp học');
      return;
    }

    setLoading(true);
    
    const payload = {
      ...classForm,
      venue_id: venueId,
      head_coach_id: classForm.head_coach_id || undefined,
      assistant_coach_id: classForm.assistant_coach_id || undefined,
    };

    if (editingClassId) {
      const res = await updateClassAction(editingClassId, payload);
      setLoading(false);
      if (res.success) {
        resetForms();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi cập nhật lớp');
    } else {
      const res = await addClassAction(payload);
      setLoading(false);
      if (res.success) {
        resetForms();
        handleSuccess();
      } else setError(res.error || 'Lỗi khi thêm lớp');
    }
  };

  const handleEditClass = (cls: any) => {
    setEditingClassId(cls.id);
    setClassForm({
      name: cls.name,
      head_coach_id: cls.head_coach_id || '',
      assistant_coach_id: cls.assistant_coach_id || '',
      status: cls.status || 'active'
    });
    setIsClassModalOpen(true);
  };

  // --- Student Submission ---
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!studentForm.name.trim()) {
      setError('Vui lòng nhập họ tên học viên');
      return;
    }
    if (!studentForm.dob) {
      setError('Vui lòng chọn ngày sinh');
      return;
    }

    setLoading(true);
    const payload = {
      ...studentForm,
      venue_id: venueId,
      current_belt_id: studentForm.current_belt_id || undefined,
      class_id: studentForm.class_id || undefined,
    };

    if (editingStudentId) {
      const res = await updateStudentAction(editingStudentId, payload, payload.class_id);
      setLoading(false);
      
      if (res.success) {
        resetForms();
        handleSuccess();
      } else {
        setError(res.error || 'Lỗi khi cập nhật học viên');
      }
    } else {
      const res = await addStudentAction(payload);
      setLoading(false);
      
      if (res.success) {
        resetForms();
        handleSuccess();
      } else {
        setError(res.error || 'Lỗi khi thêm học viên');
      }
    }
  };

  const handleEditStudent = (student: any) => {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name || '',
      phone: student.phone || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      dob: student.dob || '',
      current_belt_id: student.organization_belts?.id || '',
      class_id: student.class_id || ''
    });
    setIsStudentModalOpen(true);
  };

  if (isVenueLoading) {
    return <div className="p-8 text-center text-secondary">Đang tải thông tin địa điểm...</div>;
  }

  if (venueError) {
    console.error('Lỗi khi tải thông tin địa điểm (venue query error):', venueError);
    return (
      <div className={styles.venuePage}>
        <Link href="/training" className={styles.backLink}>
          <span className={`material-icons-round ${styles.backLinkIcon}`}>arrow_back</span>
          Quay lại
        </Link>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInfo}>
            <h1>Lỗi tải dữ liệu</h1>
          </div>
        </div>
        <div className={styles.emptyCompact}>
          <span className={`material-icons-round ${styles.emptyIcon}`}>error</span>
          <div className={styles.emptyTitle}>Không thể tải dữ liệu địa điểm</div>
          <div className={styles.emptyDesc}>Vui lòng thử lại sau hoặc liên hệ hỗ trợ.</div>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className={styles.venuePage}>
        <Link href="/training" className={styles.backLink}>
          <span className={`material-icons-round ${styles.backLinkIcon}`}>arrow_back</span>
          Quay lại
        </Link>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInfo}>
            <h1>Không tìm thấy địa điểm</h1>
          </div>
        </div>
        <div className={styles.emptyCompact}>
          <span className={`material-icons-round ${styles.emptyIcon}`}>lock</span>
          <div className={styles.emptyTitle}>Bạn không có quyền truy cập địa điểm này</div>
          <div className={styles.emptyDesc}>Hoặc địa điểm không tồn tại trên hệ thống.</div>
        </div>
      </div>
    );
  }

  const classes = venue.classes || [];
  const activeClassesCount = classes.filter((c: any) => c.status === 'active').length;
  const students = venue.students || [];
  const totalStudents = students.length;

  if (venue.classesError) {
    console.error('Lỗi khi tải danh sách lớp học:', venue.classesError);
  }
  if (venue.studentsError) {
    console.error('Lỗi khi tải danh sách học viên:', venue.studentsError);
  }

  return (
    <div className={styles.venuePage}>
      {/* ═══════════════════════════════════════════════════════
          BACK LINK
          ═══════════════════════════════════════════════════════ */}
      <Link href="/training" className={styles.backLink}>
        <span className={`material-icons-round ${styles.backLinkIcon}`}>arrow_back</span>
        Quay lại danh sách
      </Link>

      {/* ═══════════════════════════════════════════════════════
          PAGE HEADER (compact, payroll-style)
          ═══════════════════════════════════════════════════════ */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInfo}>
          <h1>{venue.name}</h1>
          <p>{venue.address || 'Chưa cập nhật địa chỉ'}</p>
        </div>
        {isAdminOrOwner && (
          <div className={styles.pageHeaderActions}>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsStudentModalOpen(true)}
              leftIcon={<span className="material-icons-round" style={{ fontSize: 18 }}>person_add</span>}
            >
              Thêm Học Viên
            </Button>
            <Button 
              size="sm"
              onClick={() => setIsClassModalOpen(true)}
              leftIcon={<span className="material-icons-round" style={{ fontSize: 18 }}>add_circle</span>}
            >
              Tạo Lớp
            </Button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          OVERVIEW CARD — Single compact card with 3 KPIs
          ═══════════════════════════════════════════════════════ */}
      <div className={styles.overviewCard}>
        <div className={styles.overviewHeader}>
          <span className={styles.overviewTitle}>Tổng quan địa điểm</span>
          <Badge variant={venue.status === 'active' ? 'success' : 'default'}>
            {venue.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
          </Badge>
        </div>
        <div className={styles.overviewGrid}>
          <div className={`${styles.kpiItem} ${styles.kpiPrimary}`}>
            <div className={styles.kpiLabel}>
              <span className={styles.kpiDot} />
              Lớp đang hoạt động
            </div>
            <div className={styles.kpiValue}>{activeClassesCount}</div>
          </div>
          <div className={`${styles.kpiItem} ${styles.kpiSuccess}`}>
            <div className={styles.kpiLabel}>
              <span className={styles.kpiDot} />
              Tổng học viên
            </div>
            <div className={styles.kpiValue}>{totalStudents}</div>
          </div>
          <div className={`${styles.kpiItem} ${styles.kpiStatus}`}>
            <div className={styles.kpiLabel}>
              <span className={styles.kpiDot} />
              Tổng lớp học
            </div>
            <div className={styles.kpiValue}>{classes.length}</div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CLASS LIST — Row-based compact layout
          ═══════════════════════════════════════════════════════ */}
      <div>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Danh sách lớp học</span>
          <span className={styles.sectionCount}>{classes.length} lớp</span>
        </div>
        {venue.classesError ? (
          <div className={styles.errorBar}>
            <span className={`material-icons-round ${styles.errorBarIcon}`}>error_outline</span>
            <span>Không thể tải danh sách lớp học do lỗi dữ liệu.</span>
          </div>
        ) : classes.length === 0 ? (
          <div className={styles.emptyCompact}>
            <span className={`material-icons-round ${styles.emptyIcon}`}>event_seat</span>
            <div className={styles.emptyTitle}>Chưa có lớp học nào</div>
            <div className={styles.emptyDesc}>Bấm &apos;Tạo Lớp&apos; để thêm lớp học mới vào địa điểm này.</div>
          </div>
        ) : (
          <div className={styles.classList}>
            {classes.map((cls: any) => (
              <div key={cls.id} className={styles.classRow}>
                {/* Class name */}
                <div className={styles.className}>{cls.name}</div>

                {/* Status badge */}
                <Badge variant={cls.status === 'active' ? 'success' : 'default'}>
                  {cls.status === 'active' ? 'Hoạt động' : 'Đã đóng'}
                </Badge>

                {/* Head coach */}
                <div className={styles.classCoach}>
                  <div className={styles.classCoachLabel}>HLV trưởng</div>
                  <div className={cls.head_coach?.name ? styles.classCoachName : `${styles.classCoachName} ${styles.classCoachEmpty}`}>
                    {cls.head_coach?.name || 'Chưa phân công'}
                  </div>
                </div>

                {/* Assistant coach (hidden on tablet) */}
                <div className={`${styles.classCoach} ${styles.classCoachHideable}`}>
                  <div className={styles.classCoachLabel}>HLV phụ</div>
                  <div className={cls.assistant_coach?.name ? styles.classCoachName : `${styles.classCoachName} ${styles.classCoachEmpty}`}>
                    {cls.assistant_coach?.name || 'Không có'}
                  </div>
                </div>

                {/* Student count */}
                <div className={styles.classStudentCount}>
                  <div className={styles.classStudentNumber}>{cls.studentsCount}</div>
                  <div className={styles.classStudentLabel}>Học viên</div>
                </div>

                {/* Actions */}
                <div className={styles.classActions}>
                  <Link href={`/training/${venueId}/classes/${cls.id}`}>
                    <Button variant="outline" size="sm">Xem lớp</Button>
                  </Link>
                  {isAdminOrOwner && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditClass(cls)}
                      title="Sửa lớp"
                    >
                      <span className="material-icons-round" style={{ fontSize: 18 }}>edit</span>
                    </Button>
                  )}
                </div>

                {/* Mobile info (visible only on small screens) */}
                <div className={styles.classMobileInfo}>
                  <span>HLV: {cls.head_coach?.name || 'Chưa có'}</span>
                  <span>·</span>
                  <span>{cls.studentsCount} học viên</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          STUDENT TABLE — Kept intact, consistent section heading
          ═══════════════════════════════════════════════════════ */}
      <div>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Học viên tại địa điểm</span>
          <span className={styles.sectionCount}>{students.length} học viên</span>
        </div>
        {venue.studentsError ? (
          <div className={styles.errorBar}>
            <span className={`material-icons-round ${styles.errorBarIcon}`}>error_outline</span>
            <span>Không thể tải danh sách học viên do lỗi dữ liệu.</span>
          </div>
        ) : students.length === 0 ? (
          <div className={styles.emptyCompact}>
            <span className={`material-icons-round ${styles.emptyIcon}`}>people</span>
            <div className={styles.emptyTitle}>Chưa có học viên nào tại địa điểm này</div>
            <div className={styles.emptyDesc}>Bấm &apos;Thêm Học Viên&apos; để ghi danh học viên mới.</div>
          </div>
        ) : (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên học viên</TableHead>
                  <TableHead>Ngày sinh</TableHead>
                  <TableHead>SĐT / Phụ huynh</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Cấp đai</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {isAdminOrOwner && <TableHead className="w-20"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium text-main">{student.name}</TableCell>
                    <TableCell>{new Date(student.dob).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {student.phone && <span>{student.phone}</span>}
                        {student.parent_phone && <span className="text-sm text-secondary">PH: {student.parent_phone}</span>}
                        {!student.phone && !student.parent_phone && <span className="text-secondary italic">Chưa cập nhật</span>}
                      </div>
                    </TableCell>
                    <TableCell>{student.class_name || <span className="text-secondary italic">Chưa xếp lớp</span>}</TableCell>
                    <TableCell>
                      {student.organization_belts ? (
                        <Badge variant="info">{student.organization_belts.name}</Badge>
                      ) : (
                        <span className="text-secondary italic">Chưa có</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'active' ? 'success' : 'default'}>
                        {student.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
                      </Badge>
                    </TableCell>
                    {isAdminOrOwner && (
                      <TableCell>
                        <div className="flex justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditStudent(student)}
                            title="Sửa học viên"
                          >
                            <span className="material-icons-round text-secondary hover:text-primary">edit</span>
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>

      {/* Class Modal */}
      <Modal isOpen={isClassModalOpen} onClose={loading ? () => {} : resetForms}>
        <ModalHeader title={editingClassId ? 'Sửa thông tin lớp' : 'Tạo lớp học mới'} onClose={loading ? () => {} : resetForms} />
        <ModalBody>
          {error && (
            <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-md text-sm mb-5 flex items-center gap-2">
              <span className="material-icons-round text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}
          <form id="class-form" onSubmit={handleClassSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Input 
              label="Tên lớp học *" 
              required 
              value={classForm.name} 
              onChange={e => setClassForm({...classForm, name: e.target.value})} 
            />
            
            <Select 
              label="HLV Trưởng"
              value={classForm.head_coach_id} 
              onChange={e => setClassForm({...classForm, head_coach_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chọn HLV --' },
                ...activeCoaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            
            <Select 
              label="HLV Phụ (Không bắt buộc)"
              value={classForm.assistant_coach_id} 
              onChange={e => setClassForm({...classForm, assistant_coach_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chọn HLV --' },
                ...activeCoaches.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
            
            <Select 
              label="Trạng thái"
              value={classForm.status} 
              onChange={e => setClassForm({...classForm, status: e.target.value})} 
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Ngừng hoạt động' }
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForms} disabled={loading}>Hủy</Button>
          <Button type="submit" form="class-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>

      {/* Student Modal */}
      <Modal isOpen={isStudentModalOpen} onClose={loading ? () => {} : resetForms}>
        <ModalHeader title={editingStudentId ? 'Sửa học viên' : 'Thêm học viên mới'} onClose={loading ? () => {} : resetForms} />
        <ModalBody>
          {error && (
            <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded-md text-sm mb-5 flex items-center gap-2">
              <span className="material-icons-round text-lg">error_outline</span>
              <span>{error}</span>
            </div>
          )}
          <form id="student-form" onSubmit={handleStudentSubmit} style={{ display: 'grid', gap: '16px' }}>
            <Input 
              label="Tên học viên *" 
              required 
              value={studentForm.name} 
              onChange={e => setStudentForm({...studentForm, name: e.target.value})} 
            />
            <Input 
              label="Ngày sinh *" 
              type="date"
              required 
              value={studentForm.dob} 
              onChange={e => setStudentForm({...studentForm, dob: e.target.value})} 
            />
            <Input 
              label="Số điện thoại" 
              value={studentForm.phone} 
              onChange={e => setStudentForm({...studentForm, phone: e.target.value})} 
            />
            <Input 
              label="Tên phụ huynh" 
              value={studentForm.parent_name} 
              onChange={e => setStudentForm({...studentForm, parent_name: e.target.value})} 
            />
            <Input 
              label="SĐT phụ huynh" 
              value={studentForm.parent_phone} 
              onChange={e => setStudentForm({...studentForm, parent_phone: e.target.value})} 
            />
            
            <Select 
              label="Đai hiện tại"
              value={studentForm.current_belt_id} 
              onChange={e => setStudentForm({...studentForm, current_belt_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chọn đai --' },
                ...activeBelts.map((b: any) => ({ value: b.id, label: b.name }))
              ]}
            />
            
            <Select 
              label="Xếp vào lớp học"
              value={studentForm.class_id} 
              onChange={e => setStudentForm({...studentForm, class_id: e.target.value})} 
              options={[
                { value: '', label: '-- Chỉ ghi danh, chưa xếp lớp --' },
                ...activeClassesForVenue.map((c: any) => ({ value: c.id, label: c.name }))
              ]}
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={resetForms} disabled={loading}>Hủy</Button>
          <Button type="submit" form="student-form" isLoading={loading} variant="primary">Lưu</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
