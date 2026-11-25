import { Task } from './types';
import { EventBus } from './events';

const bus = new EventBus();

interface ProcessOptions {
  actor: string;
  priority?: number;
}

/**
 * Start a task process by template name.
 * Validates the template, creates the first task node,
 * and schedules downstream work via the event bus.
 */
export async function startProcess(
  template: string,
  options: ProcessOptions
): Promise<Task> {
  const tpl = await loadTemplate(template);
  if (!tpl) throw new Error(`unknown template: ${template}`);
  const task = await createTaskNode(tpl, options);
  await bus.emit('task.started', task);
  if (task.children.length > 0) {
    for (const child of task.children) {
      await startProcess(child.template, options);
    }
  }
  return task;
}

async function loadTemplate(name: string) {
  return bus.templates.get(name) ?? null;
}

async function createTaskNode(tpl: any, options: ProcessOptions): Promise<Task> {
  return {
    id: crypto.randomUUID(),
    template: tpl.name,
    status: 'pending' as TaskStatus,
    children: tpl.children ?? [],
    createdBy: options.actor,
  };
}
