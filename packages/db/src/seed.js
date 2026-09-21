import { PERMISSIONS, ALL_PERMISSIONS } from './permissions.js'

/**
 * Seed data for the mock adapter.
 *
 * This doubles as the reference for the eventual Postgres schema — every key
 * here becomes a column, and the shapes are deliberately flat (no nesting,
 * foreign keys by id) so the Supabase adapter can return rows unchanged.
 *
 * Dates are ISO strings, which is what `timestamptz` gives back over PostgREST.
 */
export function createSeed() {
  const roles = [
    {
      id: 'role-president',
      name: 'President',
      description: 'Full access. Held by the president and VP.',
      permissions: [...ALL_PERMISSIONS],
    },
    {
      id: 'role-content',
      name: 'Content Head',
      description: 'Writes and publishes posts, reads the subscriber list.',
      permissions: [
        PERMISSIONS.POSTS_READ,
        PERMISSIONS.POSTS_WRITE,
        PERMISSIONS.POSTS_PUBLISH,
        PERMISSIONS.SUBSCRIBERS_READ,
      ],
    },
    {
      id: 'role-academics',
      name: 'Academics Head',
      description: 'Owns the syllabus archive and reads internal form responses.',
      permissions: [
        PERMISSIONS.POSTS_READ,
        PERMISSIONS.SYLLABI_WRITE,
        PERMISSIONS.SUBMISSIONS_READ,
      ],
    },
    {
      id: 'role-writer',
      name: 'Writer',
      description: 'Drafts posts but cannot publish them.',
      permissions: [PERMISSIONS.POSTS_READ, PERMISSIONS.POSTS_WRITE],
    },
  ]

  // The two real accounts, mirroring what scripts/seed-supabase.mjs creates
  // in Supabase Auth. Passwords are NOT here — the mock uses DEV_PASSWORD,
  // the real ones live only in .env and in Supabase.
  //
  // Both are President. To exercise a narrower role in a test, build a seed
  // with `withMember()` rather than adding demo people back here.
  const members = [
    {
      id: 'user-mads',
      email: 'mads@aucegypt.edu',
      fullName: 'MADS',
      roleId: 'role-president',
      createdAt: '2026-09-01T09:00:00.000Z',
    },
    {
      id: 'user-admin',
      email: 'Admin@mads.auc',
      fullName: 'MADS Admin',
      roleId: 'role-president',
      createdAt: '2026-09-01T09:00:00.000Z',
    },
  ]

  const posts = [
    {
      id: 'post-1',
      slug: 'datathon-2026-recap',
      title: 'What we learned running our first datathon',
      excerpt:
        'Forty-eight hours, nineteen teams, and one dataset nobody expected. A look back at what worked and what we would change.',
      bodyMd: [
        'Nineteen teams spent the weekend with a messy municipal transport dataset, and the results were better than we had any right to expect.',
        '',
        '## The format',
        '',
        'We gave everyone the same data and deliberately refused to specify a question. Teams had to find one worth asking — which is the part of the job that no coursework teaches.',
        '',
        'The strongest submissions all shared a habit: they spent the first six hours reading the data dictionary instead of writing code.',
        '',
        '## What we would change',
        '',
        '- Publish the dataset 48 hours early. Teams lost most of Saturday to cleaning.',
        '- Two judging rounds, not one. A single pass rewarded polish over insight.',
        '- More whiteboards. Genuinely.',
        '',
        'Registration for the spring edition opens in February.',
      ].join('\n'),
      status: 'published',
      publishedAt: '2026-09-12T10:00:00.000Z',
      authorId: 'user-mads',
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-12T10:00:00.000Z',
    },
    {
      id: 'post-2',
      slug: 'actuarial-exam-study-group',
      title: 'The actuarial exam study group starts this month',
      excerpt:
        'Weekly sessions for P and FM, run by students who have already sat them. Open to anyone, no commitment required.',
      bodyMd: [
        'Exam P and Exam FM are lonely to study for. They do not have to be.',
        '',
        'Starting this month we are running a weekly study group, led by members who have already passed. The format is simple: one problem set per week, worked through together, with a short review of what everyone got wrong.',
        '',
        '## Details',
        '',
        'Thursdays, 5:00 PM, Hatem Hall seminar room.',
        '',
        'No sign-up and no attendance requirement — come to the weeks that are useful to you.',
        '',
        'Bring a calculator. Bring the problems you are stuck on.',
      ].join('\n'),
      status: 'published',
      publishedAt: '2026-09-05T08:00:00.000Z',
      authorId: 'user-mads',
      createdAt: '2026-09-03T08:00:00.000Z',
      updatedAt: '2026-09-05T08:00:00.000Z',
    },
    {
      id: 'post-3',
      slug: 'spring-speaker-series',
      title: 'Spring speaker series — first three names',
      excerpt: 'A draft announcement, not yet live.',
      bodyMd: [
        'Three confirmed speakers for the spring series, with two more in conversation.',
        '',
        'Details to follow once the venue is locked.',
      ].join('\n'),
      status: 'draft',
      publishedAt: null,
      authorId: 'user-admin',
      createdAt: '2026-09-18T14:00:00.000Z',
      updatedAt: '2026-09-18T14:00:00.000Z',
    },
  ]

  const courses = [
    { id: 'course-1', code: 'MACT 2123', title: 'Probability Theory', level: 'Sophomore' },
    { id: 'course-2', code: 'MACT 3223', title: 'Mathematical Statistics', level: 'Junior' },
    { id: 'course-3', code: 'MACT 3231', title: 'Actuarial Mathematics I', level: 'Junior' },
    { id: 'course-4', code: 'CSCE 2501', title: 'Fundamentals of Data Science', level: 'Sophomore' },
    { id: 'course-5', code: 'MACT 4233', title: 'Stochastic Processes', level: 'Senior' },
  ]

  const syllabi = [
    {
      id: 'syllabus-1',
      courseId: 'course-1',
      term: 'Fall',
      year: 2026,
      fileName: 'MACT2123-Fall2026.pdf',
      filePath: 'syllabi/mact2123-fall2026.pdf',
      uploadedBy: 'user-mads',
      createdAt: '2026-09-08T12:00:00.000Z',
    },
    {
      id: 'syllabus-2',
      courseId: 'course-2',
      term: 'Fall',
      year: 2026,
      fileName: 'MACT3223-Fall2026.pdf',
      filePath: 'syllabi/mact3223-fall2026.pdf',
      uploadedBy: 'user-mads',
      createdAt: '2026-09-08T12:05:00.000Z',
    },
    {
      id: 'syllabus-3',
      courseId: 'course-2',
      term: 'Spring',
      year: 2026,
      fileName: 'MACT3223-Spring2026.pdf',
      filePath: 'syllabi/mact3223-spring2026.pdf',
      uploadedBy: 'user-mads',
      createdAt: '2026-02-02T12:00:00.000Z',
    },
    {
      id: 'syllabus-4',
      courseId: 'course-4',
      term: 'Fall',
      year: 2026,
      fileName: 'CSCE2501-Fall2026.pdf',
      filePath: 'syllabi/csce2501-fall2026.pdf',
      uploadedBy: 'user-mads',
      createdAt: '2026-09-09T09:30:00.000Z',
    },
  ]

  const forms = [
    {
      id: 'form-1',
      slug: 'feedback',
      title: 'Tell us what you think',
      description:
        'Anything we should be doing differently — events, workshops, the site itself. Anonymous unless you leave your email.',
      audience: 'public',
      isOpen: true,
      fields: [
        { id: 'f1', name: 'topic', label: 'What is this about?', type: 'select', required: true, options: ['Events', 'Workshops', 'The website', 'Something else'] },
        { id: 'f2', name: 'message', label: 'Your feedback', type: 'textarea', required: true },
        // No "(optional)" in the label — the renderer marks optional fields.
        { id: 'f3', name: 'email', label: 'Email', type: 'email', required: false },
      ],
      createdAt: '2026-09-01T09:00:00.000Z',
    },
    {
      id: 'form-2',
      slug: 'event-proposal',
      title: 'Event proposal',
      description: 'For committee heads proposing an event for the semester calendar.',
      audience: 'internal',
      isOpen: true,
      fields: [
        { id: 'f1', name: 'title', label: 'Event title', type: 'text', required: true },
        { id: 'f2', name: 'committee', label: 'Committee', type: 'select', required: true, options: ['Academics', 'Content', 'Events', 'Outreach'] },
        { id: 'f3', name: 'budget', label: 'Estimated budget (EGP)', type: 'number', required: true },
        { id: 'f4', name: 'rationale', label: 'Why should we run this?', type: 'textarea', required: true },
      ],
      createdAt: '2026-09-01T09:00:00.000Z',
    },
  ]

  const submissions = [
    {
      id: 'sub-1',
      formId: 'form-1',
      payload: { topic: 'Workshops', message: 'The Python workshop moved too fast for beginners. Maybe split it into two levels?', email: 'student@aucegypt.edu' },
      submittedBy: null,
      createdAt: '2026-09-14T16:20:00.000Z',
    },
    {
      id: 'sub-2',
      formId: 'form-1',
      payload: { topic: 'Events', message: 'More evening events please — afternoon ones clash with labs.', email: '' },
      submittedBy: null,
      createdAt: '2026-09-16T11:05:00.000Z',
    },
    {
      id: 'sub-3',
      formId: 'form-2',
      payload: { title: 'Intro to R for actuarial students', committee: 'Academics', budget: 1500, rationale: 'Most of the actuarial track uses Excel only. R would carry them through the later courses.' },
      submittedBy: 'user-mads',
      createdAt: '2026-09-15T13:00:00.000Z',
    },
  ]

  const subscribers = [
    { id: 'sub-a', email: 'farah@aucegypt.edu', source: 'site', createdAt: '2026-09-04T10:00:00.000Z', unsubscribedAt: null },
    { id: 'sub-b', email: 'karim@aucegypt.edu', source: 'site', createdAt: '2026-09-06T10:00:00.000Z', unsubscribedAt: null },
    { id: 'sub-c', email: 'mariam@aucegypt.edu', source: 'event', createdAt: '2026-09-11T10:00:00.000Z', unsubscribedAt: null },
    { id: 'sub-d', email: 'old@aucegypt.edu', source: 'site', createdAt: '2026-08-11T10:00:00.000Z', unsubscribedAt: '2026-09-01T10:00:00.000Z' },
  ]

  return { roles, members, posts, courses, syllabi, forms, submissions, subscribers }
}

/**
 * A seed with one extra member holding `roleId`.
 *
 * Both real accounts are President, so a test that needs to prove a narrower
 * role is blocked builds its own member rather than relying on a demo person
 * existing in the seed.
 */
export function withMember(roleId, overrides = {}) {
  const seed = createSeed()
  seed.members.push({
    id: 'user-test',
    email: 'test@mads.auc',
    fullName: 'Test User',
    roleId,
    createdAt: '2026-09-01T09:00:00.000Z',
    ...overrides,
  })
  return seed
}
