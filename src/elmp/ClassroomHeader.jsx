import { useContext, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import {
  BottomTabs, ClassroomHeader, LinkContext, NotificationPanel, getPortalClient, localized, usePortal,
} from '@elmp/classroom-kit';

import setClassroomLanguage from './language';
import RouterLink from './RouterLink';
import { targetPath, useMessageList, useUnreadCount } from './useMessages';

const BASE = '/learner-dashboard';

export const classroomLinks = (config = getConfig()) => ({
  home: `${BASE}/`,
  certificates: `${BASE}/certificates`,
  hours: `${BASE}/hours`,
  account: config.ELMP_ACCOUNT_URL || undefined,
  signOut: config.LOGOUT_URL || `${config.LMS_BASE_URL}/logout`,
});

export const currentTab = (pathname = '/') => {
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

// ELMP: replaces the Open edX header on the Classroom pages (S-70…S-74, doc 04 §5.1). No "Open edX" anywhere.
const ElmpClassroomHeader = () => {
  const { locale } = useIntl();
  const config = getConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const trigger = useRef(null);
  const {
    user, unread: initialUnread, hasPortalWork, username,
  } = useClassroomUser();
  const [unread, setUnread] = useUnreadCount(initialUnread);
  const open = params.get('messages') === '1';
  const list = useMessageList(open);

  const current = currentTab(location.pathname);
  const links = { ...classroomLinks(config), portal: hasPortalWork ? config.ELMP_PORTAL_HOME_URL : undefined };
  const setOpen = (value) => {
    const next = new URLSearchParams(params);
    if (value) { next.set('messages', '1'); } else { next.delete('messages'); }
    setParams(next, { replace: true });
  };
  const openMessages = () => {
    trigger.current = document.activeElement;
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setTimeout(() => trigger.current?.focus?.(), 0);
  };
  const openItem = async (item) => {
    if (!item.read_at) { setUnread((n) => Math.max(0, n - 1)); }
    await list.markRead(item);
    const to = targetPath(item.target);
    if (to.href) { window.location.assign(to.href); return; }
    navigate({ pathname: to.path, hash: to.hash });
  };
  const markAll = async () => { setUnread(0); await list.markAllRead(); };

  return (
    <LinkContext.Provider value={RouterLink}>
      <ClassroomHeader
        current={current}
        links={links}
        user={user.name ? user : undefined}
        unread={unread}
        locale={locale}
        onLocaleChange={(code) => setClassroomLanguage(code, username)}
        onOpenMessages={openMessages}
        logoUrl={config.LOGO_URL}
      />
      <BottomTabs current={current} links={links} unread={unread} onOpenMessages={openMessages} />
      <NotificationPanel
        open={open}
        onClose={close}
        items={list.items}
        loading={list.loading}
        error={list.error}
        hasMore={Boolean(list.cursor)}
        onOpenItem={openItem}
        onMarkAllRead={markAll}
        onLoadMore={list.loadMore}
        onRetry={list.reload}
      />
    </LinkContext.Provider>
  );
};

export default ElmpClassroomHeader;
