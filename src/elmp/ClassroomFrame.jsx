// ELMP Plan 5 shell (F-130, S-100…S-104): kit Shell 3 — sidebar, thin top bar (Explore, search suggestions,
// EN/TH, help, messages, profile), HR banner slot, phone tabs — plus the messages panel (S-74).
// Part 1: Explore categories and search suggestions come from the learner's own courses (CA-11).
// Part 2 (P5-9): with features.catalogue they come from every course the learner may see (CA-15); the HR banner
// is CA-14 (null = none; an older Portal without it = none). No "Open edX" anywhere.
import { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ClassroomShell3, NotificationPanel, categoryLabel, getClassroomIntl, getPortalClient, localized, messages, usePortal,
} from '@elmp/classroom-kit';

import { classroomLinks, currentTab, useClassroomUser } from './ClassroomHeader';
import setClassroomLanguage from './language';
import useDashboard, { useCatalogue } from './useDashboard';
import { targetPath, useMessageList, useUnreadCount } from './useMessages';

const TITLES = {
  home: messages.shell3MyLearning,
  courses: messages.shell3Courses,
  grades: messages.shell3Grades,
  progress: messages.shell3Progress,
  certificates: messages.shell3Certificates,
  hours: messages.navHours,
};

const catKey = (c) => (typeof c.category === 'object' ? c.category?.key : c.category) || 'general';

// Explore menu = the categories of the learner's courses → Courses page filtered; search = course titles.
export const exploreItems = (courses, coursesHref, intl) => [
  ...new Map((courses || []).map((c) => [catKey(c), categoryLabel(c.category || 'general', intl)])).entries(),
].map(([key, label]) => ({ label, href: `${coursesHref}?category=${encodeURIComponent(key)}` }));

export const searchItems = (courses, locale) => (courses || [])
  .map((c) => ({ label: localized(c.title, locale), href: c.href }));

const getAnnouncement = (opts) => getPortalClient().announcement(opts);

const ClassroomFrame = ({ children }) => {
  const { locale } = useIntl();
  const config = getConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const trigger = useRef(null);
  const {
    user, unread: initialUnread, username, features,
  } = useClassroomUser();
  const { dashboard } = useDashboard();
  const [unread, setUnread] = useUnreadCount(initialUnread);
  const open = params.get('messages') === '1';
  const list = useMessageList(open);
  const intl = getClassroomIntl(locale);

  const current = currentTab(location.pathname);
  const links = {
    ...classroomLinks(config),
    hours: features.ce_hours ? classroomLinks(config).hours : undefined, // Plan 4 F-112
  };
  const catalogue = useCatalogue(features.catalogue);
  const announcement = usePortal(getAnnouncement).data?.data || null;
  const courses = catalogue || dashboard?.courses;
  const categories = useMemo(() => exploreItems(courses, links.courses, intl), [courses, links.courses, intl]);
  const suggestions = useMemo(() => searchItems(courses, locale), [courses, locale]);
  const helpItems = links.help ? [{ label: intl.formatMessage(messages.shell3Help), href: links.help }] : [];

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
      <ClassroomShell3
        current={current}
        title={intl.formatMessage(TITLES[current])}
        links={links}
        user={user.name ? user : undefined}
        unread={unread}
        locale={locale}
        onLocaleChange={(code) => setClassroomLanguage(code, username)}
        onOpenMessages={openMessages}
        logoUrl={config.LOGO_URL || undefined}
        categories={categories}
        allCoursesHref={links.courses}
        searchItems={features.search === false ? undefined : suggestions}
        onSearch={(q) => navigate(q ? `/courses?q=${encodeURIComponent(q)}` : '/courses')}
        helpItems={helpItems}
        announcement={announcement}
        pageAs="div" /* App.jsx owns <main id="main"> */
      >
        {children}
      </ClassroomShell3>
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
