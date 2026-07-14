CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  cccd TEXT DEFAULT '',
  level TEXT DEFAULT '',
  membership_number TEXT DEFAULT '',
  role TEXT DEFAULT 'coach',
  permissions JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  photo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
