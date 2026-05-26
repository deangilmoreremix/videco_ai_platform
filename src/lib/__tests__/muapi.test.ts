const { submitPrediction, pollResult } = require('src/lib/muapi');

describe('muapi helpers', () => {
  test('submitPrediction and pollResult exist', async () => {
    expect(typeof submitPrediction).toBe('function');
    expect(typeof pollResult).toBe('function');
  });
});
