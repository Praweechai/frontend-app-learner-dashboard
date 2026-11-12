import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter, Route, Routes, useLocation,
} from 'react-router-dom';

import ElmpClassroomHeader, { classroomLinks, currentTab } from './ClassroomHeader';
import ClassroomFrame from './ClassroomFrame';
import setClassroomLanguage from './language';

const mockClient = {
  me: jest.fn(),
  dashboard: jest.fn(),
  unreadCount: jest.fn(),
  notifications: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  announcement: jest.fn(),
  catalogue: jest.fn(),
};
jest.mock('@elmp/classroom-kit', () => ({
  ...jest.requireActual('@elmp/classroom-kit'),
  getPortalClient: () => mockClient,
}));
jest.mock('./language', () => jest.fn());

const me = {
  data: {
    name: { en: 'Nok Srisuk', th: 'นก ศรีสุข' },
    first_name: { en: 'Nok', th: 'นก' },
    position: { en: 'Registered Nurse', th: 'พยาบาลวิชาชีพ' },
    department: { en: 'ICU', th: 'ไอซียู' },
    photo_url: null,
    unread_notifications: 4,
    has_portal_work: false,
    features: { ce_hours: true },
  },
};
const note = {
  id: 'n1',
  type: 'deadline_passed',
  title: { en: 'Deadline passed', th: 'เลยกำหนดแล้ว' },
  body: { en: '1 course left.', th: 'เหลือ 1 หลักสูตร' },
  target: { kind: 'assignment', assignment_id: 41 },
  read_at: null,
  created_at: '2026-11-04T08:00:00+07:00',
};

const menu = () => screen.getByRole('navigation', { name: 'Main menu' });
const Where = () => { const l = useLocation(); return <output data-testid="where">{`${l.pathname}${l.search}${l.hash}`}</output>; };

