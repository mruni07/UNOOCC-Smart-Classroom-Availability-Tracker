-- UNOOCC timetable source, review, activation, and storage model.
-- Source documents are retained independently from parsed entries and faculty reports.

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('faculty', 'coordinator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_app_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = auth.uid() AND r.role = p_role
  );
$$;
REVOKE ALL ON FUNCTION public.has_app_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_app_role(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.rooms (
  room_id text PRIMARY KEY CHECK (room_id ~ '^[A-Za-z0-9-]{2,40}$'),
  building text NOT NULL,
  floor smallint NOT NULL CHECK (floor BETWEEN 0 AND 100),
  room_type text,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  metadata_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_session text NOT NULL CHECK (academic_session ~ '^\d{4}-\d{2}$'),
  semester smallint NOT NULL CHECK (semester BETWEEN 1 AND 12),
  effective_from date NOT NULL,
  effective_to date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE (academic_session, semester, effective_from)
);

CREATE TABLE IF NOT EXISTS public.timetable_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  original_file_name text NOT NULL CHECK (char_length(original_file_name) BETWEEN 1 AND 255),
  storage_path text UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel')),
  file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes BETWEEN 1 AND 15728640),
  sha256 text CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
  academic_term_id uuid NOT NULL REFERENCES public.academic_terms(id),
  department text NOT NULL CHECK (char_length(department) BETWEEN 1 AND 100),
  programme text NOT NULL CHECK (char_length(programme) BETWEEN 1 AND 100),
  section text NOT NULL CHECK (char_length(section) BETWEEN 1 AND 40),
  batch text CHECK (batch IS NULL OR char_length(batch) BETWEEN 1 AND 40),
  effective_from date NOT NULL,
  effective_to date,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'needs_review', 'approved', 'active', 'archived', 'rejected')),
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  activated_by uuid REFERENCES auth.users(id),
  activated_at timestamptz,
  review_notes text,
  extracted_text text CHECK (extracted_text IS NULL OR char_length(extracted_text) <= 200000),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS timetable_documents_duplicate_file_idx
  ON public.timetable_documents (academic_term_id, department, programme, section, coalesce(batch, ''), sha256)
  WHERE sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS timetable_documents_active_scope_idx
  ON public.timetable_documents (academic_term_id, department, programme, section, batch, effective_from)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.timetable_documents(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 6), -- Monday = 1
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 160),
  course_code text,
  room_id text NOT NULL REFERENCES public.rooms(room_id),
  section text NOT NULL CHECK (char_length(section) BETWEEN 1 AND 40),
  batch text,
  faculty text,
  entry_type text NOT NULL DEFAULT 'class' CHECK (entry_type IN ('class', 'lab', 'event')),
  source_text text,
  confidence numeric(4,3) NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
  review_state text NOT NULL DEFAULT 'needs_review' CHECK (review_state IN ('needs_review', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  UNIQUE (document_id, weekday, start_time, end_time, subject, room_id, section, batch)
);
CREATE INDEX IF NOT EXISTS timetable_entries_room_time_idx
  ON public.timetable_entries (room_id, weekday, start_time, end_time);
CREATE INDEX IF NOT EXISTS timetable_entries_document_batch_idx
  ON public.timetable_entries (document_id, section, batch);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_entries;

-- Faculty updates are separate from official timetable entries and only become live
-- when an authenticated coordinator approves them.
ALTER TABLE public.faculty_updates
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS batch text;

DROP POLICY IF EXISTS "Anyone can read faculty updates" ON public.faculty_updates;
DROP POLICY IF EXISTS "Anyone can submit pending faculty updates" ON public.faculty_updates;
DROP POLICY IF EXISTS "Anyone can submit faculty updates" ON public.faculty_updates;
ALTER TABLE public.faculty_updates ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.faculty_updates DROP CONSTRAINT IF EXISTS faculty_updates_status_check;
ALTER TABLE public.faculty_updates
  ADD CONSTRAINT faculty_updates_status_check CHECK (status IN ('pending', 'live', 'rejected'));
ALTER TABLE public.faculty_updates DROP CONSTRAINT IF EXISTS faculty_updates_valid_interval;
ALTER TABLE public.faculty_updates
  ADD CONSTRAINT faculty_updates_valid_interval CHECK (
    start_time ~ '^([01]\d|2[0-3]):[0-5]\d$'
    AND end_time ~ '^([01]\d|2[0-3]):[0-5]\d$'
    AND end_time > start_time
    AND start_time BETWEEN '08:00' AND '20:00'
    AND end_time BETWEEN '08:00' AND '20:00'
  );
ALTER TABLE public.faculty_updates DROP CONSTRAINT IF EXISTS faculty_updates_valid_reason;
ALTER TABLE public.faculty_updates
  ADD CONSTRAINT faculty_updates_valid_reason CHECK (
    reason IN ('Extra lecture', 'Lab session', 'Event', 'Room change', 'Room free again')
  );
CREATE INDEX IF NOT EXISTS faculty_updates_live_room_date_idx
  ON public.faculty_updates (room_id, date, start_time, end_time)
  WHERE status = 'live';

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Room catalogue is readable"
  ON public.rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Coordinators manage rooms"
  ON public.rooms FOR ALL TO authenticated
  USING (public.has_app_role('coordinator'))
  WITH CHECK (public.has_app_role('coordinator'));
CREATE POLICY "Academic terms are readable"
  ON public.academic_terms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Coordinators manage academic terms"
  ON public.academic_terms FOR ALL TO authenticated
  USING (public.has_app_role('coordinator'))
  WITH CHECK (public.has_app_role('coordinator'));
CREATE POLICY "Only coordinators can manage timetable documents"
  ON public.timetable_documents FOR ALL TO authenticated
  USING (public.has_app_role('coordinator'))
  WITH CHECK (public.has_app_role('coordinator'));
CREATE POLICY "Public can read active timetable metadata"
  ON public.timetable_documents FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "Public can read approved timetable entries"
  ON public.timetable_entries FOR SELECT TO anon, authenticated
  USING (
    review_state = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.timetable_documents d
      WHERE d.id = document_id AND d.status = 'active'
    )
  );
