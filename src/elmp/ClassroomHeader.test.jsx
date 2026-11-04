import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ElmpClassroomHeader, { classroomLinks } from './ClassroomHeader';
import setClassroomLanguage from './language';

const mockMe = jest.fn();
jest.mock('@elmp/classroom-kit', () => ({
  ...jest.requireActual('@elmp/classroom-kit'),
  getPortalClient: () => ({ me: mockMe }),
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
  },
};

const renderHeader = (locale = 'en') => render(
  <IntlProvider locale={locale}>
    <AppContext.Provider value={{ authenticatedUser: { username: 'emp02417', name: 'Nattaya Boonsri' } }}>
      <ElmpClassroomHeader />
    </AppContext.Provider>
  </IntlProvider>,
);

describe('ELMP Classroom header (P3-4.01, F-98)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mergeConfig({ LMS_BASE_URL: 'http://local.openedx.io', ELMP_ACCOUNT_URL: 'http://portal.local.openedx.io/profile' });
  });

  it('links the Classroom pages and signs out through the LMS', () => {
    expect(classroomLinks()).toMatchObject({
      home: '/learner-dashboard/',
      certificates: '/learner-dashboard/certificates',
      hours: '/learner-dashboard/hours',
      account: 'http://portal.local.openedx.io/profile',
      signOut: 'http://local.openedx.io/logout',
    });
  });

  it('shows the person and unread count from the Portal', async () => {
    mockMe.mockResolvedValue(me);
    renderHeader();
    expect(await screen.findByRole('button', { name: 'Account menu for Nok Srisuk' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Messages, 4 unread' })).toHaveLength(2);
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'My learning' })).toHaveAttribute('aria-current', 'page');
  });

  it('falls back to the Open edX user when the Portal is down (NFR-C8)', async () => {
    mockMe.mockRejectedValue(Object.assign(new Error('down'), { code: 'unavailable' }));
    renderHeader();
    expect(await screen.findByRole('button', { name: 'Account menu for Nattaya Boonsri' })).toBeInTheDocument();
  });

  it('switches language through the J-8 chain', async () => {
    mockMe.mockResolvedValue(me);
    renderHeader();
    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'ไทย' }));
    expect(setClassroomLanguage).toHaveBeenCalledWith('th', 'emp02417');
  });

  it('never shows the platform name (A3-6)', async () => {
    mockMe.mockResolvedValue(me);
    const { container } = renderHeader('th');
    await screen.findByRole('button', { name: /นก ศรีสุข/ });
    const words = [container.textContent, ...[...container.querySelectorAll('[title],[alt],[aria-label]')]
      .flatMap((el) => [el.getAttribute('title'), el.getAttribute('alt'), el.getAttribute('aria-label')])].join(' ');
    expect(words).not.toMatch(/open\s?edx|\blms\b|\bsso\b|\bmfe\b/i);
  });
});
