-- 0005_forms_fill.sql
--
-- Internal forms are filled in from the admin panel by whoever the form is
-- for — a venue reservation request is raised by the person who needs the
-- venue, not by the committee that reads the responses. So reading a form
-- definition can no longer require forms:write or submissions:read: those
-- are the permissions for *editing* a form and for *reading answers*, and
-- neither has anything to do with being allowed to answer one.
--
-- The floor is still a session. `anon` continues to see public forms only,
-- which is what keeps an internal form's questions off the public site.
--
-- submissions_insert in 0001 already says exactly this (`f.audience =
-- 'public' or auth.uid() is not null`), so before this migration a member
-- without forms:write could insert an answer to a form they were not
-- allowed to read. Nothing could fill it in, because the panel could not
-- load the questions.

drop policy if exists forms_read on public.forms;
create policy forms_read on public.forms
  for select to anon, authenticated
  using (
    audience = 'public'
    or auth.uid() is not null
  );

-- The worked example of an internal form, mirroring seed.js. It lives here
-- rather than in 0002 because 0002 has already been applied to the live
-- project; adding a row there would never run.
insert into public.forms (slug, title, description, audience, is_open, fields) values
  (
    'venue-reservation',
    'Venue reservation request',
    'Raise this before booking a room. Whoever needs the venue fills it in — you do not need any particular role to do so.',
    'internal',
    true,
    '[
      {"id":"f1","name":"venue","label":"Which venue?","type":"select","required":true,
       "options":["Hatem Hall seminar room","Moataz Al Alfi Hall","Library seminar room","Outdoor — Bartlett Plaza"]},
      {"id":"f2","name":"date","label":"Date needed","type":"date","required":true},
      {"id":"f3","name":"attendees","label":"Expected attendees","type":"number","required":true},
      {"id":"f4","name":"purpose","label":"What is it for?","type":"textarea","required":true}
    ]'::jsonb
  )
on conflict (slug) do nothing;
