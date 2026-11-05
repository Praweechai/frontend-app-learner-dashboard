// ELMP Classroom: Open edX enrolments → kit course view models (S-70, F-92).
// Unit-level completion comes from the LMS course-home progress API (not in the dashboard payload);
// a failed call just means "no bar" (doc 05 §5).
import { useEffect, useMemo, useState } from 'react';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { useInitializeLearnerHome } from 'data/hooks';
import { baseAppUrl } from 'data/services/lms/urls';

const progressCache = new Map();
const BASE_CERTS = '/learner-dashboard/certificates';

export async function fetchCompletion(courseId) {
  if (progressCache.has(courseId)) { return progressCache.get(courseId); }
  const promise = getAuthenticatedHttpClient()
    .get(`${getConfig().LMS_BASE_URL}/api/course_home/progress/${encodeURIComponent(courseId)}`)
    .then(({ data }) => {
      const s = data?.completion_summary || {};
      const total = (s.complete_count || 0) + (s.incomplete_count || 0) + (s.locked_count || 0);
      return total ? { done: s.complete_count || 0, total } : null;
    })
    .catch(() => null);
  progressCache.set(courseId, promise);
  return promise;
}

export function resetCompletionCache() { progressCache.clear(); }

const absolute = (url) => {
  if (!url) { return undefined; }
  return /^https?:\/\//.test(url) ? url : baseAppUrl(url);
};

export function toCourseView(courseData, completion) {
  const {
    course = {}, courseRun = {}, enrollment = {}, certificate = {}, gradeData = {},
  } = courseData;
  const passed = Boolean(gradeData?.isPassing || certificate?.isEarned);
  // Plan 4 F-111: Completed ("passed") = grade passes AND every unit done; passed with units left = "almost".
  // Units unknown (progress call failed) → the grade decides alone, as in Plan 3.
  const allUnits = !completion || completion.done >= completion.total;
  let state = 'not_started';
  if (passed && allUnits) {
    state = 'passed';
  } else if (passed) {
    state = 'almost';
  } else if (enrollment?.hasStarted || completion?.done > 0) { state = 'in_progress'; }
  const pct = completion ? Math.round((completion.done * 100) / completion.total) : Number(passed) * 100;
  return {
    key: courseRun?.courseId,
    title: course?.courseName || courseRun?.courseId || '',
    code: course?.courseNumber || undefined,
    imageUrl: course?.bannerImgSrc ? absolute(course.bannerImgSrc) : undefined,
    href: absolute(courseRun?.homeUrl),
    resumeHref: courseRun?.resumeUrl ? absolute(courseRun.resumeUrl) : undefined,
    state,
    progress: state === 'passed' ? 100 : Math.min(pct, 99),
    units: completion?.total,
    unitsDone: completion?.done,
    // Plan 4 F-113: certificates are the Portal's PDFs (Certificates page); the Open edX page is not linked.
    certificateUrl: state === 'passed' && certificate?.isEarned ? BASE_CERTS : undefined,
    lastEnrolled: enrollment?.lastEnrolled,
  };
}

export default function useClassroomCourses() {
  const { data, isPending } = useInitializeLearnerHome();
  const list = useMemo(() => (data?.courses || []).filter((c) => c?.courseRun?.courseId), [data?.courses]);
  const [completion, setCompletion] = useState({});

  useEffect(() => {
    let alive = true;
    list.forEach((c) => {
      const id = c.courseRun.courseId;
      fetchCompletion(id).then((value) => {
        if (alive) { setCompletion((prev) => (prev[id] === value ? prev : { ...prev, [id]: value })); }
      });
    });
    return () => { alive = false; };
  }, [list]);

  const courses = useMemo(
    () => list.map((c) => toCourseView(c, completion[c.courseRun.courseId])),
    [list, completion],
  );
  return { courses, loading: isPending };
}
