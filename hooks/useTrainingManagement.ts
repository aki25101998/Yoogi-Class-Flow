import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export function useTrainingManagement(organizationId: string | undefined) {
  const supabase = createClient();

  // 1. Level 1: Venues List (with stats)
  const {
    data: venues = [],
    isLoading: isVenuesLoading,
    error: venuesError,
  } = useQuery({
    queryKey: ['training', organizationId, 'venues'],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id, 
          name, 
          address,
          status,
          venue_classes(id, status, class_students(id, status))
        `)
        .eq('organization_id', organizationId)
        .order('name');
        
      if (error) throw error;
      
      // Calculate summary stats per venue
      return data.map(venue => {
        const activeClasses = venue.venue_classes?.filter((c: any) => c.status === 'active') || [];
        const studentsCount = activeClasses.reduce((acc: number, c: any) => {
          return acc + (c.class_students?.filter((s: any) => s.status === 'active').length || 0);
        }, 0);
        
        return {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          status: venue.status,
          activeClassesCount: activeClasses.length,
          totalStudentsCount: studentsCount
        };
      });
    },
    enabled: !!organizationId,
  });

  return {
    venues,
    isVenuesLoading,
    venuesError,
  };
}

export function useTrainingVenueDetails(organizationId: string | undefined, venueId: string | undefined) {
  const supabase = createClient();

  // Level 2: Venue details + Classes
  const {
    data: venue = null,
    isLoading: isVenueLoading,
    error: venueError,
  } = useQuery({
    queryKey: ['training', organizationId, 'venueDetails', venueId],
    queryFn: async () => {
      if (!organizationId || !venueId) return null;
      
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .eq('organization_id', organizationId)
        .single();
        
      if (venueError) throw venueError;
      
      const { data: classesData, error: classesError } = await supabase
        .from('venue_classes')
        .select(`
          *,
          class_students(id, status),
          head_coach:head_coach_id(name),
          assistant_coach:assistant_coach_id(name)
        `)
        .eq('venue_id', venueId)
        .eq('organization_id', organizationId)
        .order('name');
        
      if (classesError) throw classesError;

      const classesWithStats = classesData.map((c: any) => ({
        ...c,
        studentsCount: c.class_students?.filter((s: any) => s.status === 'active').length || 0
      }));
      
      const activeClassIds = classesData.filter((c: any) => c.status === 'active').map((c: any) => c.id);
      let venueStudents: any[] = [];
      
      if (activeClassIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('class_students')
          .select(`
            status,
            class_id,
            venue_classes(name),
            students(id, name, dob, phone, parent_name, parent_phone, status, organization_belts(id, name))
          `)
          .in('class_id', activeClassIds)
          .eq('status', 'active');
          
        if (studentsError) throw studentsError;

        const uniqueStudentsMap = new Map();
        studentsData?.forEach((cs: any) => {
          if (cs.students && cs.students.status === 'active') {
            if (!uniqueStudentsMap.has(cs.students.id)) {
              uniqueStudentsMap.set(cs.students.id, {
                ...cs.students,
                class_name: cs.venue_classes?.name,
                class_id: cs.class_id,
              });
            }
          }
        });
        venueStudents = Array.from(uniqueStudentsMap.values());
      }

      return {
        ...venueData,
        classes: classesWithStats,
        students: venueStudents
      };
    },
    enabled: !!organizationId && !!venueId,
  });

  return {
    venue,
    isVenueLoading,
    venueError,
  };
}

export function useTrainingClassDetails(organizationId: string | undefined, venueId: string | undefined, classId: string | undefined) {
  const supabase = createClient();

  // Level 3: Class details + Students
  const {
    data: classDetails = null,
    isLoading: isClassLoading,
    error: classError,
  } = useQuery({
    queryKey: ['training', organizationId, 'classDetails', classId],
    queryFn: async () => {
      if (!organizationId || !venueId || !classId) return null;
      
      // Get class details
      const { data: classData, error: classInfoError } = await supabase
        .from('venue_classes')
        .select(`
          *,
          venues(name),
          head_coach:head_coach_id(name),
          assistant_coach:assistant_coach_id(name)
        `)
        .eq('id', classId)
        .eq('venue_id', venueId)
        .eq('organization_id', organizationId)
        .single();
        
      if (classInfoError) throw classInfoError;
      
      // Get students mapped to this class
      const { data: classStudents, error: classStudentsError } = await supabase
        .from('class_students')
        .select(`
          id, status,
          students(id, name, phone, dob, parent_name, parent_phone, status, organization_belts(id, name))
        `)
        .eq('class_id', classId);
        
      if (classStudentsError) throw classStudentsError;
      
      const studentsList = classStudents.map((cs: any) => ({
        ...cs.students,
        class_student_id: cs.id,
        class_student_status: cs.status,
      }));
      
      return {
        ...classData,
        students: studentsList
      };
    },
    enabled: !!organizationId && !!venueId && !!classId,
  });

  return {
    classDetails,
    isClassLoading,
    classError,
  };
}

// Helper to fetch global lookup data required for forms (Belts, active venues, etc.)
export function useTrainingFormLookups(organizationId: string | undefined, venueId?: string) {
  const supabase = createClient();

  const { data: activeBelts = [] } = useQuery({
    queryKey: ['activeBelts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_belts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: activeClassesForVenue = [] } = useQuery({
    queryKey: ['activeClasses', organizationId, venueId],
    queryFn: async () => {
      if (!organizationId || !venueId) return [];
      const { data, error } = await supabase
        .from('venue_classes')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('venue_id', venueId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && !!venueId,
  });
  
  const { data: activeCoaches = [] } = useQuery({
    queryKey: ['activeCoaches', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('coaches')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    activeBelts,
    activeClassesForVenue,
    activeCoaches,
  };
}
