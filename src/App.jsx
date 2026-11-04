import React from 'react';
import { Helmet } from 'react-helmet';

import { useIntl } from '@edx/frontend-platform/i18n';

import { ErrorPage } from '@edx/frontend-platform/react';
import { FooterSlot } from '@edx/frontend-component-footer';
import { Alert } from '@openedx/paragon';

import Dashboard from 'elmp/ClassroomPages'; // ELMP: Classroom pages S-70/S-72/S-73 (see ELMP-CHANGES.md)

import AppWrapper from 'containers/AppWrapper';
import LearnerDashboardHeader from 'elmp/ClassroomHeader'; // ELMP: Classroom header (see ELMP-CHANGES.md)

import { getConfig } from '@edx/frontend-platform';
import { useInitializeLearnerHome } from 'data/hooks';
import { useMasquerade } from 'data/context';
import messages from './messages';
import './App.scss';

export const App = () => {
  const { formatMessage } = useIntl();
  const { masqueradeUser } = useMasquerade();
  const { data, isError } = useInitializeLearnerHome();
  const hasNetworkFailure = !masqueradeUser && isError;
  const supportEmail = data?.platformSettings?.supportEmail || undefined;

  return (
    <>
      <Helmet>
        <title>{formatMessage(messages.pageTitle)}</title>
        <link rel="shortcut icon" href={getConfig().FAVICON_URL} type="image/x-icon" />
      </Helmet>
      <div>
        <AppWrapper>
          <LearnerDashboardHeader />
          <main id="main">
            {hasNetworkFailure
              ? (
                <Alert variant="danger">
                  <ErrorPage message={formatMessage(messages.errorMessage, { supportEmail })} />
                </Alert>
              ) : (
                <Dashboard />
              )}
          </main>
        </AppWrapper>
        <FooterSlot />
      </div>
    </>
  );
};

export default App;
