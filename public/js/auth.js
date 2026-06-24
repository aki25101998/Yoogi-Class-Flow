// Authentication module — Google OAuth with Supabase
import { supabaseClient } from './supabase-config.js';

const supabase = supabaseClient;

// Current user state
let currentUser = null;
let currentUserData = null;

/**
 * Sign in with Google
 * Uses redirect by default in Supabase.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  
  if (error) throw error;
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  currentUser = null;
  currentUserData = null;
  await supabase.auth.signOut();
}

let globalAuthCallback = null;

/**
 * Listen for auth state changes
 * @param {Function} callback - receives (user, userData) or (null, null)
 */
export function onAuthStateChange(callback) {
  globalAuthCallback = callback;
  
  // We need to handle initial session and subsequent changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      const user = session.user;
      currentUser = user;
      
      try {
        const email = user.email.toLowerCase().trim();
        
        // 1. Check if user is in coaches table
        const { data: coaches, error } = await supabase
          .from('coaches')
          .select('*')
          .eq('email', email);
          
        if (error) throw error;
        
        if (coaches && coaches.length > 0) {
          currentUserData = coaches[0];
          callback(user, currentUserData);
        } else {
          // 2. Not in coaches table. Check if any coaches exist.
          const { count, error: countError } = await supabase
            .from('coaches')
            .select('*', { count: 'exact', head: true });
            
          if (countError) throw countError;
          
          if (count === 0) {
            // First user ever -> make them admin
            const adminData = {
              name: user.user_metadata?.full_name || 'Admin',
              email: email,
              phone: '',
              cccd: '',
              level: '',
              membership_number: '',
              role: 'admin',
              permissions: {},
              status: 'active',
              photo_url: user.user_metadata?.avatar_url || ''
            };
            
            const { data: newAdmin, error: insertError } = await supabase
              .from('coaches')
              .insert([adminData])
              .select();
              
            if (insertError) throw insertError;
            
            currentUserData = newAdmin[0];
            callback(user, currentUserData);
          } else {
            // Not first user -> UNAUTHORIZED
            await supabase.auth.signOut();
            callback(null, null);
            // We could trigger an event or alert for unauthorized, but returning null handles it.
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        callback(null, null);
      }
    } else {
      currentUser = null;
      currentUserData = null;
      callback(null, null);
    }
  });
}

/**
 * Get current user
 * @returns {object|null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get current user data from DB
 * @returns {object|null}
 */
export function getCurrentUserData() {
  return currentUserData;
}

/**
 * Check if current user is admin
 * @returns {boolean}
 */
export function isAdmin() {
  return currentUserData?.role === 'admin';
}

/**
 * Get Database instance (for compatibility, though we just use supabase client)
 * @returns {object}
 */
export function getDb() {
  return supabase;
}

/**
 * Get Auth instance
 * @returns {object}
 */
export function getAuthInstance() {
  return supabase.auth;
}

/**
 * Check if current user has a specific permission
 * @param {string} permissionName
 * @returns {boolean}
 */
export function hasPermission(permissionName) {
  if (!currentUserData) return false;
  if (currentUserData.role === 'admin') return true;
  return currentUserData.permissions && currentUserData.permissions[permissionName] === true;
}
