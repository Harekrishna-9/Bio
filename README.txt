HAREKRISHNA PATEL - SUPABASE SOCIAL BIO

1) You already created:
   - Supabase project
   - tables
   - RLS
   - public bucket: bio-media
   - basic storage policies

2) IMPORTANT: Run final-policies.sql once in Supabase SQL Editor.
   This adds secure admin write access only for:
   pharekrishna09@gmail.com

3) Create the admin user in Supabase Authentication:
   Authentication > Users > Add user
   Email: pharekrishna09@gmail.com
   Choose your own strong password.
   Do NOT put that password in code.

4) Get your public key:
   Supabase Dashboard > Project Settings / API (or Connect/API Keys)
   Copy the Publishable key / anon public key.
   Open supabase-config.js and replace:
   PASTE_YOUR_PUBLISHABLE_OR_ANON_KEY_HERE

   Never use service_role key in GitHub Pages.

5) Upload all files to your GitHub Pages Bio repository:
   index.html
   admin.html
   style.css
   app.js
   admin.js
   supabase-config.js
   profile.jpeg

6) Open admin.html, sign in, and manage:
   - Daily Note
   - Music
   - 24-hour Stories
   - Highlights + Highlight Items
   - Gallery
   - Guest Messages
   - Views/Likes/Link click stats

Story expiry:
The public page queries only stories whose expires_at is in the future, so after
24 hours they automatically disappear from the public profile. Old story rows
remain in the database until you delete them from Admin.
