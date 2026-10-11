import {
  UserProfile,
  HealthPreferences,
  ActivityPlan,
  AlertPreference,
} from '../types';
import { auditRepository } from './auditRepository';

export class UserRepository {
  private profiles = new Map<string, UserProfile>();
  private healthPrefs = new Map<string, HealthPreferences>();
  private plans = new Map<string, ActivityPlan>();
  private alertPrefs = new Map<string, AlertPreference>();

  // --- User Profile ---
  async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const existing = this.profiles.get(profile.userId);
    this.profiles.set(profile.userId, profile);

    await auditRepository.recordEvent({
      entityType: 'USER',
      entityId: profile.userId,
      actorId: profile.userId,
      actorRole: profile.role,
      action: existing ? 'USER_PROFILE_UPDATED' : 'USER_PROFILE_CREATED',
      newState: { email: profile.email, role: profile.role },
    });

    return profile;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    for (const profile of this.profiles.values()) {
      if (profile.email.toLowerCase() === email.toLowerCase()) {
        return profile;
      }
    }
    return null;
  }

  // --- Health Preferences (Non-Clinical) ---
  async saveHealthPreferences(prefs: HealthPreferences): Promise<HealthPreferences> {
    this.healthPrefs.set(prefs.userId, prefs);
    return prefs;
  }

  async getHealthPreferences(userId: string): Promise<HealthPreferences | null> {
    return this.healthPrefs.get(userId) || null;
  }

  // --- Activity Plans ---
  async saveActivityPlan(plan: ActivityPlan): Promise<ActivityPlan> {
    this.plans.set(plan.planId, plan);

    await auditRepository.recordEvent({
      entityType: 'USER',
      entityId: plan.planId,
      actorId: plan.userId,
      actorRole: 'PERSONAL_USER',
      action: 'ACTIVITY_PLAN_SAVED',
      newState: {
        targetDate: plan.targetDate,
        activityType: plan.activityType,
        selectedWindow: plan.selectedWindow?.startTime,
      },
    });

    return plan;
  }

  async getActivityPlan(planId: string): Promise<ActivityPlan | null> {
    return this.plans.get(planId) || null;
  }

  async listActivityPlansByUser(userId: string, limit = 20): Promise<ActivityPlan[]> {
    const userPlans: ActivityPlan[] = [];
    for (const plan of this.plans.values()) {
      if (plan.userId === userId) {
        userPlans.push(plan);
      }
    }
    // Sort descending by targetDate
    userPlans.sort((a, b) => b.targetDate.localeCompare(a.targetDate));
    return userPlans.slice(0, limit);
  }

  // --- Alert Preferences ---
  async saveAlertPreferences(prefs: AlertPreference): Promise<AlertPreference> {
    this.alertPrefs.set(prefs.userId, prefs);
    return prefs;
  }

  async getAlertPreferences(userId: string): Promise<AlertPreference | null> {
    return this.alertPrefs.get(userId) || null;
  }

  // --- Caregiver Consent & Delegation ---
  private caregiverConsents = new Map<string, any>();

  async saveCaregiverConsent(consent: {
    userId: string;
    caregiverEmail: string;
    caregiverPhone?: string;
    consentGiven: boolean;
    shareLocation: boolean;
    shareSensitivities: boolean;
    updatedAt: string;
  }): Promise<any> {
    this.caregiverConsents.set(consent.userId, consent);
    await auditRepository.recordEvent({
      entityType: 'USER',
      entityId: consent.userId,
      actorId: consent.userId,
      actorRole: 'PERSONAL_USER',
      action: consent.consentGiven ? 'CAREGIVER_CONSENT_GRANTED' : 'CAREGIVER_CONSENT_REVOKED',
      newState: {
        caregiverEmail: consent.caregiverEmail,
        shareLocation: consent.shareLocation,
        shareSensitivities: consent.shareSensitivities,
      },
    });
    return consent;
  }

  async getCaregiverConsent(userId: string): Promise<any | null> {
    return this.caregiverConsents.get(userId) || null;
  }

  async deleteActivityPlan(userId: string, planId: string): Promise<boolean> {
    const plan = this.plans.get(planId);
    if (!plan || plan.userId !== userId) return false;
    this.plans.delete(planId);
    return true;
  }

  getAllAlertPreferences(): AlertPreference[] {
    return Array.from(this.alertPrefs.values());
  }

  getAllActivityPlans(): ActivityPlan[] {
    return Array.from(this.plans.values());
  }

  getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  clear(): void {
    this.profiles.clear();
    this.healthPrefs.clear();
    this.plans.clear();
    this.alertPrefs.clear();
    this.caregiverConsents.clear();
  }
}

export const inMemoryUserRepository = new UserRepository();

let _activeUserRepo: any = null;
export function getUserRepository(): any {
  if (!_activeUserRepo) {
    const { isDynamoDbConfigured } = require('./config');
    if (isDynamoDbConfigured()) {
      const { DynamoDbUserRepository } = require('./dynamoDbUserRepository');
      _activeUserRepo = new DynamoDbUserRepository();
    } else {
      _activeUserRepo = inMemoryUserRepository;
    }
  }
  return _activeUserRepo;
}

export const userRepository: any = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getUserRepository();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

