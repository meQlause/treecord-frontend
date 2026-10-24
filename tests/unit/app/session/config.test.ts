import { describe, expect, it } from 'vitest';
import { readConfig } from '../../../../src/app/session/config';

describe('readConfig', () => {
  it('reads the four settings', () => {
    expect(
      readConfig({
        VITE_API_URL: 'http://localhost:4000/api/v1',
        VITE_PRIVY_APP_ID: 'app-id',
        VITE_CHAIN_ID: '84532',
        VITE_NETWORK_LABEL: 'Base Sepolia',
      }),
    ).toEqual({
      apiUrl: 'http://localhost:4000/api/v1',
      privyAppId: 'app-id',
      chainId: 84532,
      networkLabel: 'Base Sepolia',
    });
  });

  it('defaults everything but the app id', () => {
    expect(readConfig({ VITE_PRIVY_APP_ID: 'app-id' })).toEqual({
      apiUrl: '/api/v1',
      privyAppId: 'app-id',
      chainId: 84532,
      networkLabel: 'Base Sepolia',
    });
  });

  it('names the missing app id', () => {
    expect(() => readConfig({})).toThrow(/VITE_PRIVY_APP_ID is not set/);
    expect(() => readConfig({ VITE_PRIVY_APP_ID: '  ' })).toThrow(/VITE_PRIVY_APP_ID/);
  });

  it.each(['abc', '0', '-1', '84532.5'])('rejects the chain id %j', (value) => {
    expect(() => readConfig({ VITE_PRIVY_APP_ID: 'app-id', VITE_CHAIN_ID: value })).toThrow(
      /VITE_CHAIN_ID/,
    );
  });
});
