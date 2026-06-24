"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

      if (error) throw error;
      // Redirect happens automatically
    } catch (err: any) {
      setErrorMsg("Lỗi đăng nhập: " + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="material-icons-round">sports_martial_arts</span>
        </div>
        <h1 className="login-title">Quản Lý Chấm Công</h1>
        <p className="login-subtitle">Hệ thống điểm danh và tính lương cho Huấn luyện viên</p>
        
        {errorMsg && (
          <div style={{ color: "red", marginBottom: "1rem", fontSize: "14px" }}>
            {errorMsg}
          </div>
        )}

        <button 
          className="btn btn-google btn-lg w-full" 
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="loading-spinner" style={{ width: "20px", height: "20px", marginRight: "8px", display: "inline-block", verticalAlign: "middle" }}>
              <div className="spinner-ring" style={{ borderWidth: "2px" }}></div>
            </div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: "8px", verticalAlign: "middle" }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập bằng Google"}
        </button>
        
        <p className="login-footer">
          Đăng nhập bằng tài khoản Google đã được quản trị viên cấp quyền.<br/>
          Người đăng nhập đầu tiên sẽ trở thành quản trị viên.
        </p>
      </div>
    </div>
  );
}
