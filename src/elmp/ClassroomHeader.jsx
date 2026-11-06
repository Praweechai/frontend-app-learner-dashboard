import { useContext } from 'react';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { getPortalClient, localized, usePortal } from '@elmp/classroom-kit';

const BASE = '/learner-dashboard';

export const classroomLinks = (config = getConfig()) => ({
  home: `${BASE}/`,
  courses: `${BASE}/courses`,
  certificates: `${BASE}/certificates`,
  hours: `${BASE}/hours`,
  account: config.ELMP_ACCOUNT_URL || undefined,
  help: config.ELMP_HELP_URL || undefined,
  signOut: config.LOGOUT_URL || `${config.LMS_BASE_URL}/logout`,
});

export const currentTab = (pathname = '/') => {
  if (/\/courses\/?$/.test(pathname)) { return 'courses'; }
  if (/\/certificates\/?$/.test(pathname)) { return 'certificates'; }
  if (/\/hours\/?$/.test(pathname)) { return 'hours'; }
  return 'home';
};

// The person comes from the Portal (/me); if the Portal is down we still show the Open edX user (NFR-C8).
export const useClassroomUser = () => {
  const { authenticatedUser } = useContext(AppContext);
  const { locale } = useIntl();
  const me = usePortal((opts) => getPortalClient().me(opts));
  const data = me.data?.data;
  const fallbackName = authenticatedUser?.name || authenticatedUser?.username || '';
  return {
    username: authenticatedUser?.username,
    unread: data?.unread_notifications || 0,
    hasPortalWork: Boolean(data?.has_portal_work),
    // Plan 4 CA-01 switches; Portal down or older Portal → CE hours hidden (they come from the Portal anyway)
    features: data?.features || {},
    status: me.status,
    error: me.error,
    user: {
      name: data ? localized(data.name, locale) : fallbackName,
      position: data ? localized(data.position, locale) : undefined,
      department: data ? localized(data.department, locale) : undefined,
      photoUrl: data?.photo_url || undefined,
    },
    firstName: data ? localized(data.first_name, locale) : fallbackName.split(' ')[0],
  };
};

// Plan 4 (F-115): the header lives in the Classroom shell (sidebar + top bar), drawn by ClassroomFrame
// around the pages. App.jsx still mounts this slot, so it renders nothing.
const ElmpClassroomHeader = () => null;

export default ElmpClassroomHeader;
