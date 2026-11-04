import { DIRECT_PLUGIN, PLUGIN_OPERATIONS } from '@openedx/frontend-plugin-framework';

// P3-1.03 spike: prove a fork-owned slot config reaches the built image.
// Replaced by the real Classroom slots in P3-4.
const ElmpFooterTest = () => (
  <div data-testid="elmp-footer-test" style={{ padding: '16px', textAlign: 'center' }}>
    ELMP footer test
  </div>
);

const elmpPluginSlots = {
  'org.openedx.frontend.layout.footer.v1': {
    keepDefault: false,
    plugins: [
      {
        op: PLUGIN_OPERATIONS.Insert,
        widget: {
          id: 'elmp_footer_test',
          priority: 50,
          type: DIRECT_PLUGIN,
          RenderWidget: ElmpFooterTest,
        },
      },
    ],
  },
};

export default elmpPluginSlots;
