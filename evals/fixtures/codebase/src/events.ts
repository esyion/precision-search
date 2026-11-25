export class EventBus {
  templates = new Map<string, { name: string; children?: { template: string }[] }>();

  constructor() {
    this.templates.set('onboarding', {
      name: 'onboarding',
      children: [{ template: 'welcome-email' }, { template: 'kyc-check' }],
    });
    this.templates.set('refund', { name: 'refund' });
  }

  async emit(topic: string, payload: unknown): Promise<void> {
    // fan-out to subscribers; no-op in this fixture
    void topic;
    void payload;
  }
}
