import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ClassroomPages from './ClassroomPages';
import {
  courseResumeUrl, unitUrl, viewStatus, withCatalogueLinks, withLinks,
} from './useDashboard';
import { targetPath } from './useMessages';
import { toRoute } from './RouterLink';

const mockClient = {
  me: jest.fn(),
  dashboard: jest.fn(),
  certificates: jest.fn(),
  hours: jest.fn(),
  certificateLink: jest.fn(),
  unreadCount: jest.fn(),
  notifications: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  grades: jest.fn(),
  compliance: jest.fn(),
};
jest.mock('@elmp/classroom-kit', () => ({
  ...jest.requireActual('@elmp/classroom-kit'),
  getPortalClient: () => mockClient,
}));
jest.mock('./language', () => jest.fn());

const LEARN = 'http://apps.local.openedx.io/learning';
const PSB = 'course-v1:MHB+PSB101+2026';
const INF = 'course-v1:MHB+INF101+2026';
const FIRE = 'course-v1:MHB+FIRE101+2026';

// Portal CA-11 shape (doc 02 §6) — no links; the app adds them.
const dashboard = {
  data: {
    banner: { kind: 'overdue', n: 1, course: { en: 'Patient Safety Basics', th: 'พื้นฐานความปลอดภัยของผู้ป่วย' } },
    gauge: { required_done_on_time_pct: 50, label: 'needs_attention' },
    required_title: { en: 'New-hire Onboarding 2026', th: 'ปฐมนิเทศพนักงานใหม่ 2569' },
    rings: {
      enrolled: 3, completed: 1, hours_learned: 1.4, required_done: [1, 2], quizzes_passed: [3, 5], certificates: 1,
    },
    deadlines: [{
      assignment_id: 6,
      course_key: PSB,
      code: 'PSB101',
      category: 'safety',
      title: { en: 'Patient Safety Basics', th: 'พื้นฐานความปลอดภัยของผู้ป่วย' },
      roadmap: { en: 'New-hire Onboarding', th: 'ปฐมนิเทศพนักงานใหม่' },
      due_at: '2026-10-10T23:59:59+07:00',
      days_left: -27,
      action: 'continue',
    }],
    streak: { days: [true, true, false, true, true, true, false], current: 3, best: 6 },
    courses: [
      {
        course_key: INF, code: 'INF101', category: 'clinical', title: { en: 'Infection Control', th: 'การควบคุมการติดเชื้อ' }, units_done: 5, units_total: 7, score_pct: 100, status: 'almost', required: true,
      },
      {
        course_key: PSB, code: 'PSB101', category: 'safety', title: { en: 'Patient Safety Basics', th: 'พื้นฐานความปลอดภัยของผู้ป่วย' }, units_done: 1, units_total: 7, score_pct: null, status: 'overdue', required: true,
      },
      {
        course_key: FIRE, code: 'FIRE101', category: 'general', title: { en: 'Fire Safety on the Ward', th: 'ความปลอดภัยจากอัคคีภัย' }, units_done: 0, units_total: 5, score_pct: null, status: 'not_started', required: false,
      },
    ],
    next_quizzes: [{
      course_key: PSB, block_id: 'block-v1:MHB+PSB101+2026+type@sequential+block@quiz', code: 'PSB101', title: { en: 'Final quiz', th: 'แบบทดสอบท้ายบท' }, questions: 8, minutes: 15,
    }],
    latest_certificate: null,
  },
};
const certificates = {
  data: [{
    kind: 'roadmap', code: 'ELMP-2026-7KQ4-9XTD', title: { en: 'Records & PDPA 2026', th: 'เวชระเบียนและ PDPA 2569' }, issued_at: '2026-11-02T14:00:00+07:00', revoked_at: null,
  }],
};
const hours = (year) => ({
  data: {
    year, earned: 24, target: 40, remaining: 16, year_ends: `${year}-12-31`, items: [], years_available: [2025, 2026],
  },
});
const me = (features = { ce_hours: true, streak: true }) => ({
  data: {
    first_name: { en: 'Nok', th: 'นก' },
    name: { en: 'Nok Srisuk' },
    position: { en: 'Registered Nurse' },
    department: { en: 'ICU' },
    features,
  },
});

