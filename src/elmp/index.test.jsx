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

  it('removes the Open edX footer', async () => {
    applyElmpPluginSlots();

    const { container } = render(
      <IntlProvider locale="en">
        <PluginSlot id={FOOTER} idAliases={['footer_slot']}>
          <div>default footer</div>
        </PluginSlot>
      </IntlProvider>,
    );

    await new Promise((r) => { setTimeout(r, 0); });
    expect(screen.queryByText('default footer')).toBeNull();
    expect(container.textContent).toBe('');
  });
});
