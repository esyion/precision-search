import { Router } from './router';
import { startProcess } from './task-engine';
import { requireAuth } from './auth';

const router = new Router();

router.post('/processes/:template/start', requireAuth, async (ctx) => {
  const run = await startProcess(ctx.params.template, { actor: ctx.user.id });
  return ctx.json(201, run);
});

export default router;
