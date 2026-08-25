"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";

import { User } from '@supabase/supabase-js';
import { Coach } from '@/types/coach';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: User | null;
  userData: Coach | null;
}

export default function DashboardLayoutClient({ children, user, userData }: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="mobile-topbar">
        <button 
          className="btn-hamburger" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Menu"
        >
          <span className="material-icons-round">menu</span>
        </button>
        <div className="sidebar-logo">
          <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>sports_martial_arts</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Chấm Công HLV</span>
      </div>

      <Sidebar 
        user={user} 
        userData={userData} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </>
  );
}
