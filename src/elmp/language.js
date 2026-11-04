// ELMP Classroom language switch (Plan 3 doc 03 J-8, F-98 BR-1):
// LMS preference + language cookie on the shared domain + Portal locale, then reload.
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getPortalClient } from '@elmp/classroom-kit';

export const cookieDomain = (lmsBaseUrl) => {
  try { return `.${new URL(lmsBaseUrl).hostname}`; } catch (e) { return undefined; }
};

export default async function setClassroomLanguage(code, username, { reload = () => window.location.reload() } = {}) {
  const { LMS_BASE_URL, LANGUAGE_PREFERENCE_COOKIE_NAME } = getConfig();
  const name = LANGUAGE_PREFERENCE_COOKIE_NAME || 'openedx-language-preference';
  const domain = cookieDomain(LMS_BASE_URL);
  document.cookie = `${name}=${code}; path=/; max-age=31536000; samesite=lax${domain ? `; domain=${domain}` : ''}`;

  await Promise.allSettled([
    username && getAuthenticatedHttpClient().patch(
      `${LMS_BASE_URL}/api/user/v1/preferences/${encodeURIComponent(username)}`,
      { 'pref-lang': code },
      { headers: { 'Content-Type': 'application/merge-patch+json' } },
    ),
    getPortalClient().setLocale(code),
  ]);
  reload();
}
