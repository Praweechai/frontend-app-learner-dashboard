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
  courseHomeUrl, courseResumeUrl, unitUrl, viewStatus, withLinks,
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
  data: { first_name: { en: 'Nok', th: 'นก' }, name: { en: 'Nok Srisuk' }, features },
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

describe('ELMP Classroom pages (P4-5.01 Home 2.0 + My courses; P3 certificates, CE hours)', () => {
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

  it('S-90: dashboard from the Portal, links into the player', async () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Upcoming deadlines' })).toBeInTheDocument();
    await screen.findAllByText('Infection Control');
    expect(screen.getByRole('link', { name: 'Continue: Patient Safety Basics' }))
      .toHaveAttribute('href', `${LEARN}/course/${PSB}`);
    expect(screen.getByRole('link', { name: 'Infection Control' })).toHaveAttribute('href', `${LEARN}/course/${INF}/home`);
    expect(screen.getAllByRole('link').some((a) => a.getAttribute('href') === `${LEARN}/course/${PSB}/${dashboard.data.next_quizzes[0].block_id}`))
      .toBe(true);
    expect(screen.getByRole('heading', { name: 'My courses (3)' })).toBeInTheDocument();
    expect(mockClient.dashboard).toHaveBeenCalled();
  });

  it('S-90: Portal down → quiet notice, no broken widgets (NFR-C8)', async () => {
    mockClient.dashboard.mockRejectedValue(Object.assign(new Error('x'), { code: 'unavailable' }));
    renderAt('/');
    expect(await screen.findByText('Deadlines are not available right now.')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main menu' })).toBeInTheDocument();
  });

  it('S-91: My courses — search and filter the full list', async () => {
    renderAt('/courses');
    expect(screen.getByRole('heading', { level: 1, name: 'My courses' })).toBeInTheDocument();
    const search = await screen.findByRole('searchbox', { name: 'Search courses' });
    await userEvent.type(search, 'fire');
    const table = screen.getByRole('table');
    expect(within(table).getByRole('link', { name: 'Fire Safety on the Ward' })).toHaveAttribute('href', `${LEARN}/course/${FIRE}/home`);
    expect(within(table).queryByText('Infection Control')).toBeNull();
  });

  it('S-72: downloads a roadmap certificate through a signed link (F-96 BR-1)', async () => {
    renderAt('/certificates');
    await userEvent.click(await screen.findByRole('button', { name: 'Download PDF' }));
    expect(mockClient.certificateLink).toHaveBeenCalledWith('ELMP-2026-7KQ4-9XTD');
    expect(assign).toHaveBeenCalledWith('http://portal.local.openedx.io/classroom/certificates/x.pdf?signature=s');
  });

  it('S-72: a failed link shows a toast', async () => {
    mockClient.certificateLink.mockRejectedValue(new Error('410'));
    renderAt('/certificates');
    await userEvent.click(await screen.findByRole('button', { name: 'Download PDF' }));
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
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
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

  it('adds player links to the Portal dashboard (start → course home, continue → last unit)', () => {
    const d = withLinks({
      ...dashboard.data,
      deadlines: [...dashboard.data.deadlines, { ...dashboard.data.deadlines[0], course_key: FIRE, action: 'start' }],
      next_quizzes: [...dashboard.data.next_quizzes, { course_key: INF, title: 'x' }],
    });
    expect(d.courses.map((c) => c.href)).toEqual([courseHomeUrl(INF), courseHomeUrl(PSB), courseHomeUrl(FIRE)]);
    expect(d.deadlines.map((x) => x.href)).toEqual([courseResumeUrl(PSB), courseHomeUrl(FIRE)]);
    expect(d.next_quizzes[0].href).toBe(unitUrl(PSB, dashboard.data.next_quizzes[0].block_id));
    expect(d.next_quizzes[1].href).toBe(courseHomeUrl(INF));
    expect(withLinks(undefined)).toBeUndefined();
    expect([viewStatus('refreshing'), viewStatus('error')]).toEqual(['ready', 'error']);
  });

  it('maps notification targets to Classroom routes (doc 03 §6)', () => {
    expect(targetPath({ kind: 'assignment', assignment_id: 41 })).toEqual({ path: '/', hash: '#cls-d-dl' });
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
