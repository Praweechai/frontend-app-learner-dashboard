// ELMP Classroom pages — Plan 5 (F-130…F-135): S-100 My Learning, S-101 Courses, S-102 Grades, S-103 Progress,
// S-104 Certificates (+ S-73 CE hours while switched on). Mounted by App in place of the upstream Dashboard;
// index.jsx routes "/*" here so the nested routes work. Part 1 data: Portal CA-11 dashboard + CA-07 certificates.
// Part 2 (CA-13…CA-16) adds props only; until then those widgets stay hidden.
// Learner v2 (kit 2.1, V-2.01): CA-16 grades + CA-17 compliance are fetched only when /me switches them on
// (features.grades / features.compliance, V-6); CA-11 `learning_time` comes with the dashboard (features.streak).
import { useState } from 'react';
import {
  Navigate, Route, Routes, useLocation, useSearchParams,
} from 'react-router-dom';
import {
  CertificatesView2, CoursesView, GradesView, HoursView, LinkContext, MyLearningView, ProgressView, ToastProvider,
  getClassroomIntl, getPortalClient, messages, usePortal, useToast,
} from '@elmp/classroom-kit';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';

import { useClassroomUser } from './ClassroomHeader';
import ClassroomFrame from './ClassroomFrame';
import RouterLink from './RouterLink';
import useDashboard, { useFeatureData } from './useDashboard';

// Signed 5-minute PDF link (F-96 BR-1), then a normal download.
export const useCertificateDownload = () => {
  const toast = useToast();
  const { locale } = useIntl();
  return async (certificate) => {
    try {
      const res = await getPortalClient().certificateLink(certificate.code);
      window.location.assign(res.data.url);
    } catch (e) {
      toast(getClassroomIntl(locale).formatMessage(messages.downloadFailed));
    }
  };
};

const jobLine = (user) => [user.position, user.department].filter(Boolean).join(' · ') || undefined;
const getCompliance = (client, opts) => client.compliance(opts);
const getGrades = (client, opts) => client.grades(opts);

export const HomePage = () => {
  const { firstName, features } = useClassroomUser();
  const { dashboard, status, reload } = useDashboard();
  const compliance = useFeatureData(features.compliance, getCompliance);
  return (
    <MyLearningView
      dashboard={dashboard}
      compliance={compliance}
      status={status}
      firstName={firstName || undefined}
      now={new Date()}
      features={features}
      onRetry={reload}
    />
  );
};

// ?q= comes from the top-bar search, ?category= from the Explore menu; a new query remounts the view.
export const CoursesPage = () => {
  const { dashboard, status, reload } = useDashboard();
  const [params] = useSearchParams();
  const { search } = useLocation();
  return (
    <CoursesView
      key={search}
      dashboard={dashboard}
      status={status}
      now={new Date()}
      onRetry={reload}
      initialQuery={params.get('q') || ''}
      initialCategory={params.get('category') || 'all'}
    />
  );
};

export const GradesPage = () => {
  const { features } = useClassroomUser();
  const { dashboard, status, reload } = useDashboard();
  const grades = useFeatureData(features.grades, getGrades);
  const passMark = Number(getConfig().ELMP_QUIZ_PASS_PERCENT) || 60;
  return <GradesView dashboard={dashboard} grades={grades} status={status} passMark={passMark} onRetry={reload} />;
};

export const ProgressPage = () => {
  const { features, user } = useClassroomUser();
  const { dashboard, status, reload } = useDashboard();
  const compliance = useFeatureData(features.compliance, getCompliance);
  const grades = useFeatureData(features.grades, getGrades);
  return (
    <ProgressView
      dashboard={dashboard}
      compliance={compliance}
      grades={grades}
      jobTitle={jobLine(user)}
      status={status}
      now={new Date()}
      features={features}
      onRetry={reload}
    />
  );
};

export const CertificatesPage = () => {
  const { user } = useClassroomUser();
  const { dashboard } = useDashboard();
  const certificates = usePortal((opts) => getPortalClient().certificates(opts));
  const download = useCertificateDownload();
  const config = getConfig();
  return (
    <CertificatesView2
      items={certificates.data?.data || []}
      courses={dashboard?.courses || []}
      status={certificates.status === 'refreshing' ? 'ready' : certificates.status}
      error={certificates.error}
      learnerName={user.name || undefined}
      logoUrl={config.LOGO_URL || undefined}
      verifyUrl={config.ELMP_PORTAL_HOME_URL ? `${config.ELMP_PORTAL_HOME_URL}/certificates/verify` : undefined}
      onDownload={download}
      onRetry={certificates.reload}
    />
  );
};

export const HoursPage = () => {
  const [year, setYear] = useState(undefined);
  const { features, status } = useClassroomUser();
  const hours = usePortal((opts) => getPortalClient().hours(year, opts), [year]);
  // Plan 4 F-112: CE hours switched off (or unknown because the Portal is down) → home
  if (status !== 'loading' && !features.ce_hours) { return <Navigate to="/" replace />; }
  return (
    <HoursView
      data={hours.data?.data}
      status={hours.status}
      error={hours.error}
      year={year}
      onYearChange={setYear}
      onRetry={hours.reload}
    />
  );
};

const ClassroomPages = () => (
  <LinkContext.Provider value={RouterLink}>
    <ToastProvider>
      <ClassroomFrame>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="hours" element={<HoursPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ClassroomFrame>
    </ToastProvider>
  </LinkContext.Provider>
);

export default ClassroomPages;
