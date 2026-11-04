// ELMP Classroom: slot wiring (Plan 3 · R-15 §3, decided in P3-1.03).
// tutor-mfe replaces the repo's env.config.jsx at build time and frontend-platform's
// mergeConfig is shallow, so slots are merged here after every config source has loaded.
import {
  APP_CONFIG_INITIALIZED, getConfig, mergeConfig, subscribe,
} from '@edx/frontend-platform';

import elmpPluginSlots from './plugin-slots';

export default function applyElmpPluginSlots(slots = elmpPluginSlots) {
  const current = getConfig().pluginSlots || {};
  mergeConfig({ pluginSlots: { ...current, ...slots } });
}

subscribe(APP_CONFIG_INITIALIZED, () => applyElmpPluginSlots());
