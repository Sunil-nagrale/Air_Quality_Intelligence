import { cognitoAuth } from './cognitoAuth';
import { config } from '../config';
import type {
  SchoolProfile,
  SchoolCampus,
  SchoolPolicy,
  SchoolActivity,
  ParaliListingItem,
  BuyerProfileItem,
  OfferItem,
  CollectionItem,
  MatchResultItem,
  EnvironmentalImpactSummary,
  NotificationRecord,
  NotificationDeliveryStats,
  NotificationType,
  NotificationChannel,
  ScheduledJobType,
  ScheduledJobResult,
  SystemDiagnosticsResult,
} from '../types';

export interface ApiClientOptions extends RequestInit {
  requiresAuth?: boolean;
}

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
  }

  private resolveUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // Clean baseUrl: remove trailing slash
    const base = (this.baseUrl || '').replace(/\/+$/, '');

    // Clean endpoint: ensure leading slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If base is empty or relative root fallback
    if (!base || base === '/api') {
      return cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `/api${cleanEndpoint}`;
    }

    // Check if base ends with /api
    const baseHasApi = /\/api\/?$/.test(base);
    // Check if endpoint starts with /api/
    const endpointHasApi = /^\/api(\/|$)/.test(cleanEndpoint);

    if (baseHasApi && endpointHasApi) {
      // Avoid duplicate /api
      return `${base}${cleanEndpoint.replace(/^\/api/, '')}`;
    } else if (!baseHasApi && !endpointHasApi) {
      // Neither has /api, so ensure /api is added exactly once
      return `${base}/api${cleanEndpoint}`;
    } else {
      // Exactly one of base or endpoint has /api
      return `${base}${cleanEndpoint}`;
    }
  }

  async request<T = any>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const url = this.resolveUrl(endpoint);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Attach active session token if available or required
    const session = cognitoAuth.getCurrentSession();
    if (session?.idToken) {
      headers['Authorization'] = `Bearer ${session.idToken}`;
    } else if (options.requiresAuth) {
      throw {
        code: 'UNAUTHENTICATED',
        message: 'This operation requires an authenticated session. Please sign in.',
      };
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || data.error || `HTTP error ${response.status}`;
      throw {
        status: response.status,
        code: data.code || `HTTP_${response.status}`,
        message: errorMsg,
      };
    }

    return data as T;
  }

  // Common convenience methods
  get<T = any>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Air Quality & Decision Engine API methods
  async getAirCurrent(lat = 28.6139, lon = 77.2090): Promise<any> {
    return this.get(`/air/current?lat=${lat}&lon=${lon}`);
  }

  async getAirForecast(lat = 28.6139, lon = 77.2090, hours = 72): Promise<any> {
    return this.get(`/air/forecast?lat=${lat}&lon=${lon}&hours=${hours}`);
  }

  async getAirHistory(stationId = 'DEL_01', hours = 24, start?: string, end?: string): Promise<any> {
    let q = `/air/history?stationId=${encodeURIComponent(stationId)}&hours=${hours}`;
    if (start && end) {
      q += `&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    }
    return this.get(q);
  }

  async evaluateActivityWindows(req: any): Promise<any> {
    return this.post('/air/evaluate-windows', req);
  }

  async saveActivityPlan(plan: any): Promise<any> {
    return this.post('/personal/activity-plan', plan, { requiresAuth: true });
  }

  async getActivityPlans(): Promise<any> {
    return this.get('/personal/activity-plans', { requiresAuth: true });
  }

  async deleteActivityPlan(planId: string): Promise<any> {
    return this.request(`/personal/activity-plan?planId=${encodeURIComponent(planId)}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  }

  async getAlertPreferences(): Promise<any> {
    return this.get('/personal/alerts/preferences', { requiresAuth: true });
  }

  async saveAlertPreferences(prefs: any): Promise<any> {
    return this.post('/personal/alerts/preferences', prefs, { requiresAuth: true });
  }

  async getHealthPreferences(): Promise<any> {
    return this.get('/personal/health-preferences', { requiresAuth: true });
  }

  async saveHealthPreferences(health: any): Promise<any> {
    return this.post('/personal/health-preferences', health, { requiresAuth: true });
  }

  async getCaregiverConsent(): Promise<any> {
    return this.get('/personal/caregiver-consent', { requiresAuth: true });
  }

  async saveCaregiverConsent(consent: any): Promise<any> {
    return this.post('/personal/caregiver-consent', consent, { requiresAuth: true });
  }

  // School Air Safety Planner API methods
  async getSchoolProfile(): Promise<{ profile: SchoolProfile; campuses: SchoolCampus[] }> {
    return this.get('/schools/profile', { requiresAuth: true });
  }

  async updateSchoolProfile(profile: Partial<SchoolProfile>): Promise<{ profile: SchoolProfile }> {
    return this.put('/schools/profile', profile, { requiresAuth: true });
  }

  async getSchoolCampuses(): Promise<{ campuses: SchoolCampus[] }> {
    return this.get('/schools/campuses', { requiresAuth: true });
  }

  async createSchoolCampus(campus: Partial<SchoolCampus>): Promise<{ campus: SchoolCampus }> {
    return this.post('/schools/campuses', campus, { requiresAuth: true });
  }

  async getSchoolPolicies(): Promise<{ policies: SchoolPolicy[] }> {
    return this.get('/schools/policy', { requiresAuth: true });
  }

  async saveSchoolPolicy(policy: Partial<SchoolPolicy>): Promise<{ policy: SchoolPolicy }> {
    return this.put('/schools/policy', policy, { requiresAuth: true });
  }

  async getSchoolActivities(scheduledDate?: string): Promise<{ activities: SchoolActivity[] }> {
    const q = scheduledDate ? `?scheduledDate=${encodeURIComponent(scheduledDate)}` : '';
    return this.get(`/schools/activities${q}`, { requiresAuth: true });
  }

  async createSchoolActivity(activity: Partial<SchoolActivity>): Promise<{ activity: SchoolActivity }> {
    return this.post('/schools/activities', activity, { requiresAuth: true });
  }

  async deleteSchoolActivity(activityId: string): Promise<{ success: boolean; message: string }> {
    return this.delete(`/schools/activities?activityId=${encodeURIComponent(activityId)}`, {
      requiresAuth: true,
    });
  }

  async evaluateSchoolActivity(payload: any): Promise<{ evaluation: any; activity: SchoolActivity }> {
    return this.post('/schools/activities/evaluate', payload, { requiresAuth: true });
  }

  async decideSchoolActivity(activityId: string, decision: string, notes?: string): Promise<{ activity: SchoolActivity }> {
    return this.post(
      '/schools/activities/decide',
      { activityId, decision, notes },
      { requiresAuth: true }
    );
  }

  async getSchoolCalendar(): Promise<{ calendarEvents: SchoolActivity[] }> {
    return this.get('/schools/calendar', { requiresAuth: true });
  }

  async getSchoolReports(): Promise<{
    summary: {
      totalEvaluatedActivities: number;
      mandatoryIndoorEnforced: number;
      precautionaryOutdoorPermitted: number;
      dataInsufficientManualReview: number;
      adminSignedOffDecisions: number;
    };
    activities: SchoolActivity[];
    auditEvents: any[];
  }> {
    return this.get('/schools/reports', { requiresAuth: true });
  }

  async askSchoolAssistant(payload: {
    question?: string;
    campusName?: string;
    campusAQI?: number;
    ageGroup?: string;
    activityName?: string;
    dominantPollutant?: string;
  }): Promise<{
    assistantResponse: string;
    isAiGenerated: boolean;
    provenance: string;
    cloudBedrockConfigured: boolean;
    disclaimer: string;
  }> {
    return this.post('/schools/assistant', payload, { requiresAuth: true });
  }

  // --- Parali-to-Value Marketplace API Methods ---
  async getListings(filters?: {
    district?: string;
    cropType?: string;
    status?: string;
    farmerId?: string;
    limit?: number;
  }): Promise<{ listings: ParaliListingItem[] }> {
    const params = new URLSearchParams();
    if (filters?.district) params.append('district', filters.district);
    if (filters?.cropType) params.append('cropType', filters.cropType);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.farmerId) params.append('farmerId', filters.farmerId);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.get(`/marketplace/listings${q}`);
  }

  async getListing(listingId: string): Promise<{ listing: ParaliListingItem }> {
    return this.get(`/marketplace/listings/${encodeURIComponent(listingId)}`);
  }

  async createListing(listing: Partial<ParaliListingItem>): Promise<{ listing: ParaliListingItem }> {
    return this.post('/marketplace/listings', listing, { requiresAuth: true });
  }

  async updateListing(
    listingId: string,
    updates: Partial<ParaliListingItem>
  ): Promise<{ listing: ParaliListingItem }> {
    return this.put(`/marketplace/listings/${encodeURIComponent(listingId)}`, updates, {
      requiresAuth: true,
    });
  }

  async deleteListing(listingId: string): Promise<{ success: boolean; message: string }> {
    return this.delete(`/marketplace/listings/${encodeURIComponent(listingId)}`, {
      requiresAuth: true,
    });
  }

  async getBuyers(): Promise<{ buyers: BuyerProfileItem[] }> {
    return this.get('/marketplace/buyers');
  }

  async getBuyerProfile(): Promise<{ profile: BuyerProfileItem }> {
    return this.get('/marketplace/buyer/profile', { requiresAuth: true });
  }

  async updateBuyerProfile(profile: Partial<BuyerProfileItem>): Promise<{ profile: BuyerProfileItem }> {
    return this.put('/marketplace/buyer/profile', profile, { requiresAuth: true });
  }

  async getMatches(params?: { listingId?: string; buyerId?: string }): Promise<{ matches: MatchResultItem[] }> {
    const qParams = new URLSearchParams();
    if (params?.listingId) qParams.append('listingId', params.listingId);
    if (params?.buyerId) qParams.append('buyerId', params.buyerId);
    const q = qParams.toString() ? `?${qParams.toString()}` : '';
    return this.get(`/marketplace/matches${q}`, { requiresAuth: true });
  }

  async getOffers(params?: { listingId?: string }): Promise<{ offers: OfferItem[] }> {
    const qParams = new URLSearchParams();
    if (params?.listingId) qParams.append('listingId', params.listingId);
    const q = qParams.toString() ? `?${qParams.toString()}` : '';
    return this.get(`/marketplace/offers${q}`, { requiresAuth: true });
  }

  async createOffer(offer: {
    listingId: string;
    offeredPricePerTonInr: number;
    quantityTons?: number;
    buyerNotes?: string;
  }): Promise<{ offer: OfferItem }> {
    return this.post('/marketplace/offers', offer, { requiresAuth: true });
  }

  async respondToOffer(
    offerId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER',
    details?: { counterPrice?: number; notes?: string }
  ): Promise<{ offer: OfferItem }> {
    return this.post(`/marketplace/offers/${encodeURIComponent(offerId)}/respond`, {
      action,
      ...details,
    }, { requiresAuth: true });
  }

  async getCollections(): Promise<{ collections: CollectionItem[] }> {
    return this.get('/marketplace/collections', { requiresAuth: true });
  }

  async createCollection(collection: Partial<CollectionItem>): Promise<{ collection: CollectionItem }> {
    return this.post('/marketplace/collections', collection, { requiresAuth: true });
  }

  async updateCollectionMilestone(
    collectionId: string,
    stage: string,
    details?: {
      fieldWeighbridgeGrossTons?: number;
      physicalCollectionQuantityTons?: number;
      physicalCollectionTimestamp?: string;
      physicalCollectionSource?: string;
      physicalCollectionEvidenceUrl?: string;
      factoryWeighbridgeGrossTons?: number;
      deliveredGrossTons?: number;
      deliveryTimestamp?: string;
      transitLossTons?: number;
      verifiedNetTons?: number;
      certifiedMoisturePercent?: number;
      deliveryWeighbridgeSlipUrl?: string;
      transporterName?: string;
      vehicleRegistrationNumber?: string;
      rejectedQuantityTons?: number;
      cancellationReason?: string;
      exceptionType?: string;
      rejectionDisposition?: string;
    }
  ): Promise<{ collection: CollectionItem }> {
    return this.put(`/marketplace/collections/${encodeURIComponent(collectionId)}`, {
      stage,
      ...details,
    }, { requiresAuth: true });
  }

  async getMarketplaceImpact(): Promise<{ impact: EnvironmentalImpactSummary }> {
    return this.get('/marketplace/impact');
  }

  // --- Prompt 9: Grounded AI, Notifications, Scheduling & Diagnostics ---

  async explainWithAI(context: any, isInvocationApproved: boolean = false): Promise<{
    explanation: string;
    isAiGenerated: boolean;
    modelUsed: string;
    groundingStatus: string;
    cloudBedrockConfigured: boolean;
    disclaimer: string;
  }> {
    return this.post('/ai/explain', { context, isInvocationApproved });
  }

  async getNotificationHistory(params?: {
    userId?: string;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<{
    notifications: NotificationRecord[];
    stats: NotificationDeliveryStats;
    cloudSESConfigured: boolean;
  }> {
    const qParams = new URLSearchParams();
    if (params?.userId) qParams.append('userId', params.userId);
    if (params?.limit) qParams.append('limit', String(params.limit));
    if (params?.unreadOnly) qParams.append('unreadOnly', 'true');
    const q = qParams.toString() ? `?${qParams.toString()}` : '';
    return this.get(`/notifications/history${q}`, { requiresAuth: true });
  }

  async sendNotification(payload: {
    userId?: string;
    recipientEmail?: string;
    type: NotificationType;
    channel?: NotificationChannel;
    subject?: string;
    message?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{
    record: NotificationRecord;
    isDuplicateSuppressed: boolean;
    deliveryStatusMessage: string;
  }> {
    return this.post('/notifications/send', payload, { requiresAuth: true });
  }

  async markNotificationRead(notificationId: string): Promise<{ success: boolean; notificationId: string }> {
    return this.post(`/notifications/${encodeURIComponent(notificationId)}/read`, {}, { requiresAuth: true });
  }

  async getSystemDiagnostics(): Promise<SystemDiagnosticsResult> {
    return this.get('/system/diagnostics');
  }

  async executeScheduledJob(jobType: ScheduledJobType): Promise<{ result: ScheduledJobResult }> {
    return this.post('/scheduled/execute', { jobType }, { requiresAuth: true });
  }
}

export const apiClient = new ApiClient();
