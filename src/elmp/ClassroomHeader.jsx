import { useContext } from 'react';
import PropTypes from 'prop-types';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import {
  BottomTabs, ClassroomHeader, getPortalClient, localized, usePortal,
} from '@elmp/classroom-kit';

import setClassroomLanguage from './language';

const BASE = '/learner-dashboard';

export const classroomLinks = (config = getConfig()) => ({
  home: `${BASE}/`,
  certificates: `${BASE}/certificates`,
  hours: `${BASE}/hours`,
  account: config.ELMP_ACCOUNT_URL || undefined,
  signOut: config.LOGOUT_URL || `${config.LMS_BASE_URL}/logout`,
});

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
    user: {
      name: data ? localized(data.name, locale) : fallbackName,
      position: data ? localized(data.position, locale) : undefined,
      department: data ? localized(data.department, locale) : undefined,
      photoUrl: data?.photo_url || undefined,
    },
    firstName: data ? localized(data.first_name, locale) : fallbackName.split(' ')[0],
  };
};

// ELMP: replaces the Open edX header on the Classroom home (S-70, doc 04 §5.1). No "Open edX" anywhere.
const ElmpClassroomHeader = ({ current = 'home', onOpenMessages }) => {
  const { locale } = useIntl();
  const config = getConfig();
  const {
    user, unread, hasPortalWork, username,
  } = useClassroomUser();
  const links = { ...classroomLinks(config), portal: hasPortalWork ? config.ELMP_PORTAL_HOME_URL : undefined };
  const onLocaleChange = (code) => setClassroomLanguage(code, username);
  return (
    <>
      <ClassroomHeader
        current={current}
        links={links}
        user={user.name ? user : undefined}
        unread={unread}
        locale={locale}
        onLocaleChange={onLocaleChange}
        onOpenMessages={onOpenMessages}
        logoUrl={config.LOGO_URL}
      />
      <BottomTabs current={current} links={links} unread={unread} onOpenMessages={onOpenMessages} />
    </>
  );
};

ElmpClassroomHeader.propTypes = {
  current: PropTypes.oneOf(['home', 'certificates', 'hours']),
  onOpenMessages: PropTypes.func,
};

export default ElmpClassroomHeader;
