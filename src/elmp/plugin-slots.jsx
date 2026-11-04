// ELMP Classroom plugin slots (Plan 3 · C-8 slot first). Merged by ./index.js after all config loads.
const elmpPluginSlots = {
  // No Open edX footer in the Classroom (doc 04 §6.1).
  'org.openedx.frontend.layout.footer.v1': { keepDefault: false, plugins: [] },
};

export default elmpPluginSlots;
