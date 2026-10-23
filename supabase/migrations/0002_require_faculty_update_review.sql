-- Anonymous/public submissions are reports, not authorization. Keep them out of
-- availability until an authenticated coordinator approval flow is installed.
UPDATE public.faculty_updates SET status = 'pending' WHERE status <> 'pending';

ALTER TABLE public.faculty_updates
  ALTER COLUMN status SET DEFAULT 'pending',
  ADD CONSTRAINT faculty_updates_valid_interval CHECK (end_time > start_time),
  ADD CONSTRAINT faculty_updates_time_range CHECK (
    start_time BETWEEN '08:00' AND '20:00' AND end_time BETWEEN '08:00' AND '20:00'
  ),
  ADD CONSTRAINT faculty_updates_valid_reason CHECK (
    reason IN ('Extra lecture', 'Lab session', 'Event', 'Room change', 'Room free again')
  );

DROP POLICY IF EXISTS "Anyone can submit faculty updates" ON public.faculty_updates;
CREATE POLICY "Anyone can submit pending faculty updates"
  ON public.faculty_updates
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');
