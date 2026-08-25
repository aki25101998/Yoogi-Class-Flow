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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>Tạo Tổ Chức</h1>
        <p style={{ color: '#4b5563', marginBottom: '24px', textAlign: 'center' }}>
          Bạn chưa thuộc tổ chức nào. Hãy tạo một tổ chức mới để bắt đầu.
        </p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px' }}>
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
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px' }}
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
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              disabled={loading}
            />
            <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>Dùng làm đường dẫn duy nhất cho tổ chức của bạn.</small>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: loading ? '#9ca3af' : '#2563eb', 
              color: 'white', 
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
