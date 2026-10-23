# UNOOCC — Smart Classroom & Laboratory Availability Tracker

Ramdeobaba University · Idea Lab, Group 40

UNOOCC helps students check room schedules, explore a floor map, and report changes. The existing interface is retained; room and schedule data now come from Supabase instead of a generated demonstration timetable.

## Run locally

```bash
npm install
Copy-Item .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env
npm run dev
```

Production build: `npm run build`

Checks: `npm test` and `npm run lint`

## Supabase setup

1. Create or select a Supabase project and put its project URL and publishable/anon key in `.env`. Never put a service-role key in a `VITE_` variable.
2. Apply every migration in `supabase/migrations/` in order. Migration `0003_timetable_backend.sql` creates room, academic-term, timetable document/entry, role and private-storage tables/policies and seeds the attached B4 schedule as `needs_review`.
3. In Supabase Auth, create the coordinator and faculty accounts. Retrieve each account UUID from the Auth users page, then grant roles using the SQL editor:

```sql
insert into public.user_roles (user_id, role)
values ('AUTH_USER_UUID', 'coordinator');

insert into public.user_roles (user_id, role)
values ('FACULTY_AUTH_USER_UUID', 'faculty');
```

The coordinator page is `/coordinator/timetables`. Coordinators can upload multiple PDF/CSV/XLSX sources (15 MB each), review or correct parsed entries, approve a document, then activate it. Activating a timetable archives the prior active version for the same session, department, programme, section and batch. Uploaded files are in a private Storage bucket. PDFs retain extracted text for review; structured CSV/XLSX files can be parsed automatically. Every extracted row remains `needs_review` until a coordinator approves it.

Faculty reports require sign-in and the `faculty` role. Reports remain pending until a coordinator approves them; approval applies the temporary room update and rejects conflicts with another live report.

## Data trust and availability

The attached `B4.pdf` is the source for the preloaded CSE (DSA), Semester V, 2026–27 draft. It is not automatically published. Some room assignments are inferred from the section's home room or ambiguous split cells and are explicitly marked for coordinator review. Confirm every row and upload the original PDF in the coordinator page before activation.

No generic room catalogue is fabricated. The map and room finder populate from active Supabase room records. Until the room master and schedule are reviewed and activated, no room is claimed to be free; the UI distinguishes scheduled classes from unverified room status. Unrecorded events, closures, and physical occupancy cannot be inferred from a timetable.

## Data model and security

- `rooms` and `academic_terms` store the room master and terms.
- `timetable_documents` retains each source/version and `timetable_entries` stores extracted, reviewed rows.
- `faculty_updates` tracks pending, approved-live and rejected reports; `contact_messages` remains available.
- Row-level security separates public schedule reads, faculty submissions and coordinator actions. Role checks use the authenticated user UUID; the browser only uses the publishable key.
- Realtime refreshes the public room/schedule view after database changes.

The migrations in this repository are prepared for the project; they have not been applied to the hosted Supabase project from this checkout. Set the environment variables and apply the migrations before expecting live data.
