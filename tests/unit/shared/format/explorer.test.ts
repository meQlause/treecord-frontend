import { beforeEach, describe, expect, it, vi } from 'vitest';

const chain = vi.hoisted(() => ({ id: 84532 }));

vi.mock('../../../../src/app/session/config', () => ({
  config: () => ({ chainId: chain.id }),
}));

describe('explorer links', () => {
  beforeEach(() => {
    chain.id = 84532;
  });

  it('builds transaction and block URLs for Base Sepolia', async () => {
    const { blockUrl, txUrl } = await import('../../../../src/shared/format/explorer');

    expect(txUrl('0xabc')).toBe('https://sepolia.basescan.org/tx/0xabc');
    expect(blockUrl('24118402')).toBe('https://sepolia.basescan.org/block/24118402');
  });

  it('has no link on a chain without a public explorer', async () => {
    const { blockUrl, txUrl } = await import('../../../../src/shared/format/explorer');

    chain.id = 31337;
    expect(txUrl('0xabc')).toBeNull();
    expect(blockUrl('1')).toBeNull();
  });
});
