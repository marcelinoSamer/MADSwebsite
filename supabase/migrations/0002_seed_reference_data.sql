-- =========================================================================
-- Reference data: the four roles, plus starter content.
--
-- No accounts here. Users are created by scripts/seed-supabase.mjs, which
-- reads passwords from .env — a password in a committed migration would be
-- a password in git history forever.
--
-- Idempotent: safe to re-run.
-- =========================================================================

insert into public.roles (id, name, description, permissions) values
  ('role-president', 'President', 'Full access. Held by the president and VP.', array[
      'posts:read','posts:write','posts:publish','syllabi:write',
      'subscribers:read','forms:write','submissions:read','members:write'
   ]),
  ('role-content', 'Content Head', 'Writes and publishes posts, reads the subscriber list.', array[
      'posts:read','posts:write','posts:publish','subscribers:read'
   ]),
  ('role-academics', 'Academics Head', 'Owns the syllabus archive and reads internal form responses.', array[
      'posts:read','syllabi:write','submissions:read'
   ]),
  ('role-writer', 'Writer', 'Drafts posts but cannot publish them.', array[
      'posts:read','posts:write'
   ])
on conflict (id) do update
  set name        = excluded.name,
      description = excluded.description,
      permissions = excluded.permissions;

-- Course catalogue. The archive is browsed by course, so these exist even
-- before any syllabus is uploaded.
insert into public.courses (code, title, level) values
  ('MACT 2123', 'Probability Theory', 'Sophomore'),
  ('MACT 3223', 'Mathematical Statistics', 'Junior'),
  ('MACT 3231', 'Actuarial Mathematics I', 'Junior'),
  ('CSCE 2501', 'Fundamentals of Data Science', 'Sophomore'),
  ('MACT 4233', 'Stochastic Processes', 'Senior')
on conflict (code) do nothing;

-- The public feedback form the site links to from the footer and the join
-- section. Its slug is referenced by /forms/feedback.
insert into public.forms (slug, title, description, audience, is_open, fields) values
  (
    'feedback',
    'Tell us what you think',
    'Anything we should be doing differently — events, workshops, the site itself. Anonymous unless you leave your email.',
    'public',
    true,
    '[
      {"id":"f1","name":"topic","label":"What is this about?","type":"select","required":true,
       "options":["Events","Workshops","The website","Something else"]},
      {"id":"f2","name":"message","label":"Your feedback","type":"textarea","required":true},
      {"id":"f3","name":"email","label":"Email","type":"email","required":false}
    ]'::jsonb
  ),
  (
    'event-proposal',
    'Event proposal',
    'For committee heads proposing an event for the semester calendar.',
    'internal',
    true,
    '[
      {"id":"f1","name":"title","label":"Event title","type":"text","required":true},
      {"id":"f2","name":"committee","label":"Committee","type":"select","required":true,
       "options":["Academics","Content","Events","Outreach"]},
      {"id":"f3","name":"budget","label":"Estimated budget (EGP)","type":"number","required":true},
      {"id":"f4","name":"rationale","label":"Why should we run this?","type":"textarea","required":true}
    ]'::jsonb
  )
on conflict (slug) do nothing;
