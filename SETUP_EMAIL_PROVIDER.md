# How to enable Email provider in Supabase

The signup fails with 422 because the **Email provider is not enabled**.

## Steps

1. Go to Supabase Dashboard:
   https://supabase.com/dashboard/project/nickivumteyrezptjggk/auth/providers

2. Find **Email** in the list

3. Toggle it **ON**

4. Set these options:
   - **Confirm email**: OFF (for faster signup, no email verification)
   - **Minimum password length**: 8
   - **Protect against account enumeration attacks**: ON

5. Click **Save**

## After enabling

- Users can sign up with email + password
- No email verification required (auto-confirm is ON)
- Users will be redirected to /setup-company after signup