CREATE POLICY "Coordinators manage timetable entries"
  ON public.timetable_entries FOR ALL TO authenticated
  USING (public.has_app_role('coordinator'))
  WITH CHECK (public.has_app_role('coordinator'));

CREATE POLICY "Approved updates and own reports are readable"
  ON public.faculty_updates FOR SELECT TO anon, authenticated
  USING (
    status = 'live'
    OR created_by = auth.uid()
    OR public.has_app_role('coordinator')
  );
CREATE POLICY "Faculty can submit pending reports"
  ON public.faculty_updates FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND created_by = auth.uid()
    AND public.has_app_role('faculty')
  );
CREATE POLICY "Coordinators can edit pending reports only"
  ON public.faculty_updates FOR UPDATE TO authenticated
  USING (public.has_app_role('coordinator') AND status = 'pending')
  WITH CHECK (public.has_app_role('coordinator') AND status = 'pending');

GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.rooms, public.academic_terms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rooms, public.academic_terms TO authenticated;
GRANT SELECT ON public.timetable_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_documents, public.timetable_entries TO authenticated;
GRANT SELECT ON public.timetable_entries TO anon;
GRANT SELECT ON public.faculty_updates TO anon, authenticated;
GRANT INSERT ON public.faculty_updates TO authenticated;
GRANT UPDATE ON public.faculty_updates TO authenticated;

-- Private storage; uploads are limited to PDF, CSV and Excel documents up to 15 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'timetables', 'timetables', false, 15728640,
  ARRAY['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Coordinators upload timetable sources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'timetables' AND public.has_app_role('coordinator'));
CREATE POLICY "Coordinators read timetable sources"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'timetables' AND public.has_app_role('coordinator'));
CREATE POLICY "Coordinators remove timetable sources"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'timetables' AND public.has_app_role('coordinator'));

CREATE OR REPLACE FUNCTION public.review_faculty_update(p_update_id uuid, p_approve boolean)
RETURNS public.faculty_updates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.faculty_updates%ROWTYPE;
BEGIN
  IF NOT public.has_app_role('coordinator') THEN
    RAISE EXCEPTION 'Coordinator role required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO target FROM public.faculty_updates WHERE id = p_update_id FOR UPDATE;
  IF NOT FOUND OR target.status <> 'pending' THEN
    RAISE EXCEPTION 'Pending faculty report not found';
  END IF;
  IF p_approve AND EXISTS (
    SELECT 1 FROM public.faculty_updates u
    WHERE u.status = 'live'
      AND u.room_id = target.room_id
      AND u.date = target.date
      AND u.id <> target.id
      AND u.start_time < target.end_time
      AND u.end_time > target.start_time
  ) THEN
    RAISE EXCEPTION 'This report conflicts with an already approved faculty update';
  END IF;
  UPDATE public.faculty_updates
  SET status = CASE WHEN p_approve THEN 'live' ELSE 'rejected' END,
      approved_by = CASE WHEN p_approve THEN auth.uid() ELSE NULL END,
      reviewed_at = now()
  WHERE id = target.id
  RETURNING * INTO target;
  RETURN target;
