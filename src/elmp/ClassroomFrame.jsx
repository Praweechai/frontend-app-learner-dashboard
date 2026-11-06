// ELMP Plan 4 shell (F-115, S-90/S-91): sidebar + top bar + phone tabs from the kit, messages panel (S-74).
// Replaces the Plan 3 top header. No "Open edX" anywhere.
import { useRef } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ClassroomShell, NotificationPanel, getClassroomIntl, messages,
} from '@elmp/classroom-kit';

import { classroomLinks, currentTab, useClassroomUser } from './ClassroomHeader';
import setClassroomLanguage from './language';
import { targetPath, useMessageList, useUnreadCount } from './useMessages';

const TITLES = {
  home: messages.navHomeShort,
  courses: messages.navCourses,
  certificates: messages.navCertificates,
  hours: messages.navHours,
};

const ClassroomFrame = ({ children }) => {
  const { locale } = useIntl();
  const config = getConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const trigger = useRef(null);
  const {
    user, unread: initialUnread, hasPortalWork, username, features,
  } = useClassroomUser();
  const [unread, setUnread] = useUnreadCount(initialUnread);
  const open = params.get('messages') === '1';
  const list = useMessageList(open);

  const current = currentTab(location.pathname);
  const links = {
    ...classroomLinks(config),
    hours: features.ce_hours ? classroomLinks(config).hours : undefined, // Plan 4 F-112
    portal: hasPortalWork ? config.ELMP_PORTAL_HOME_URL : undefined,
  };
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
    <>
      <ClassroomShell
        current={current}
        title={getClassroomIntl(locale).formatMessage(TITLES[current])}
        links={links}
        user={user.name ? user : undefined}
        unread={unread}
        locale={locale}
        onLocaleChange={(code) => setClassroomLanguage(code, username)}
        onOpenMessages={openMessages}
        logoUrl={config.LOGO_URL || undefined}
        pageAs="div" /* App.jsx owns <main id="main"> */
      >
        {children}
      </ClassroomShell>
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
    </>
  );
};

ClassroomFrame.propTypes = { children: PropTypes.node };

export default ClassroomFrame;
