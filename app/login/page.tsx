"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const searchParams = useSearchParams();

  // Handle error returned from the callback route
  const errorParam = searchParams.get("error");
  
  // Set initial error message based on URL parameters
  useState(() => {
    if (errorParam === "unauthorized") {
      setErrorMsg("Tài khoản của bạn chưa được cấp quyền truy cập. Vui lòng liên hệ quản trị viên.");
    } else if (errorParam === "auth_failed") {
      setErrorMsg("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  });

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    
    const supabase = createClient();
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
      // Redirect happens automatically by Supabase
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "Đã xảy ra lỗi không xác định khi đăng nhập.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--background)', padding: 'var(--space-4)' }}>
      <div className="login-card" style={{ 
        backgroundColor: 'var(--surface)', 
        padding: 'var(--space-8)', 
        borderRadius: 'var(--radius-lg)', 
        boxShadow: 'var(--shadow-md)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <div style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          borderRadius: 'var(--radius-full)',
          marginBottom: 'var(--space-4)'
        }}>
          <span className="material-icons-round" style={{ fontSize: '32px' }}>sports_martial_arts</span>
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 'var(--space-2)' }}>
          Quản Lý Chấm Công
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: '0.95rem' }}>
          Hệ thống điểm danh và tính lương cho Huấn luyện viên
        </p>
        
        {errorMsg && (
          <div style={{
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-6)',
            fontSize: '0.9rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-2)',
            border: '1px solid var(--danger)'
          }}>
            <span className="material-icons-round" style={{ fontSize: "20px" }}>error_outline</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          style={{ 
            width: "100%", 
            height: "44px", 
            backgroundColor: 'var(--surface)',
            color: 'var(--text-main)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            fontWeight: 500,
            transition: 'background-color 0.2s',
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseOver={(e) => {
            if(!isLoading) e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
          }}
          onMouseOut={(e) => {
            if(!isLoading) e.currentTarget.style.backgroundColor = 'var(--surface)';
          }}
        >
          {isLoading ? (
            <div style={{ width: "20px", height: "20px", display: "inline-block", verticalAlign: "middle" }}>
              <div style={{ 
                width: '100%', 
                height: '100%', 
                border: '2px solid var(--border)', 
                borderTopColor: 'var(--primary)', 
                borderRadius: '50%',
                animation: 'spin 1s linear infinite' 
              }}></div>
            </div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {isLoading ? "Đang xử lý..." : "Tiếp tục với Google"}
        </button>
        
        <p style={{ marginTop: 'var(--space-6)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Đăng nhập bằng tài khoản Google đã được quản trị viên cấp quyền.
        </p>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .min-h-screen { min-height: 100vh; }
      `}} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
        <div className="loading-spinner" style={{ width: "40px", height: "40px", display: "inline-block" }}>
          <div className="spinner-ring" style={{ borderWidth: "3px", borderTopColor: "var(--primary)" }}></div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