const renderHeader = (locale = 'en', path = '/') => render(
  <IntlProvider locale={locale}>
    <AppContext.Provider value={{ authenticatedUser: { username: 'emp02417', name: 'Nattaya Boonsri' } }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/*" element={<><ElmpClassroomHeader /><ClassroomFrame><p>page</p></ClassroomFrame><Where /></>} />
        </Routes>
      </MemoryRouter>
    </AppContext.Provider>
  </IntlProvider>,
);

describe('ELMP Classroom shell 3 (P5-4.01 · F-130; P4 F-115; P3 F-98, F-100)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mergeConfig({
      LMS_BASE_URL: 'http://local.openedx.io',
      LOGOUT_URL: 'http://local.openedx.io/logout',
      ELMP_ACCOUNT_URL: 'http://portal.local.openedx.io/profile',
    });
    mockClient.me.mockResolvedValue(me);
    mockClient.dashboard.mockResolvedValue({
      data: {
        courses: [
          { course_key: 'course-v1:MHB+PSB101+2026', category: 'safety', title: { en: 'Patient Safety Basics', th: 'พื้นฐานความปลอดภัยของผู้ป่วย' } },
          { course_key: 'course-v1:MHB+REG101+2026', category: 'compliance', title: { en: 'Hospital Regulations', th: 'ระเบียบโรงพยาบาล' } },
        ],
      },
    });
    mockClient.unreadCount.mockResolvedValue({ data: { unread: 4 } });
    mockClient.notifications.mockResolvedValue({ data: [note], meta: {} });
    mockClient.markRead.mockResolvedValue({});
    mockClient.markAllRead.mockResolvedValue({});
    mockClient.announcement.mockResolvedValue({ data: null });
  });

  it('links the Classroom pages and signs out through the LMS', () => {
    expect(classroomLinks()).toMatchObject({
      home: '/learner-dashboard/',
      courses: '/learner-dashboard/courses',
      grades: '/learner-dashboard/grades',
      progress: '/learner-dashboard/progress',
      certificates: '/learner-dashboard/certificates',
      hours: '/learner-dashboard/hours',
      account: 'http://portal.local.openedx.io/profile',
      signOut: 'http://local.openedx.io/logout',
    });
    expect(['/', '/courses', '/grades', '/progress/', '/certificates', '/hours/'].map(currentTab))
      .toEqual(['home', 'courses', 'grades', 'progress', 'certificates', 'hours']);
  });

  it('shows the person and unread count from the Portal, page title in the top bar', async () => {
    renderHeader();
    expect(await screen.findByRole('button', { name: 'Account menu for Nok Srisuk' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Messages, 4 unread' })).toBeInTheDocument();
    expect(within(menu()).getByRole('link', { name: 'My Learning' })).toHaveAttribute('aria-current', 'page');
    expect(within(menu()).getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/learner-dashboard/courses');
    expect(within(menu()).getByRole('link', { name: 'Grades' })).toHaveAttribute('href', '/learner-dashboard/grades');
    expect(within(menu()).getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/learner-dashboard/progress');
    expect(screen.getByRole('heading', { level: 1, name: 'My Learning' })).toBeInTheDocument();
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('Explore = categories of my courses, search suggests my courses and opens the Courses page', async () => {
    renderHeader();
    await userEvent.click(await screen.findByRole('button', { name: /Explore/ }));
    expect(screen.getByRole('link', { name: 'Patient safety' })).toHaveAttribute('href', '/learner-dashboard/courses?category=safety');
    expect(screen.getByRole('link', { name: 'All courses' })).toHaveAttribute('href', '/learner-dashboard/courses');
    const box = screen.getByRole('combobox', { name: 'Search courses and help' });
    await userEvent.type(box, 'regul');
    expect(screen.getByRole('link', { name: 'Hospital Regulations' })).toBeInTheDocument();
    await userEvent.type(box, '{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/courses?q=regul');
  });

  it('Plan 5 P5-9: shows HR\'s banner (CA-14) with its link; none when the Portal sends null', async () => {
    mockClient.announcement.mockResolvedValue({
      data: {
        id: 7,
        tone: 'urgent',
        text: { en: 'Finish INF101 by 30 November.', th: 'เรียน INF101 ให้จบภายใน 30 พ.ย.' },
        link: { href: '/learner-dashboard/courses', label: { en: 'Open courses', th: 'เปิดหลักสูตร' } },
        starts_at: '2026-11-01T00:00:00+07:00',
        ends_at: '2026-11-30T23:59:00+07:00',
      },
    });
    renderHeader();
    expect(await screen.findByText(/Finish INF101 by 30 November/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open courses' })).toHaveAttribute('href', '/learner-dashboard/courses');
  });

  it('Plan 5 P5-9: with the catalogue switched on, Explore + search use every course the learner may see (CA-15)', async () => {
    mockClient.me.mockResolvedValue({ data: { ...me.data, features: { catalogue: true } } });
    mockClient.catalogue.mockResolvedValue({
      data: [{
        course_key: 'course-v1:MHB+FIRE101+2026',
        code: 'FIRE101',
        enrolled: false,
        href: 'http://lms/courses/x/courseware',
        title: { en: 'Fire Safety', th: 'อัคคีภัย' },
        category: { key: 'emergency', en: 'Emergency', th: 'ฉุกเฉิน' },
      }],
    });
    renderHeader();
    await screen.findByText('page');
    await userEvent.click(await screen.findByRole('button', { name: /Explore/ }));
    expect(await screen.findByRole('link', { name: 'Emergency' })).toHaveAttribute('href', '/learner-dashboard/courses?category=emergency');
    expect(mockClient.catalogue).toHaveBeenCalledWith({ perPage: 50 }, undefined);
  });

  it('the header slot itself draws nothing (the shell does)', () => {
    const { container } = render(<ElmpClassroomHeader />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the current page from the route', async () => {
    renderHeader('en', '/hours');
    await screen.findByRole('button', { name: 'Account menu for Nok Srisuk' });
    expect(within(menu()).getByRole('link', { name: 'CE hours' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'CE hours' })).toBeInTheDocument();
  });

  it('Plan 4 F-112: no CE hours tab when the switch is off', async () => {
    mockClient.me.mockResolvedValue({ data: { ...me.data, features: { ce_hours: false } } });
    renderHeader();
    await screen.findByRole('button', { name: 'Account menu for Nok Srisuk' });
    expect(screen.queryByRole('link', { name: 'CE hours' })).not.toBeInTheDocument();
    expect(within(menu()).getByRole('link', { name: 'Certificates' })).toBeInTheDocument();
  });

  it('falls back to the Open edX user when the Portal is down (NFR-C8)', async () => {
    mockClient.me.mockRejectedValue(Object.assign(new Error('down'), { code: 'unavailable' }));
    renderHeader();
    expect(await screen.findByRole('button', { name: 'Account menu for Nattaya Boonsri' })).toBeInTheDocument();
  });

  it('switches language through the J-8 chain', async () => {
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: 'Choose language' }));
    await userEvent.click(screen.getByRole('option', { name: 'ไทย (Thai)' }));
    expect(setClassroomLanguage).toHaveBeenCalledWith('th', 'emp02417');
  });

  it('opens messages from the bell, opens one, lands on the required group (J-6)', async () => {
    renderHeader();
    await screen.findByRole('button', { name: 'Account menu for Nok Srisuk' });
    await userEvent.click(await screen.findByRole('button', { name: /^Messages/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/?messages=1');
    const dialog = await screen.findByRole('dialog', { name: 'Messages' });
    await userEvent.click(await within(dialog).findByRole('button', { name: /Deadline passed/ }));
    expect(mockClient.markRead).toHaveBeenCalledWith('n1');
    expect(screen.getByTestId('where')).toHaveTextContent('/#cls3-dl');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the panel from ?messages=1 and closes it with Escape', async () => {
    renderHeader('en', '/?messages=1');
    expect(await screen.findByRole('dialog', { name: 'Messages' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('never shows the platform name (A3-6)', async () => {
    const { container } = renderHeader('th', '/?messages=1');
    await screen.findByRole('button', { name: /นก ศรีสุข/ });
    await screen.findByText('เลยกำหนดแล้ว');
    const words = [container.textContent, ...[...container.querySelectorAll('[title],[alt],[aria-label]')]
      .flatMap((el) => [el.getAttribute('title'), el.getAttribute('alt'), el.getAttribute('aria-label')])].join(' ');
    expect(words).not.toMatch(/open\s?edx|\blms\b|\bsso\b|\bmfe\b/i);
  });
});
