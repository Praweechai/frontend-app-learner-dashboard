// ELMP Plan 4: Home 2.0 data = Portal CA-11 `GET /dashboard` (doc 02 §6). The Portal sends course keys and
// block ids; this app turns them into player links (the Portal does not know the Classroom URLs).
import { useMemo } from 'react';
import { getConfig } from '@edx/frontend-platform';
import { getPortalClient, usePortal } from '@elmp/classroom-kit';

// LEARNING_BASE_URL already ends with /learning (Tutor MFE config).
const learningBase = () => getConfig().LEARNING_BASE_URL || '/learning';
// Every course link opens the player straight away (NetAcad): last unit, or the first one for a new course.
export const courseResumeUrl = (courseKey) => `${learningBase()}/course/${courseKey}`;
export const unitUrl = (courseKey, blockId) => `${learningBase()}/course/${courseKey}/${blockId}`;

export function withLinks(data) {
  if (!data) { return data; }
  return {
    ...data,
    courses: (data.courses || []).map((c) => ({ ...c, href: courseResumeUrl(c.course_key) })),
    deadlines: (data.deadlines || []).map((d) => ({ ...d, href: courseResumeUrl(d.course_key) })),
    next_quizzes: (data.next_quizzes || []).map((q) => ({
      ...q, href: q.block_id ? unitUrl(q.course_key, q.block_id) : courseResumeUrl(q.course_key),
    })),
  };
}

// View status: the kit views know loading / ready / error; a background refresh keeps the page as it is.
export const viewStatus = (status) => (status === 'refreshing' ? 'ready' : status);

// Learner v2 (doc 10 V-2.01): CA-16 grades / CA-17 compliance only when the Portal switches the feature on
// (/me features.grades, features.compliance — V-6). Off or failing → undefined, and the kit view uses CA-11 only.
export function useFeatureData(enabled, call) {
  const res = usePortal(
    (opts) => (enabled ? call(getPortalClient(), opts) : Promise.resolve(null)),
    [Boolean(enabled)],
  );
  return enabled ? res.data?.data : undefined;
}

export default function useDashboard() {
  const res = usePortal((opts) => getPortalClient().dashboard(opts));
  const dashboard = useMemo(() => withLinks(res.data?.data), [res.data]);
  return {
    dashboard, status: viewStatus(res.status), error: res.error, reload: res.reload,
  };
}
