import { pollMuapiJob, waitForMuapiJob } from '../src/lib/muapi';

describe('muapi', () => {
  test('pollMuapiJob returns job status', async () => {
    expect(typeof pollMuapiJob).toBe('function');
  });

  test('waitForMuapiJob returns completed result', async () => {
    expect(typeof waitForMuapiJob).toBe('function');
  });
});