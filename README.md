# uppuveli-beach-mobile-application-19886-20864

Supabase Integration
- Configure the following environment variables (see .env and .env.example at repo root):
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - NEXT_PUBLIC_SITE_URL
  - (server-side only) SUPABASE_SERVICE_ROLE

Auth Redirects
- In Supabase Dashboard > Authentication > URL Configuration
  - Set Site URL to your production domain
  - Add Redirect URLs:
    - http://localhost:3000/**
    - https://your-production-domain/**

Database Security
- RLS is enabled for users, bookings, loyalty, referrals, payments, inventory.
- Policies restrict access to a user's own data, inventory readable by authenticated users.
- Payments mutations must be performed by backend with service role.

Client Utilities
- Use utils/getURL.js for environment-safe redirects.
- Initialize Supabase client via utils/supabaseClient.js.
- Auth flows provided in utils/auth.js, and an AuthCallback component exists at components/AuthCallback.jsx.