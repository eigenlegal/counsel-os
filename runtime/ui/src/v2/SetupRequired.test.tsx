import { cleanup, render, screen, userEvent } from '../test/dom';

import { afterEach, describe, expect, test } from 'bun:test';
import { INIT_COMMAND, SetupRequired } from './SetupRequired';

afterEach(cleanup);

describe('SetupRequired', () => {
  test('says what is missing, shows the init command, and Check again calls back', async () => {
    let checks = 0;
    render(<SetupRequired onCheck={() => (checks += 1)} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Set up counsel-os.');
    expect(screen.getByRole('status').textContent).toContain('no vault yet');
    expect(screen.getByText(INIT_COMMAND)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(checks).toBe(1);
  });

  test('while checking, the button waits and the status says so', () => {
    render(<SetupRequired onCheck={() => {}} checking />);
    expect((screen.getByRole('button', { name: 'Check again' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('Checking…');
  });

  test('no rail, no pill, no left-accent panel', () => {
    render(<SetupRequired onCheck={() => {}} />);
    expect(document.querySelector('.v2-rail')).toBeNull();
    expect(document.querySelector('[class*="pill"]')).toBeNull();
    expect(document.querySelector('.rule-double')).toBeTruthy();
  });
});