END;
$$;
REVOKE ALL ON FUNCTION public.review_faculty_update(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_faculty_update(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_timetable(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.timetable_documents%ROWTYPE;
BEGIN
  IF NOT public.has_app_role('coordinator') THEN
    RAISE EXCEPTION 'Coordinator role required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target
  FROM public.timetable_documents
  WHERE id = p_document_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Timetable document not found'; END IF;
  IF target.status NOT IN ('approved', 'active') THEN
    RAISE EXCEPTION 'Review and approve the timetable before activation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.timetable_entries e
    WHERE e.document_id = target.id AND e.review_state = 'approved'
  ) THEN
    RAISE EXCEPTION 'At least one reviewed entry is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.timetable_entries candidate
    JOIN public.timetable_entries active_entry
      ON active_entry.room_id = candidate.room_id
      AND active_entry.weekday = candidate.weekday
      AND active_entry.start_time < candidate.end_time
      AND active_entry.end_time > candidate.start_time
    JOIN public.timetable_documents active_doc
      ON active_doc.id = active_entry.document_id
      AND active_doc.status = 'active'
    WHERE candidate.document_id = target.id
      AND candidate.review_state = 'approved'
      AND active_entry.review_state = 'approved'
      AND active_doc.id <> target.id
      AND NOT (
        active_doc.academic_term_id = target.academic_term_id
        AND active_doc.department = target.department
        AND active_doc.programme = target.programme
        AND active_doc.section = target.section
        AND active_doc.batch IS NOT DISTINCT FROM target.batch
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.timetable_entries first_entry
    JOIN public.timetable_entries second_entry
      ON second_entry.document_id = first_entry.document_id
      AND second_entry.id > first_entry.id
      AND second_entry.room_id = first_entry.room_id
      AND second_entry.weekday = first_entry.weekday
      AND second_entry.start_time < first_entry.end_time
      AND second_entry.end_time > first_entry.start_time
    WHERE first_entry.document_id = target.id
      AND first_entry.review_state = 'approved'
      AND second_entry.review_state = 'approved'
  ) THEN
    RAISE EXCEPTION 'Approved entries overlap in a room with another active timetable or within this timetable';
  END IF;

  UPDATE public.timetable_documents d
  SET status = 'archived'
  WHERE d.status = 'active'
    AND d.academic_term_id = target.academic_term_id
    AND d.department = target.department
    AND d.programme = target.programme
    AND d.section = target.section
    AND d.batch IS NOT DISTINCT FROM target.batch
    AND d.id <> target.id;

  UPDATE public.timetable_documents
  SET status = 'active', activated_by = auth.uid(), activated_at = now()
  WHERE id = target.id;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_timetable(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_timetable(uuid) TO authenticated;

-- B4 (DSA), Semester V, 2026-27, effective 2026-07-13.
-- Parsed from the attached one-page source. The document and entries start in
-- needs_review because the file is not yet in private storage and several cells
-- need coordinator confirmation (notably MAD/DP split room assignments).
INSERT INTO public.academic_terms (academic_session, semester, effective_from, status)
VALUES ('2026-27', 5, '2026-07-13', 'active')
ON CONFLICT (academic_session, semester, effective_from) DO NOTHING;

INSERT INTO public.rooms (room_id, building, floor, room_type, capacity, metadata_verified)
VALUES
  ('DT-505', 'Digital Tower', 5, NULL, NULL, false),
  ('DT-511', 'Digital Tower', 5, NULL, NULL, false),
  ('DT-512', 'Digital Tower', 5, NULL, NULL, false),
  ('DT-605', 'Digital Tower', 6, NULL, NULL, false),
  ('DT-606', 'Digital Tower', 6, NULL, NULL, false),
  ('DT-611', 'Digital Tower', 6, NULL, NULL, false)
ON CONFLICT (room_id) DO NOTHING;

INSERT INTO public.timetable_documents (
  id, name, original_file_name, mime_type, sha256, academic_term_id,
  department, programme, section, effective_from, status, review_notes
)
SELECT
  'b4000000-0000-4000-8000-000000000001'::uuid,
  'CSE (DSA) Semester V — Section B4',
  'B4.pdf', 'application/pdf',
  'c1d44e1ce46746694e7b03c35244ced97050c58bcb1ffcde572af6c73d7ca2ff',
  t.id, 'CSE', 'B.Tech CSE (DSA)', 'B4', '2026-07-13', 'needs_review',
  'Source file must be uploaded to private storage and entries reviewed before activation. Verify MAD/DP simultaneous room entries and cells without printed room numbers against room 606.'
FROM public.academic_terms t
WHERE t.academic_session = '2026-27' AND t.semester = 5 AND t.effective_from = '2026-07-13'
ON CONFLICT (id) DO NOTHING;

-- Room numbers printed in the grid are preserved. Unspecified rooms use the
-- section header room 606 and are flagged for review rather than trusted.
WITH doc AS (
  SELECT id FROM public.timetable_documents
  WHERE id = 'b4000000-0000-4000-8000-000000000001'::uuid
), rows(weekday, start_time, end_time, subject, course_code, room_id, batch, entry_type, confidence, source_text) AS (
  VALUES
    (1, '10:00'::time, '12:00'::time, 'Software Engineering and Project Management Lab', '24CS04PR0501', 'DT-605', 'B2', 'lab', 0.97::numeric, 'SEPM LAB 24CS04PR0501 (B2) DT-605'),
    (1, '10:00'::time, '12:00'::time, 'Cloud Technologies for Data Analytics Lab', '24CS04PR0503', 'DT-611', 'B1/B3', 'lab', 0.97::numeric, 'CTDA LAB 24CS04PR0503 (B1/B3) DT-611'),
    (1, '12:00'::time, '13:00'::time, 'Mobile Application Development', '24CS02PR0506', 'DT-512', NULL, 'class', 0.62::numeric, '24CS02PR0506 MAD-DT512 / DP-DT606 (verify printed course code and split)'),
    (1, '12:00'::time, '13:00'::time, 'Design Patterns', '24CS02PR0506', 'DT-606', NULL, 'class', 0.62::numeric, '24CS02PR0506 MAD-DT512 / DP-DT606 (verify printed course code and split)'),
    (1, '14:00'::time, '15:00'::time, 'Cloud Technologies for Data Analytics', '24CS04TH0503', 'DT-606', NULL, 'class', 0.80::numeric, 'CTDA 24CS04TH0503; inferred section room 606'),
    (1, '16:00'::time, '17:00'::time, 'Open Elective', NULL, 'DT-606', NULL, 'class', 0.78::numeric, 'OE; inferred section room 606'),

    (2, '11:00'::time, '12:00'::time, 'Cloud Technologies for Data Analytics', '24CS04TH0503', 'DT-512', NULL, 'class', 0.97::numeric, 'CTDA DT-512 24CS04TH0503'),
    (2, '12:00'::time, '13:00'::time, 'Data Warehousing and Mining', '24CS04TH0501', 'DT-512', NULL, 'class', 0.97::numeric, 'DWM DT-512 24CS04TH0501'),
    (2, '14:00'::time, '15:00'::time, 'Software Engineering and Project Management', '24CS04TH0503', 'DT-606', NULL, 'class', 0.78::numeric, 'SEPM 24CS04TH0503; inferred section room 606'),
    (2, '15:00'::time, '17:00'::time, 'Data Warehousing and Mining Lab', '24CS04PR0502', 'DT-605', 'B2', 'lab', 0.97::numeric, 'DWM LAB 24CS04PR0502 (B2) DT-605'),
    (2, '15:00'::time, '17:00'::time, 'Data Science Tools Lab', '24CS04PR0504', 'DT-611', 'B1/B3', 'lab', 0.97::numeric, 'DST LAB 24CS04PR0504 (B1/B3) DT-611'),

    (3, '10:00'::time, '11:00'::time, 'Software Engineering and Project Management', '24CS04TH0502', 'DT-606', NULL, 'class', 0.80::numeric, 'SEPM 24CS04TH0502; inferred section room 606'),
    (3, '11:00'::time, '12:00'::time, 'Data Warehousing and Mining', '24CS04TH0501', 'DT-512', NULL, 'class', 0.97::numeric, 'DWM DT-512 24CS04TH0501'),
    (3, '12:00'::time, '14:00'::time, 'Software Engineering and Project Management Lab', '24CS04PR0502', 'DT-511', 'B1/B3', 'lab', 0.96::numeric, 'SEPM LAB 24CS04PR0502 (B1/B3) DT511'),
    (3, '12:00'::time, '14:00'::time, 'Data Science Tools Lab', '24CS04PR0504', 'DT-505', 'B2', 'lab', 0.96::numeric, 'DST LAB 24CS04PR0504 (B2) DT505'),
    (3, '15:00'::time, '16:00'::time, 'Cloud Technologies for Data Analytics', '24CS04TH0503', 'DT-512', NULL, 'class', 0.97::numeric, 'CTDA 24CS04TH0503 DT-512'),
    (3, '16:00'::time, '17:00'::time, 'Open Elective', NULL, 'DT-606', NULL, 'class', 0.78::numeric, 'OE; inferred section room 606'),

    (4, '09:00'::time, '10:00'::time, 'Mobile Application Development', NULL, 'DT-606', NULL, 'class', 0.78::numeric, 'MDM; inferred section room 606'),
    (4, '10:00'::time, '11:00'::time, 'Data Warehousing and Mining', NULL, 'DT-512', NULL, 'class', 0.90::numeric, 'DWM DT-512'),
    (4, '12:00'::time, '14:00'::time, 'Data Science Tools Lab', '24CS04PR0504', 'DT-605', 'B1/B2/B3', 'lab', 0.95::numeric, 'DST Lab (all batches) DT605, DT611'),
    (4, '12:00'::time, '14:00'::time, 'Data Science Tools Lab', '24CS04PR0504', 'DT-611', 'B1/B2/B3', 'lab', 0.95::numeric, 'DST Lab (all batches) DT605, DT611'),
    (4, '14:00'::time, '15:00'::time, 'Mobile Application Development', '24CS02PR0506', 'DT-512', NULL, 'class', 0.62::numeric, '24CS02PR0506 MAD-DT512 / DP-DT606 (verify printed course code and split)'),
    (4, '14:00'::time, '15:00'::time, 'Design Patterns', '24CS02PR0506', 'DT-606', NULL, 'class', 0.62::numeric, '24CS02PR0506 MAD-DT512 / DP-DT606 (verify printed course code and split)'),
    (4, '16:00'::time, '17:00'::time, 'Open Elective', NULL, 'DT-606', NULL, 'class', 0.78::numeric, 'OE; inferred section room 606'),

    (5, '09:00'::time, '10:00'::time, 'Mobile Application Development', NULL, 'DT-606', NULL, 'class', 0.78::numeric, 'MDM; inferred section room 606'),
    (5, '10:00'::time, '12:00'::time, 'Data Warehousing and Mining Lab', '24CS04PR0501', 'DT-511', 'B1/B3', 'lab', 0.96::numeric, 'DWM LAB 24CS04PR0501 (B1/B3) DT-511'),
    (5, '10:00'::time, '12:00'::time, 'Cloud Technologies for Data Analytics Lab', '24CS04PR0503', 'DT-505', 'B2', 'lab', 0.96::numeric, 'CTDA LAB 24CS04PR0503 (B2) DT-505'),
    (5, '13:00'::time, '14:00'::time, 'Software Engineering and Project Management', '24CS04TH0503', 'DT-606', NULL, 'class', 0.78::numeric, 'SEPM 24CS04TH0503; inferred section room 606'),
    (5, '14:00'::time, '15:00'::time, 'Mobile Application Development', NULL, 'DT-511', NULL, 'class', 0.60::numeric, 'MAD-DT511 / DP-DT606 (verify split and course codes)'),
    (5, '14:00'::time, '15:00'::time, 'Design Patterns', NULL, 'DT-606', NULL, 'class', 0.60::numeric, 'MAD-DT511 / DP-DT606 (verify split and course codes)'),
    (5, '15:00'::time, '16:00'::time, 'Mentor Mentee Meeting', NULL, 'DT-606', NULL, 'event', 0.70::numeric, 'Mentor Mentee Meeting; inferred section room 606'),

    (6, '09:00'::time, '10:00'::time, 'Mobile Application Development', NULL, 'DT-606', NULL, 'class', 0.78::numeric, 'MDM; inferred section room 606'),
    (6, '10:00'::time, '11:00'::time, 'Idea Lab', '24CS02PR0505', 'DT-606', NULL, 'class', 0.82::numeric, 'Idea Lab 24CS02PR0505; inferred section room 606'),
    (6, '12:00'::time, '15:00'::time, 'Honors', NULL, 'DT-606', NULL, 'class', 0.55::numeric, 'Honors; merged cell and room assignment need coordinator verification')
)
INSERT INTO public.timetable_entries (
  document_id, weekday, start_time, end_time, subject, course_code, room_id,
  section, batch, entry_type, confidence, source_text, review_state
)
SELECT d.id, r.weekday, r.start_time, r.end_time, r.subject, r.course_code, r.room_id,
       'B4', r.batch, r.entry_type, r.confidence, r.source_text, 'needs_review'
FROM doc d CROSS JOIN rows r
ON CONFLICT DO NOTHING;
