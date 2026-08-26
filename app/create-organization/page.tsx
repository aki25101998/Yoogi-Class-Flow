'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizationAction } from './actions';

export default function CreateOrganizationPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !slug) {
      setError('Vui lòng nhập đầy đủ tên và slug.');
      return;
    }
    
    // basic slug validation
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError('Slug chỉ được chứa chữ cái viết thường, số và dấu gạch ngang.');
      return;
    }

    setLoading(true);
    const result = await createOrganizationAction(name, slug);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Có lỗi xảy ra khi tạo tổ chức.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
      <div style={{ backgroundColor: 'var(--surface)', padding: '40px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>Tạo Tổ Chức</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', textAlign: 'center' }}>
          Bạn chưa thuộc tổ chức nào. Hãy tạo một tổ chức mới để bắt đầu.
        </p>

        {error && (
          <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tên tổ chức</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="VD: Yoogi Taekwondo"
              style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}
              disabled={loading}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Slug (đường dẫn)</label>
            <input 
              type="text" 
              value={slug} 
              onChange={e => setSlug(e.target.value.toLowerCase())}
              placeholder="VD: yoogi-taekwondo"
              style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}
              disabled={loading}
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Dùng làm đường dẫn duy nhất cho tổ chức của bạn.</small>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: loading ? 'var(--secondary)' : 'var(--primary)', 
              color: 'var(--text-on-primary)', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Đang tạo...' : 'Tạo tổ chức'}
          </button>
        </form>
      </div>
    </div>
  );
}
