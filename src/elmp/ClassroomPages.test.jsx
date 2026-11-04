import { mergeConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { useInitializeLearnerHome } from 'data/hooks';
import ClassroomPages from './ClassroomPages';
import { fetchCompletion, resetCompletionCache, toCourseView } from './useClassroomCourses';
import { targetPath } from './useMessages';
import { toRoute } from './RouterLink';

const mockClient = {
  me: jest.fn(), training: jest.fn(), certificates: jest.fn(), hours: jest.fn(), certificateLink: jest.fn(),
};
jest.mock('@elmp/classroom-kit', () => ({
  ...jest.requireActual('@elmp/classroom-kit'),
  getPortalClient: () => mockClient,
}));
jest.mock('data/hooks', () => ({ useInitializeLearnerHome: jest.fn() }));
jest.mock('@edx/frontend-platform/auth', () => ({ getAuthenticatedHttpClient: jest.fn() }));

const KEY = 'course-v1:MissionHospital+INF101+2026';
const courseData = (key, name, extra = {}) => ({
  course: { courseName: name, courseNumber: key.split('+')[1], bannerImgSrc: '/asset/banner.jpg' },
  courseRun: { courseId: key, homeUrl: `http://apps.local.openedx.io/learning/course/${key}/home`, resumeUrl: `/courses/${key}/jump_to/u3` },
  enrollment: { hasStarted: true, lastEnrolled: '2026-10-01' },
  certificate: {},
  gradeData: { isPassing: false },
  ...extra,
});
const training = {
  data: {
    summary: {
      overdue: 1, due_soon: 0, due_this_month: 0, completed: 0, ce_hours: 24, ce_target_hours: 40,
    },
    continue: { course_key: KEY, assignment_id: 41 },
    assignments: [{
      id: 41,
      roadmap: { id: 7, title: { en: 'Annual Infection Control 2026', th: 'ควบคุมการติดเชื้อประจำปี 2569' } },
      status: 'overdue',
      due_at: '2026-10-31T23:59:59+07:00',
      days_left: -3,
      progress_percent: 0,
      completed_at: null,
      courses: [{
        course_key: KEY, title: { en: 'Isolation Precautions', th: 'การป้องกันการแพร่กระจายเชื้อ' }, status: 'in_progress', ce_hours: 3, enrolled: true,
      }],
    }],
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

const renderAt = (path) => render(
  <IntlProvider locale="en">
    <AppContext.Provider value={{ authenticatedUser: { username: 'emp02417', name: 'Nattaya Boonsri' } }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/*" element={<ClassroomPages />} /></Routes>
      </MemoryRouter>
    </AppContext.Provider>
  </IntlProvider>,
);

describe('ELMP Classroom pages (P3-4.02…4.05)', () => {
  const http = { get: jest.fn() };
  const assign = jest.fn();

  const realLocation = window.location;
  beforeAll(() => {
    delete window.location;
    window.location = { ...realLocation, assign };
  });
  afterAll(() => { window.location = realLocation; });

  beforeEach(() => {
    jest.clearAllMocks();
    resetCompletionCache();
    mergeConfig({
      LMS_BASE_URL: 'http://local.openedx.io',
      LEARNING_BASE_URL: 'http://apps.local.openedx.io/learning',
    });
    getAuthenticatedHttpClient.mockReturnValue(http);
    http.get.mockResolvedValue({
      data: { completion_summary: { complete_count: 3, incomplete_count: 5, locked_count: 0 } },
    });
    useInitializeLearnerHome.mockReturnValue({
      data: { courses: [courseData(KEY, 'Isolation Precautions')] }, isPending: false,
    });
    mockClient.me.mockResolvedValue({ data: { first_name: { en: 'Nok', th: 'นก' }, name: { en: 'Nok Srisuk' } } });
    mockClient.training.mockResolvedValue(training);
    mockClient.certificates.mockResolvedValue(certificates);
    mockClient.hours.mockImplementation((year) => Promise.resolve(hours(year || 2026)));
    mockClient.certificateLink.mockResolvedValue({ data: { url: 'http://portal.local.openedx.io/classroom/certificates/x.pdf?signature=s' } });
  });

  it('S-70: greets, continues at the next unit, lists the required group and the course card', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Nok$/ })).toBeInTheDocument();
    expect((await screen.findAllByRole('link', { name: 'Continue: Isolation Precautions' })).length).toBeGreaterThan(0);
    expect(await screen.findByText('Unit 4 of 8')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Isolation Precautions.*In progress/ }))
      .toHaveAttribute('href', `http://apps.local.openedx.io/learning/course/${KEY}/home`);
    expect(await screen.findByText('Required · Annual Infection Control 2026 · due 31 Oct 2026')).toBeInTheDocument();
    expect(http.get).toHaveBeenCalledWith(`http://local.openedx.io/api/course_home/progress/${encodeURIComponent(KEY)}`);
  });

  it('S-70: Portal down → courses still listed with a quiet notice (A3-10)', async () => {
    mockClient.training.mockRejectedValue(Object.assign(new Error('x'), { code: 'unavailable' }));
    renderAt('/');
    expect(await screen.findByText('Deadlines are not available right now.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Isolation Precautions', level: 3 })).toBeInTheDocument();
  });

  it('S-70: missing training record → HR message (403 unmapped)', async () => {
    mockClient.training.mockRejectedValue(Object.assign(new Error('x'), { code: 'unmapped' }));
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Your training record is missing' })).toBeInTheDocument();
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

  it('unknown paths go home', async () => {
    renderAt('/nowhere');
    expect(await screen.findByRole('heading', { level: 1, name: /Nok$/ })).toBeInTheDocument();
  });

  it('S-70 deep link #required-41 highlights the group (J-4)', async () => {
    const { container } = renderAt('/#required-41');
    await waitFor(() => expect(container.querySelector('#required-41')).toHaveClass('is-highlighted'));
    expect(within(container.querySelector('#required-41')).getByText('Overdue')).toBeInTheDocument();
  });
});

describe('ELMP data helpers', () => {
  beforeEach(() => mergeConfig({ LMS_BASE_URL: 'http://local.openedx.io' }));

  it('maps Open edX course data to course views', () => {
    const v = toCourseView(courseData(KEY, 'Isolation Precautions'), { done: 3, total: 8 });
    expect(v).toMatchObject({
      key: KEY, title: 'Isolation Precautions', code: 'INF101', state: 'in_progress', progress: 38, units: 8, unitsDone: 3,
    });
    expect(v.resumeHref).toBe(`http://local.openedx.io/courses/${KEY}/jump_to/u3`);
    const passed = toCourseView(courseData(KEY, 'X', { gradeData: { isPassing: true }, certificate: { isEarned: true, certPreviewUrl: '/certificates/abc' } }));
    expect(passed).toMatchObject({ state: 'passed', progress: 100, certificateUrl: 'http://local.openedx.io/certificates/abc' });
    expect(toCourseView(courseData(KEY, 'X', { enrollment: { hasStarted: false } })).state).toBe('not_started');
  });

  it('completion failure means no bar, and is cached per session', async () => {
    resetCompletionCache();
    const http = { get: jest.fn().mockRejectedValue(new Error('404')) };
    getAuthenticatedHttpClient.mockReturnValue(http);
    await expect(fetchCompletion(KEY)).resolves.toBeNull();
    await fetchCompletion(KEY);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('maps notification targets to Classroom routes (doc 03 §6)', () => {
    expect(targetPath({ kind: 'assignment', assignment_id: 41 })).toEqual({ path: '/', hash: '#required-41' });
    expect(targetPath({ kind: 'certificate', code: 'C1' })).toEqual({ path: '/certificates', hash: '#cert-C1' });
    expect(targetPath({ kind: 'portal', url: 'http://p/x' })).toEqual({ href: 'http://p/x' });
    expect(targetPath(undefined)).toEqual({ path: '/', hash: '' });
  });

  it('keeps Classroom links inside the app', () => {
    expect(toRoute('/learner-dashboard/')).toBe('/');
    expect(toRoute('/learner-dashboard/hours')).toBe('/hours');
    expect(toRoute('http://apps.local.openedx.io/learning/course/x/home')).toBeNull();
  });
});
