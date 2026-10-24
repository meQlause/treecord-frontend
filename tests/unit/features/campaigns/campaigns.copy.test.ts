import { describe, expect, it } from 'vitest';
import {
  campaignCount,
  loadedLine,
  networkName,
  stopLabel,
  trackLabel,
} from '../../../../src/features/campaigns/campaigns.copy';

describe('campaigns.copy', () => {
  it('counts campaigns, with the total only when more exist', () => {
    expect(campaignCount(2, 2)).toBe('2 campaigns');
    expect(campaignCount(2, 7)).toBe('2 campaigns of 7');
    expect(loadedLine(2, 7)).toBe('2 of 7 campaigns');
  });

  it('names the track stops and the network', () => {
    expect(stopLabel(0)).toBe('Plant');
    expect(stopLabel(12)).toBe('M12');
    expect(networkName(84532)).toBe('Base Sepolia');
    expect(networkName(1)).toBe('Chain 1');
  });

  it('writes the track label the mockup wrote', () => {
    const stops = [
      [0, 10],
      [3, 10],
      [6, 10],
      [12, 15],
      [24, 15],
      [36, 40],
    ] as const;

    expect(trackLabel(stops, 36)).toBe(
      'Six incentive payouts over 36 months: 10% at planting, 10% at month 3, 10% at month 6, 15% at month 12, 15% at month 24, 40% at month 36.',
    );
  });
});
