"use client";

import { createContext, useContext, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { Coach } from "@/types/coach";

// Cấu trúc Context của Organization (trùng với interface trả về từ getCurrentOrganizationContext)
interface DashboardContextType {
  user: User | null;
  userData: Coach | null;
  context: any; // Ideally we use OrganizationContext type here
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({
  children,
  user,
  userData,
  context,
}: {
  children: ReactNode;
  user: User | null;
  userData: Coach | null;
  context: any;
}) {
  return (
    <DashboardContext.Provider value={{ user, userData, context }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboardContext must be used within a DashboardProvider");
  }
  return context;
}
