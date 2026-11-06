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

describe('ELMP Classroom shell (P4-5.01 · F-115; P3 F-98, F-100)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mergeConfig({
      LMS_BASE_URL: 'http://local.openedx.io',
      LOGOUT_URL: 'http://local.openedx.io/logout',
      ELMP_ACCOUNT_URL: 'http://portal.local.openedx.io/profile',
    });
    mockClient.me.mockResolvedValue(me);
    mockClient.unreadCount.mockResolvedValue({ data: { unread: 4 } });
    mockClient.notifications.mockResolvedValue({ data: [note], meta: {} });
    mockClient.markRead.mockResolvedValue({});
    mockClient.markAllRead.mockResolvedValue({});
  });

  it('links the Classroom pages and signs out through the LMS', () => {
    expect(classroomLinks()).toMatchObject({
      home: '/learner-dashboard/',
      courses: '/learner-dashboard/courses',
      certificates: '/learner-dashboard/certificates',
      hours: '/learner-dashboard/hours',
      account: 'http://portal.local.openedx.io/profile',
      signOut: 'http://local.openedx.io/logout',
    });
    expect([currentTab('/'), currentTab('/courses'), currentTab('/certificates'), currentTab('/hours/')])
      .toEqual(['home', 'courses', 'certificates', 'hours']);
  });

  it('shows the person and unread count from the Portal, page title in the top bar', async () => {
    renderHeader();
    expect(await screen.findByRole('button', { name: 'Account menu for Nok Srisuk' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Messages, 4 unread' }).length).toBeGreaterThanOrEqual(2);
    expect(within(menu()).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(within(menu()).getByRole('link', { name: 'My courses' })).toHaveAttribute('href', '/learner-dashboard/courses');
    expect(within(screen.getByRole('banner')).getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('page')).toBeInTheDocument();
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
    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'ไทย' }));
    expect(setClassroomLanguage).toHaveBeenCalledWith('th', 'emp02417');
  });

  it('opens messages from the bell, opens one, lands on the required group (J-6)', async () => {
    renderHeader();
    await screen.findByRole('button', { name: 'Account menu for Nok Srisuk' });
    await userEvent.click(within(menu()).getByRole('button', { name: /^Messages/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/?messages=1');
    const dialog = await screen.findByRole('dialog', { name: 'Messages' });
    await userEvent.click(await within(dialog).findByRole('button', { name: /Deadline passed/ }));
    expect(mockClient.markRead).toHaveBeenCalledWith('n1');
    expect(screen.getByTestId('where')).toHaveTextContent('/#cls-d-dl');
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
