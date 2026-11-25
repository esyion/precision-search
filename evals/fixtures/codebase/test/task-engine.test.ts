import { describe, it, expect } from 'vitest';
import { startProcess } from '../src/task-engine';

describe('task engine', () => {
  it('starts a process from a template', async () => {
    const run = await startProcess('onboarding', { actor: 'tester' });
    expect(run.status).toBe('pending');
  });

  it('rejects unknown templates', async () => {
    await expect(startProcess('nope', { actor: 'tester' })).rejects.toThrow();
  });
});
