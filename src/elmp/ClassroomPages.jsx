// ELMP Classroom pages (S-70 home, S-72 certificates, S-73 CE hours). Mounted by App in place of the
// upstream Dashboard; index.jsx routes "/*" here so the nested routes below work.
import { useState } from 'react';
import {
  Navigate, Route, Routes, useLocation,
} from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform';
import {
  CertificatesView, HomeView, HoursView, LinkContext, ToastProvider, getClassroomIntl, getPortalClient,
  messages, usePortal, useToast,
} from '@elmp/classroom-kit';
import { useIntl } from '@edx/frontend-platform/i18n';

import { useClassroomUser } from './ClassroomHeader';
import RouterLink from './RouterLink';
import useClassroomCourses from './useClassroomCourses';

// LEARNING_BASE_URL already ends with /learning (Tutor MFE config).
const learningHome = (courseKey) => `${getConfig().LEARNING_BASE_URL || '/learning'}/course/${courseKey}/home`;

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

export const HomePage = () => {
  const { firstName, features } = useClassroomUser();
  const { courses, loading } = useClassroomCourses();
  const { hash } = useLocation();
  const training = usePortal((opts) => getPortalClient().training(opts));
  const certificates = usePortal((opts) => getPortalClient().certificates(opts));
  const download = useCertificateDownload();
  const highlight = /^#required-(\d+)$/.exec(hash || '')?.[1];
  const latest = (certificates.data?.data || []).find((c) => !c.revoked_at);

  return (
    <HomeView
      firstName={firstName || ''}
      courses={courses}
      coursesLoading={loading}
      training={training.data?.data}
      trainingStatus={training.status}
      trainingError={training.error}
      latestCertificate={latest}
      onDownloadCertificate={download}
      links={{ courseHome: (c) => learningHome(c.course_key), hours: features.ce_hours ? '/learner-dashboard/hours' : undefined }}
      highlightId={highlight}
      onRetry={training.reload}
    />
  );
};

export const CertificatesPage = () => {
  const certificates = usePortal((opts) => getPortalClient().certificates(opts));
  const download = useCertificateDownload();
  return (
    <CertificatesView
      items={certificates.data?.data || []}
      status={certificates.status}
      error={certificates.error}
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
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="hours" element={<HoursPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  </LinkContext.Provider>
);

export default ClassroomPages;
