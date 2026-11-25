export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export interface Task {
  id: string;
  template: string;
  status: TaskStatus;
  children: { template: string }[];
  createdBy: string;
}
