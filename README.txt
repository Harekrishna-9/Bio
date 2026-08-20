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


UPGRADE (Admin V2)
- Premium dashboard
- Custom story expiry: 24h, 3d, 5d, 7d or custom hours/days
- Text / image / video story preview
- MP3/audio upload directly to Supabase Storage
- Existing Story -> Save to Highlight (no re-upload)
- Better Gallery / Messages / Stats UI
- Public story viewer now displays remaining hours/days

No new database columns are required for this upgrade.
Existing RLS/table/storage permissions must remain enabled.


ADMIN V3 IMPORTANT
1. Upload all V3 files to GitHub.
2. Run upgrade-v3.sql ONCE in Supabase SQL Editor.
3. Hard refresh admin.html and index.html after deploy.

V3 adds:
- Scheduled stories (future date/time)
- Story archive
- Pinned announcement
- Profile status
- Multiple music playlist
- Music clip time 30-60 seconds
- Gallery albums + update/delete
- Highlight update/delete
- Admin-editable social/project links

V4 HIGHLIGHTS
- Instagram-style Highlight folders
- Unlimited image/video/text items
- Add Media / Open / Edit / Delete
- Change cover image
- Item delete + reorder (up/down)
- Highlight view analytics
- Public Highlight viewer with progress bars, auto-next and video support
- Run upgrade-v4.sql once before using V4 item management.
