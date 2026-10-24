import { describe, expect, it } from 'vitest';
import { nameOf, roleHome, roleLabel } from '../../../../src/app/session/profile-rules';

describe('profile rules', () => {
  it.each([
    ['donor', 'Donor', '/app/donor'],
    ['planter', 'Planter', '/app/planter/trees'],
    ['auditor', 'Auditor', '/app/audit'],
    ['operator', 'Operator', '/campaigns'],
  ] as const)('%s: label %s, home %s', (role, label, home) => {
    expect(roleLabel(role)).toBe(label);
    expect(roleHome(role)).toBe(home);
  });

  it('shows the display name, else the email before "@" (pattern 24)', () => {
    expect(nameOf('Sari', 'sari@example.com')).toBe('Sari');
    expect(nameOf(null, 'sari@example.com')).toBe('sari');
    expect(nameOf(null, null)).toBe('');
  });
});
