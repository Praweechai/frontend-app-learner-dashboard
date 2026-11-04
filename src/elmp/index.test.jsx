import { getConfig, mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { PluginSlot } from '@openedx/frontend-plugin-framework';
import { render, screen } from '@testing-library/react';

import applyElmpPluginSlots from '.';

const FOOTER = 'org.openedx.frontend.layout.footer.v1';

describe('ELMP slot wiring', () => {
  it('keeps slots that env.config.jsx already set and adds ours', () => {
    mergeConfig({ pluginSlots: { 'other.slot': { keepDefault: true, plugins: [] } } });

    applyElmpPluginSlots();

    const slots = getConfig().pluginSlots;
    expect(slots['other.slot']).toBeDefined();
    expect(slots[FOOTER].keepDefault).toBe(false);
  });

  it('renders our widget instead of the default footer', async () => {
    applyElmpPluginSlots();

    render(
      <IntlProvider locale="en">
        <PluginSlot id={FOOTER} idAliases={['footer_slot']}>
          <div>default footer</div>
        </PluginSlot>
      </IntlProvider>,
    );

    expect(await screen.findByTestId('elmp-footer-test')).toHaveTextContent('ELMP footer test');
    expect(screen.queryByText('default footer')).toBeNull();
  });
});
