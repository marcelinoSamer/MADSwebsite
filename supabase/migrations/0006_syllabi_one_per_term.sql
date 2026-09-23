-- 0006 — one syllabus per course per term.
--
-- The archive is browsed by course: a course row lists its terms, newest
-- first. Two rows for the same term give the reader no way to tell which one
-- is current, and nothing in the upload form stopped it. The mock adapter
-- refuses the same insert, so both backends behave alike.
--
-- Replacing a syllabus is therefore delete-then-upload, which is deliberate:
-- the old file leaves Storage with it instead of being stranded.
--
-- If this index fails to build, the table already holds duplicates. That is
-- not something a migration should resolve silently — the older rows point at
-- real files in Storage. List them and delete the ones you do not want:
--
--   select course_id, term, year, count(*)
--     from public.syllabi group by 1, 2, 3 having count(*) > 1;

create unique index if not exists syllabi_course_term_year_key
  on public.syllabi (course_id, term, year);
