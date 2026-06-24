// Supabase configuration
// URL and Key provided by the user

export const supabaseUrl = 'https://ajfwyttyzlattqcmocpy.supabase.co';
export const supabaseKey = 'sb_publishable_ByTEGi9QSCaea5jgitW-XQ_RMYowLHf';

// Initialize the Supabase client
// window.supabase is available from the CDN script in index.html
export const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
