import {
  SchoolProfile,
  SchoolPolicy,
  SchoolActivity,
  SchoolAgeGroup,
  SchoolCampus,
} from '../types';
import { auditRepository } from './auditRepository';
import { ISchoolRepository } from './dynamoDbSchoolRepository';

export class SchoolRepository implements ISchoolRepository {
  private profiles = new Map<string, SchoolProfile>();
  private policies = new Map<string, SchoolPolicy>(); // Key: `${schoolId}#${ageGroup}`
  private activities = new Map<string, SchoolActivity>();

  // --- School Profile ---
  async saveSchoolProfile(profile: SchoolProfile): Promise<SchoolProfile> {
    this.profiles.set(profile.schoolId, profile);
    return profile;
  }

  async getSchoolProfile(schoolId: string): Promise<SchoolProfile | null> {
    return this.profiles.get(schoolId) || null;
  }

  // --- Institutional School Policies ---
  async saveSchoolPolicy(policy: SchoolPolicy, modifiedBy: string): Promise<SchoolPolicy> {
    const key = `${policy.schoolId}#${policy.ageGroup}`;
    const previous = this.policies.get(key);
    this.policies.set(key, policy);

    await auditRepository.recordEvent({
      entityType: 'POLICY',
      entityId: key,
      actorId: modifiedBy,
      actorRole: 'SCHOOL_ADMIN',
      action: previous ? 'SCHOOL_POLICY_UPDATED' : 'SCHOOL_POLICY_INITIALIZED',
      previousState: previous,
      newState: policy,
      metadata: { ageGroup: policy.ageGroup },
    });

    return policy;
  }

  async getSchoolPolicies(schoolId: string): Promise<SchoolPolicy[]> {
    const results: SchoolPolicy[] = [];
    for (const [key, policy] of this.policies.entries()) {
      if (key.startsWith(`${schoolId}#`)) {
        results.push(policy);
      }
    }
    return results;
  }

  async getSchoolPolicy(schoolId: string, ageGroup: SchoolAgeGroup): Promise<SchoolPolicy | null> {
    return this.policies.get(`${schoolId}#${ageGroup}`) || null;
  }

  // --- School Activities & Evaluations ---
  async saveSchoolActivity(activity: SchoolActivity, actorId: string): Promise<SchoolActivity> {
    const previous = this.activities.get(activity.activityId);
    this.activities.set(activity.activityId, activity);

    await auditRepository.recordEvent({
      entityType: 'SCHOOL_ACTIVITY',
      entityId: activity.activityId,
      actorId,
      actorRole: 'SCHOOL_ADMIN',
      action: previous ? 'SCHOOL_ACTIVITY_UPDATED' : 'SCHOOL_ACTIVITY_EVALUATED',
      previousState: previous,
      newState: {
        evaluationStatus: activity.evaluationStatus,
        predictedAQI: activity.predictedAQI,
        isSignedOff: activity.adminSignOff?.isSignedOff,
      },
    });

    return activity;
  }

  async getSchoolActivity(activityId: string): Promise<SchoolActivity | null> {
    return this.activities.get(activityId) || null;
  }

  async listActivitiesBySchool(
    schoolId: string,
    filterDate?: string,
    limit = 50
  ): Promise<SchoolActivity[]> {
    const results: SchoolActivity[] = [];
    for (const act of this.activities.values()) {
      if (act.schoolId === schoolId) {
        if (!filterDate || act.scheduledDate === filterDate) {
          results.push(act);
        }
      }
    }
    results.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
    return results.slice(0, limit);
  }

  private campuses = new Map<string, SchoolCampus>();

  // --- School Campuses ---
  async saveCampus(campus: SchoolCampus, actorId: string): Promise<SchoolCampus> {
    const previous = this.campuses.get(campus.campusId);
    this.campuses.set(campus.campusId, campus);

    await auditRepository.recordEvent({
      entityType: 'CAMPUS',
      entityId: campus.campusId,
      actorId,
      actorRole: 'SCHOOL_ADMIN',
      action: previous ? 'SCHOOL_CAMPUS_UPDATED' : 'SCHOOL_CAMPUS_CREATED',
      previousState: previous,
      newState: campus,
      metadata: { schoolId: campus.schoolId, campusName: campus.campusName },
    });

    return campus;
  }

