import { EventEmitter } from 'node:events';

export interface CmsEvent {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

class CmsEventBus extends EventEmitter {
  emit(event: string, data: Record<string, unknown>): boolean {
    const cmsEvent: CmsEvent = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    return super.emit(event, cmsEvent);
  }
}

export const eventBus = new CmsEventBus();
eventBus.setMaxListeners(50);
