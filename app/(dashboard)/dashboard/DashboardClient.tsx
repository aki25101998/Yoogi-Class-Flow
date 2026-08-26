'use client';

export default function DashboardClient({ isAdminOrOwner, stats, context }: any) {
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 'bold' }}>Tổng Quan Hệ Thống</h1>
        <div className="page-actions">
          <span className="material-icons-round" style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--text-light)' }}>calendar_today</span>
          <span style={{ color: 'var(--text-light)', fontWeight: 500 }}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        
        {isAdminOrOwner && (
          <div className="stat-card" style={{ backgroundColor: 'var(--surface-color)', padding: '24px', borderRadius: '8px', boxShadow: 'var(--card-shadow)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '12px', borderRadius: '50%', display: 'flex' }}>
              <span className="material-icons-round">people</span>
            </div>
            <div className="stat-content">
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.coachCount}</div>
              <div className="stat-label" style={{ color: 'var(--text-secondary)' }}>Huấn luyện viên</div>
            </div>
          </div>
        )}

        <div className="stat-card" style={{ backgroundColor: 'var(--surface-color)', padding: '24px', borderRadius: '8px', boxShadow: 'var(--card-shadow)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="stat-icon" style={{ backgroundColor: '#fce4ec', color: '#c2185b', padding: '12px', borderRadius: '50%', display: 'flex' }}>
            <span className="material-icons-round">class</span>
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.classCount}</div>
            <div className="stat-label" style={{ color: 'var(--text-secondary)' }}>{isAdminOrOwner ? 'Lớp học đang mở' : 'Lớp được phân công'}</div>
          </div>
        </div>

        {isAdminOrOwner && (
          <div className="stat-card" style={{ backgroundColor: 'var(--surface-color)', padding: '24px', borderRadius: '8px', boxShadow: 'var(--card-shadow)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#e8f5e9', color: '#388e3c', padding: '12px', borderRadius: '50%', display: 'flex' }}>
              <span className="material-icons-round">school</span>
            </div>
            <div className="stat-content">
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.studentCount}</div>
              <div className="stat-label" style={{ color: 'var(--text-secondary)' }}>Học viên</div>
            </div>
          </div>
        )}

        {isAdminOrOwner && (
          <div className="stat-card" style={{ backgroundColor: 'var(--surface-color)', padding: '24px', borderRadius: '8px', boxShadow: 'var(--card-shadow)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#fff8e1', color: '#fbc02d', padding: '12px', borderRadius: '50%', display: 'flex' }}>
              <span className="material-icons-round">location_on</span>
            </div>
            <div className="stat-content">
              <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.venueCount}</div>
              <div className="stat-label" style={{ color: 'var(--text-secondary)' }}>Địa điểm</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '24px', backgroundColor: 'var(--surface-color)', padding: '24px', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Lịch hôm nay</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Hiện không có lịch dạy nào trong ngày hôm nay.</p>
      </div>

    </div>
  );
}
