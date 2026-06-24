import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  
  // Example fetching data for dashboard
  const [{ count: coachCount }, { count: classCount }, { count: venueCount }, { count: studentCount }] = await Promise.all([
    supabase.from('coaches').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('classes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('venues').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active')
  ]);

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Tổng Quan Hệ Thống</h1>
        <div className="page-actions">
          <span className="material-icons-round" style={{ verticalAlign: 'middle', marginRight: '4px', color: 'var(--text-light)' }}>calendar_today</span>
          <span style={{ color: 'var(--text-light)', fontWeight: 500 }}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}>
            <span className="material-icons-round">people</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{coachCount || 0}</div>
            <div className="stat-label">Huấn luyện viên</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fce4ec', color: '#c2185b' }}>
            <span className="material-icons-round">class</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{classCount || 0}</div>
            <div className="stat-label">Lớp học đang mở</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e8f5e9', color: '#388e3c' }}>
            <span className="material-icons-round">school</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{studentCount || 0}</div>
            <div className="stat-label">Học viên đang học</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fff8e1', color: '#fbc02d' }}>
            <span className="material-icons-round">location_on</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{venueCount || 0}</div>
            <div className="stat-label">Địa điểm</div>
          </div>
        </div>
      </div>
      
      <div className="empty-state" style={{ marginTop: '2rem' }}>
        <div className="empty-icon">
          <span className="material-icons-round">construction</span>
        </div>
        <p>Hệ thống đang được chuyển đổi sang Next.js App Router.</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
          Giao diện và các màn hình khác sẽ tiếp tục được cập nhật.
        </p>
      </div>
    </div>
  );
}