  async getCampus(campusId: string): Promise<SchoolCampus | null> {
    return this.campuses.get(campusId) || null;
  }

  async listCampuses(schoolId: string): Promise<SchoolCampus[]> {
    const list: SchoolCampus[] = [];
    for (const c of this.campuses.values()) {
      if (c.schoolId === schoolId) {
        list.push(c);
      }
    }
    return list;
  }

  // --- Administrative Decisions ---
  async recordAdminDecision(
    activityId: string,
    schoolId: string,
    decision: NonNullable<SchoolActivity['administratorDecision']>,
    actorId: string
  ): Promise<SchoolActivity | null> {
    const act = this.activities.get(activityId);
    if (!act || act.schoolId !== schoolId) return null;

    const previous = { ...act };
    act.administratorDecision = decision;
    act.adminSignOff = {
      isSignedOff: true,
      signedOffBy: decision.decidedBy,
      decisionNotes: decision.notes,
      signedOffAt: decision.decidedAt,
    };
    act.updatedAt = new Date().toISOString();
    this.activities.set(activityId, act);

    await auditRepository.recordEvent({
      entityType: 'SCHOOL_ACTIVITY',
      entityId: activityId,
      actorId,
      actorRole: 'SCHOOL_ADMIN',
      action: 'ADMIN_DECISION_RECORDED',
      previousState: previous,
      newState: act,
      metadata: { decision: decision.decision, schoolId },
    });

    return act;
  }

  async deleteActivity(activityId: string, schoolId: string, actorId: string): Promise<boolean> {
    const act = this.activities.get(activityId);
    if (!act || act.schoolId !== schoolId) return false;

    this.activities.delete(activityId);
    await auditRepository.recordEvent({
      entityType: 'SCHOOL_ACTIVITY',
      entityId: activityId,
      actorId,
      actorRole: 'SCHOOL_ADMIN',
      action: 'SCHOOL_ACTIVITY_DELETED',
      previousState: act,
      newState: null,
      metadata: { schoolId },
    });
    return true;
  }

  async listActivitiesForSchool(
    schoolId: string,
    options?: { campusId?: string; date?: string; ageGroup?: SchoolAgeGroup; limit?: number }
  ): Promise<SchoolActivity[]> {
    let acts = await this.listActivitiesBySchool(schoolId, options?.date, options?.limit);
    if (options?.campusId) acts = acts.filter(a => a.campusId === options.campusId);
    if (options?.ageGroup) acts = acts.filter(a => a.ageGroup === options.ageGroup);
    return acts;
  }

  async getCampuses(schoolId: string): Promise<SchoolCampus[]> {
    return this.listCampuses(schoolId);
  }

  async recordDecision(
    activityId: string,
    schoolId: string,
    decision: any,
    actorId: string
  ): Promise<SchoolActivity> {
    const res = await this.recordAdminDecision(activityId, schoolId, decision, actorId);
    if (!res) throw new Error(`School activity ${activityId} not found`);
    return res;
  }

  getAllProfiles(): SchoolProfile[] {
    return Array.from(this.profiles.values());
  }

  getAllActivities(): SchoolActivity[] {
    return Array.from(this.activities.values());
  }

  clear(): void {
    this.profiles.clear();
    this.policies.clear();
    this.activities.clear();
    this.campuses.clear();
  }
}

export const inMemorySchoolRepository = new SchoolRepository();

let _activeSchoolRepo: ISchoolRepository | null = null;
export function getSchoolRepository(): ISchoolRepository {
  if (!_activeSchoolRepo) {
    const { isDynamoDbConfigured } = require('./config');
    if (isDynamoDbConfigured()) {
      const { DynamoDbSchoolRepository } = require('./dynamoDbSchoolRepository');
      _activeSchoolRepo = new DynamoDbSchoolRepository();
    } else {
      _activeSchoolRepo = inMemorySchoolRepository;
    }
  }
  return _activeSchoolRepo!;
}

export const schoolRepository: ISchoolRepository = new Proxy({} as ISchoolRepository, {
  get(_target, prop) {
    const instance = getSchoolRepository() as any;
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

