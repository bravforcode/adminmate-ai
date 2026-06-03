-- Run these in Supabase Dashboard > Storage > Policies

-- cv-uploads bucket (PRIVATE - no public access)
-- Policy: Authenticated users can SELECT their own company files
-- Policy: Authenticated users can INSERT files to their company folder

-- generated-docs bucket (PRIVATE)
-- Policy: Authenticated users can SELECT files from their company
-- Policy: Authenticated admin/hr can INSERT/UPDATE files

-- company-logos bucket (PUBLIC read)
-- Policy: Public SELECT
-- Policy: Authenticated admin can INSERT/UPDATE

-- avatars bucket (PUBLIC read)
-- Policy: Public SELECT  
-- Policy: Authenticated users can INSERT/UPDATE their own avatar

-- exports bucket (PRIVATE)
-- Policy: Authenticated admin/hr can SELECT/INSERT
