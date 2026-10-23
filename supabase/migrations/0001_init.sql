CREATE TABLE public.faculty_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  faculty_id text NOT NULL CHECK (char_length(faculty_id) BETWEEN 1 AND 40),
  room_id text NOT NULL CHECK (char_length(room_id) BETWEEN 1 AND 40),
  date date NOT NULL,
  start_time text NOT NULL CHECK (start_time ~ '^\d{2}:\d{2}$'),
  end_time text NOT NULL CHECK (end_time ~ '^\d{2}:\d{2}$'),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 60),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.faculty_updates TO anon, authenticated;
GRANT ALL ON public.faculty_updates TO service_role;
ALTER TABLE public.faculty_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read faculty updates" ON public.faculty_updates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can submit faculty updates" ON public.faculty_updates FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  role text NOT NULL CHECK (char_length(role) <= 60),
  topic text NOT NULL CHECK (char_length(topic) <= 60),
  room_id text CHECK (room_id IS NULL OR char_length(room_id) <= 40),
  issue text CHECK (issue IS NULL OR char_length(issue) <= 200),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a message" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_updates;

INSERT INTO public.faculty_updates (name, faculty_id, room_id, date, start_time, end_time, reason, notes, status) VALUES
('Prof. P. Wankhede','CSE-118','DT-602',(now() AT TIME ZONE 'Asia/Kolkata')::date,'16:00','17:00','Extra lecture','V-B make-up class','live'),
('Dr. H. Pande','CSE-104','DT-612',(now() AT TIME ZONE 'Asia/Kolkata')::date + 1,'10:00','12:00','Event','Idea Lab project showcase','live');