// ELMP Classroom pages — Plan 4: S-90 Home 2.0, S-91 My courses, S-72 certificates, S-73 CE hours.
// Mounted by App in place of the upstream Dashboard; index.jsx routes "/*" here so the nested routes work.
// Home + My courses read the Portal dashboard (CA-11); the Plan 3 home (HomeView) is gone.
import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  CertificatesView, DashboardView, HoursView, LinkContext, MyCoursesView, ToastProvider, getClassroomIntl,
  getPortalClient, messages, usePortal, useToast,
} from '@elmp/classroom-kit';
import { useIntl } from '@edx/frontend-platform/i18n';

import { classroomLinks, useClassroomUser } from './ClassroomHeader';
import ClassroomFrame from './ClassroomFrame';
import RouterLink from './RouterLink';
import useDashboard from './useDashboard';

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
  const {
    dashboard, status, reload,
  } = useDashboard();
  const download = useCertificateDownload();
  const links = classroomLinks();
  return (
    <DashboardView
      dashboard={dashboard}
      status={status}
      firstName={firstName || undefined}
      now={new Date()}
      features={features}
      onRetry={reload}
      onDownloadCertificate={download}
      coursesHref={links.courses}
      certificatesHref={links.certificates}
    />
  );
};

export const MyCoursesPage = () => {
  const { dashboard, status, reload } = useDashboard();
  return <MyCoursesView courses={dashboard?.courses || []} status={status} onRetry={reload} />;
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
      <ClassroomFrame>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="courses" element={<MyCoursesPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="hours" element={<HoursPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ClassroomFrame>
    </ToastProvider>
  </LinkContext.Provider>
);

export default ClassroomPages;