const renderAt = (path) => render(
  <IntlProvider locale="en">
    <AppContext.Provider value={{ authenticatedUser: { username: 'emp02417', name: 'Nattaya Boonsri' } }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/*" element={<ClassroomPages />} /></Routes>
      </MemoryRouter>
    </AppContext.Provider>
  </IntlProvider>,
);

describe('ELMP Classroom pages (P5-4.01: S-100…S-104; P3 CE hours)', () => {
  const assign = jest.fn();
  const realLocation = window.location;
  beforeAll(() => {
    delete window.location;
    window.location = { ...realLocation, assign };
  });
  afterAll(() => { window.location = realLocation; });

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mergeConfig({ LMS_BASE_URL: 'http://local.openedx.io', LEARNING_BASE_URL: LEARN });
    mockClient.me.mockResolvedValue(me());
    mockClient.dashboard.mockResolvedValue(dashboard);
    mockClient.certificates.mockResolvedValue(certificates);
    mockClient.hours.mockImplementation((year) => Promise.resolve(hours(year || 2026)));
    mockClient.certificateLink.mockResolvedValue({ data: { url: 'http://portal.local.openedx.io/classroom/certificates/x.pdf?signature=s' } });
    mockClient.unreadCount.mockResolvedValue({ data: { unread: 0 } });
    mockClient.notifications.mockResolvedValue({ data: [], meta: {} });
  });

  it('S-100 My Learning: CA-11 dashboard, cards link into the player', async () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'My Learning' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Upcoming deadlines' })).toBeInTheDocument();
    expect(await screen.findByText('1 course needs your attention')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Infection Control' })).toHaveAttribute('href', `${LEARN}/course/${INF}`);
    // resume hero = the overdue course, straight into the player
    expect(screen.getAllByRole('link').find((a) => a.classList.contains('cls3-resume'))).toHaveAttribute('href', `${LEARN}/course/${PSB}`);
    expect(screen.getAllByRole('link').some((a) => a.getAttribute('href') === `${LEARN}/course/${PSB}/${dashboard.data.next_quizzes[0].block_id}`))
      .toBe(true);
    expect(screen.getByRole('heading', { name: 'Learning streak' })).toBeInTheDocument(); // no learning_time yet
    expect(mockClient.dashboard).toHaveBeenCalled();
    expect(mockClient.compliance).not.toHaveBeenCalled(); // features.compliance off until V-6
  });

  it('Learner v2: features.compliance + grades on → CA-17 licence and groups, CA-16 rows', async () => {
    mockClient.me.mockResolvedValue(me({ streak: true, compliance: true, grades: true }));
    mockClient.compliance.mockResolvedValue({
      data: {
        groups: [{
          key: 'everyone',
          items: [{
            name: { en: 'Patient Safety Basics' }, course_key: PSB, every_months: 12, state: 'overdue', date: '2026-10-10',
          }],
        }],
        licence: {
          name: { en: 'Nursing licence' }, have: 32, need: 50, renew_by: '2028-05-31',
        },
      },
    });
    mockClient.grades.mockResolvedValue({
      data: {
        courses: [{
          course_key: INF, code: 'INF101', title: { en: 'Infection Control' }, grade_pct: 93, passed: null, started_at: '2026-10-02T08:00:00+07:00', due_at: null, completed_at: null, parts: [],
        }],
      },
    });
    const { unmount } = renderAt('/');
    expect(await screen.findByRole('region', { name: 'My licence' })).toBeInTheDocument();
    unmount();
    const progress = renderAt('/progress');
    expect(await screen.findByRole('region', { name: 'Everyone' })).toBeInTheDocument();
    expect(screen.getByText('1 item needs action')).toBeInTheDocument();
    progress.unmount();
    renderAt('/grades');
    expect(await screen.findByText('2 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('93%')).toBeInTheDocument();
  });

  it('S-100: Portal down → quiet notice, shell still works (NFR-C8)', async () => {
    mockClient.dashboard.mockRejectedValue(Object.assign(new Error('x'), { code: 'unavailable' }));
    renderAt('/');
    expect((await screen.findAllByText('Not available right now.')).length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Main menu' })).toBeInTheDocument();
  });

  it('S-101 Courses: every course, filter by name; ?q= from the top-bar search', async () => {
    renderAt('/courses');
    expect(screen.getByRole('heading', { level: 1, name: 'Courses' })).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Fire Safety on the Ward' });
    expect(screen.getAllByRole('article')).toHaveLength(3);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter courses by name' }), 'fire');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Fire Safety on the Ward' })).toHaveAttribute('href', `${LEARN}/course/${FIRE}`);
  });

  it('S-101: opens filtered from the search box and the Explore menu', async () => {
    renderAt('/courses?q=patient');
    await screen.findByRole('link', { name: 'Patient Safety Basics' });
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('S-102 Grades: one row per course with pass mark, links into the player; no CA-16 call while off', async () => {
    mergeConfig({ ELMP_QUIZ_PASS_PERCENT: '70' });
    renderAt('/grades');
    expect(screen.getByRole('heading', { level: 1, name: 'Grades' })).toBeInTheDocument();
    const inf = await screen.findByRole('link', { name: 'Infection Control' });
    expect(inf).toHaveAttribute('href', `${LEARN}/course/${INF}`);
    expect(screen.getAllByText('/ 70% to pass')).toHaveLength(1); // only INF101 has a score
    expect(mockClient.grades).not.toHaveBeenCalled();
    mergeConfig({ ELMP_QUIZ_PASS_PERCENT: undefined });
  });

  it('S-103 Progress: "Am I up to date?" from CA-11 required courses before CA-17', async () => {
    renderAt('/progress');
    expect(screen.getByRole('heading', { level: 1, name: 'Progress' })).toBeInTheDocument();
    const req = await screen.findByRole('region', { name: 'Required training' });
    expect(within(req).getAllByRole('listitem')).toHaveLength(2);
    expect(within(req).getByRole('link', { name: 'Continue: Patient Safety Basics' })).toHaveAttribute('href', `${LEARN}/course/${PSB}`);
  });

  it('S-104 Certificates: View dialog, verify link, locked cards; download through a signed link (F-96 BR-1)', async () => {
    mergeConfig({ ELMP_PORTAL_HOME_URL: 'http://portal.local.openedx.io' });
    renderAt('/certificates');
    await userEvent.click(await screen.findByRole('button', { name: 'View: Records & PDPA 2026' }));
    const dialog = screen.getByRole('dialog', { name: 'Certificate: Records & PDPA 2026' });
    expect(within(dialog).getByText('Nok Srisuk')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('link', { name: 'Verify' }))
      .toHaveAttribute('href', 'http://portal.local.openedx.io/certificates/verify?code=ELMP-2026-7KQ4-9XTD');
    expect(await screen.findAllByText('Complete the course to unlock.')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF: Records & PDPA 2026' }));
    expect(mockClient.certificateLink).toHaveBeenCalledWith('ELMP-2026-7KQ4-9XTD');
    expect(assign).toHaveBeenCalledWith('http://portal.local.openedx.io/classroom/certificates/x.pdf?signature=s');
  });

  it('S-104: a failed link shows a toast', async () => {
    mockClient.certificateLink.mockRejectedValue(new Error('410'));
    renderAt('/certificates');
    await userEvent.click(await screen.findByRole('button', { name: 'Download PDF: Records & PDPA 2026' }));
    expect(await screen.findByText('The download could not start. Please try again.')).toBeInTheDocument();
  });

  it('S-73: switches year', async () => {
    renderAt('/hours');
    await userEvent.click(await screen.findByRole('button', { name: '2025' }));
    await waitFor(() => expect(mockClient.hours).toHaveBeenLastCalledWith(2025, undefined));
  });

  it('Plan 4 F-112: CE hours switched off → /hours goes home', async () => {
    mockClient.me.mockResolvedValue(me({ ce_hours: false }));
    renderAt('/hours');
    expect(await screen.findByRole('heading', { name: 'Upcoming deadlines' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'My Learning' })).toBeInTheDocument();
    expect(mockClient.hours).not.toHaveBeenCalledWith(2025, undefined);
  });

  it('unknown paths go home', async () => {
    renderAt('/nowhere');
    expect(await screen.findByRole('heading', { name: 'Upcoming deadlines' })).toBeInTheDocument();
  });

  it('never shows the platform name (A3-6)', async () => {
    const { container } = renderAt('/');
    await screen.findAllByText('Infection Control');
    const words = [container.textContent, ...[...container.querySelectorAll('[title],[alt],[aria-label]')]
      .flatMap((el) => [el.getAttribute('title'), el.getAttribute('alt'), el.getAttribute('aria-label')])].join(' ');
    expect(words).not.toMatch(/open\s?edx|\blms\b|\bsso\b|\bmfe\b/i);
  });
});

describe('ELMP data helpers', () => {
  beforeEach(() => mergeConfig({ LEARNING_BASE_URL: LEARN }));

  it('every course link opens the player straight away (no course home page)', () => {
    const d = withLinks({
      ...dashboard.data,
      deadlines: [...dashboard.data.deadlines, { ...dashboard.data.deadlines[0], course_key: FIRE, action: 'start' }],
      next_quizzes: [...dashboard.data.next_quizzes, { course_key: INF, title: 'x' }],
    });
    expect(d.courses.map((c) => c.href)).toEqual([courseResumeUrl(INF), courseResumeUrl(PSB), courseResumeUrl(FIRE)]);
    expect(d.deadlines.map((x) => x.href)).toEqual([courseResumeUrl(PSB), courseResumeUrl(FIRE)]);
    expect(d.next_quizzes[0].href).toBe(unitUrl(PSB, dashboard.data.next_quizzes[0].block_id));
    expect(d.next_quizzes[1].href).toBe(courseResumeUrl(INF));
    expect(JSON.stringify(d)).not.toMatch(/\/home"/);
    expect(withLinks(undefined)).toBeUndefined();
    expect([viewStatus('refreshing'), viewStatus('error')]).toEqual(['ready', 'error']);
  });

  it('catalogue: my courses open the player, others keep the Portal link (enrolment page)', () => {
    const items = withCatalogueLinks([
      { course_key: INF, enrolled: true, href: 'http://lms/courses/inf/courseware' },
      { course_key: FIRE, enrolled: false, href: 'http://lms/courses/fire/courseware' },
    ]);
    expect(items.map((e) => e.href)).toEqual([courseResumeUrl(INF), 'http://lms/courses/fire/courseware']);
    expect(withCatalogueLinks(undefined)).toBeUndefined();
  });

  it('maps notification targets to Classroom routes (doc 03 §6)', () => {
    expect(targetPath({ kind: 'assignment', assignment_id: 41 })).toEqual({ path: '/', hash: '#cls3-dl' });
    expect(targetPath({ kind: 'certificate', code: 'C1' })).toEqual({ path: '/certificates', hash: '#cert-C1' });
    expect(targetPath({ kind: 'portal', url: 'http://p/x' })).toEqual({ href: 'http://p/x' });
    expect(targetPath(undefined)).toEqual({ path: '/', hash: '' });
  });

  it('keeps Classroom links inside the app', () => {
    expect(toRoute('/learner-dashboard/')).toBe('/');
    expect(toRoute('/learner-dashboard/courses')).toBe('/courses');
    expect(toRoute('http://apps.local.openedx.io/learning/course/x/home')).toBeNull();
  });
});
