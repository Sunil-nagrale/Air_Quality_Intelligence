import { AuditEvent, UserRole } from '../types';

export class AuditRepository {
  private inMemoryEvents: AuditEvent[] = [];

  /**
   * Records an audit event for administrative tracing and regulatory accountability.
   */
  async recordEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): Promise<AuditEvent> {
    const fullEvent: AuditEvent = {
      ...event,
      eventId: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    this.inMemoryEvents.push(fullEvent);
    return fullEvent;
  }

  /**
   * Retrieves audit trail for a specific entity (e.g. school activity, listing, offer).
   */
  async getEventsForEntity(entityId: string): Promise<AuditEvent[]> {
    return this.inMemoryEvents.filter((e) => e.entityId === entityId);
  }

  /**
   * Retrieves audit trail by actor.
   */
  async getEventsByActor(actorId: string): Promise<AuditEvent[]> {
    return this.inMemoryEvents.filter((e) => e.actorId === actorId);
  }

  getAllEvents(): AuditEvent[] {
    return [...this.inMemoryEvents];
  }

  clear(): void {
    this.inMemoryEvents = [];
  }
}

export const inMemoryAuditRepository = new AuditRepository();

let _activeAuditRepo: any = null;
export function getAuditRepository(): any {
  if (!_activeAuditRepo) {
    const { isDynamoDbConfigured } = require('./config');
    if (isDynamoDbConfigured()) {
      const { DynamoDbAuditRepository } = require('./dynamoDbAuditRepository');
      _activeAuditRepo = new DynamoDbAuditRepository();
    } else {
      _activeAuditRepo = inMemoryAuditRepository;
    }
  }
  return _activeAuditRepo;
}

export const auditRepository: any = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getAuditRepository();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

