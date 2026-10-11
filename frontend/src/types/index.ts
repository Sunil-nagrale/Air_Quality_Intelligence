export type DataProvenance =
  | 'MEASURED_OBSERVATION'
  | 'FORECAST'
  | 'MODELLED_ESTIMATE'
  | 'DEMO_DATA';

export type OfficialRole =
  | 'PERSONAL_USER'
  | 'SCHOOL_ADMIN'
  | 'FARMER'
  | 'BUYER'
  | 'PLATFORM_ADMIN';

export type UserRole =
  | 'personal'
  | 'school'
  | 'farmer'
  | 'buyer'
  | 'admin'
  | OfficialRole;

export type AppRoute =
  | '/'
  | '/how-it-works'
  | '/air-quality'
  | '/marketplace'
  | '/about-data'
  | '/sign-in'
  | '/sign-up'
  | '/privacy'
  | '/demo'
  | '/personal'
  | '/school';

export interface UserSession {
  userId?: string;
  email: string;
  role: UserRole;
  officialRole?: OfficialRole;
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  isDemo?: boolean;
}

export interface AirQualityObservation {
  aqi: number | null;
  category: string;
  dominantPollutant: string | null;
  stationName: string;
  stationDistanceKm: number;
  timestamp: string;
  provenance: DataProvenance;
  pollutants: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    so2?: number;
    co?: number;
    o3?: number;
    nh3?: number;
    pb?: number;
  };
}

export interface CandidateWindow {
  windowId: string;
  startTime: string;
  endTime: string;
  predictedAQI: number;
  predictedCategory: string;
  dominantPollutant: string;
  rank: number;
  suitabilityScore: number;
  explanation: string;
  provenance: DataProvenance;
}

export type SchoolAgeGroup = 'primary' | 'middle' | 'senior';

export interface SchoolCampus {
  campusId: string;
  schoolId: string;
  campusName: string;
  isMainCampus: boolean;
  district: string;
  state: string;
  coordinates: { lat: number; lon: number };
  nearestStationId?: string;
  totalStudents?: number;
  contactPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolProfile {
  schoolId: string;
  institutionName: string;
  district: string;
  state: string;
  coordinates: { lat: number; lon: number };
  administratorEmail: string;
  administratorName?: string;
  tenantId: string;
  campuses?: SchoolCampus[];
  notificationPreferences?: {
    parentBroadcastEnabled: boolean;
    staffAlertsEnabled: boolean;
    aqiAlertThreshold: number;
    preferredChannel: 'EMAIL' | 'SMS' | 'IN_APP';
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolPolicy {
  policyId?: string;
  schoolId?: string;
  ageGroup: SchoolAgeGroup;
  maxOutdoorAQI: number;
  mandatoryIndoorAQI: number;
  policySource?: 'INSTITUTIONAL_DISCRETIONARY_COMMITTEE';
  governanceDisclaimer?: string;
  modifiedAt?: string;
  modifiedBy?: string;
}

export interface SchoolActivity {
  activityId: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  activityName: string;
  activityType?: string;
  ageGroup: SchoolAgeGroup;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  intensity?: 'low' | 'moderate' | 'high' | 'vigorous';
  predictedAQI: number;
  category: string;
  evaluationStatus:
    | 'PRECAUTIONARY_OUTDOOR_PERMITTED'
    | 'MANDATORY_INDOOR_REQUIRED'
    | 'DATA_INSUFFICIENT_MANUAL_REVIEW';
  systemRecommendation?: {
    status: 'PRECAUTIONARY_OUTDOOR_PERMITTED' | 'MANDATORY_INDOOR_REQUIRED' | 'DATA_INSUFFICIENT_MANUAL_REVIEW';
    reason: string;
    indoorAlternativeSuggested: boolean;
    suggestedAlternativeWindow?: string;
  };
  administratorDecision?: {
    decision: 'APPROVED_OUTDOOR' | 'MANDATORY_INDOOR' | 'POSTPONED' | 'CANCELLED';
    notes?: string;
    decidedBy: string;
    decidedAt: string;
  };
  indoorAlternativeVenue: string;
  suggestedAlternativeWindow?: string;
  requiresAdminSignOff: boolean;
  adminSignOff?: {
    isSignedOff: boolean;
    signedOffBy?: string;
    decisionNotes?: string;
    signedOffAt?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface ParaliListingItem {
  listingId: string;
  farmerId?: string;
  farmerName: string;
  farmerPhoneMasked?: string;
  cropType: string;
  district: string;
  state?: string;
  locationName?: string;
  coordinates?: { lat: number; lon: number };
  quantityTons: number;
  moisturePercent: number;
  askingPricePerTonInr: number;
  balingType: string;
  availableFromDate?: string;
  availableUntilDate?: string;
  status: 'LISTED' | 'MATCHED' | 'IN_OFFER' | 'ACCEPTED' | 'COLLECTING' | 'VERIFIED' | 'EXPIRED';
  isPhoneMasked?: boolean;
  isDemoData: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BuyerProfileItem {
  buyerId: string;
  buyerName: string;
  organizationType: string;
  district: string;
  state: string;
  coordinates?: { lat: number; lon: number };
  acceptedCrops: string[];
  maxAcceptableMoisturePercent: number;
  monthlyCapacityTons: number;
  maxHaulingRadiusKm: number;
  offeredBasePricePerTonInr: number;
  isAcademicReference?: boolean;
  isDemoData?: boolean;
  createdAt?: string;
}

export type BuyerDemandItem = BuyerProfileItem;

export interface OfferItem {
  offerId: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  offeredPricePerTonInr: number;
  quantityTons: number;
  status: 'SUBMITTED' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  buyerNotes?: string;
  counterOfferPricePerTonInr?: number;
  lastUpdatedTimestamp: string;
  isDemoData?: boolean;
}

export type LogisticsStage = 'SCHEDULED' | 'LOADING' | 'IN_TRANSIT' | 'DELIVERED' | 'VERIFIED' | 'CANCELLED' | 'REJECTED';

export const LOGISTICS_STAGE_LABELS: Record<LogisticsStage, string> = {
  SCHEDULED: '1. Scheduled & Truck Assigned',
  LOADING: '2. Field Baling & Loading',
  IN_TRANSIT: '3. In Transit (GPS Monitored)',
  DELIVERED: '4. Delivered to Weighbridge Gate',
  VERIFIED: '5. Factory Verified & Moisture Certified',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

export interface CollectionItem {
  collectionId: string;
  offerId: string;
  listingId: string;
  buyerId?: string;
  farmerId?: string;
  stage: LogisticsStage;
  scheduledPickupDate: string;
  transporterName: string;
  vehicleRegistrationNumber: string;
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
  rejectedQuantityTons?: number;
  cancellationReason?: string;
  exceptionType?: string;
  rejectionTimestamp?: string;
  rejectionDisposition?: string;
  updatedAt: string;
  isDemoData?: boolean;
}

export interface MatchResultItem {
  listingId: string;
  buyerId: string;
  buyerName: string;
  industryType: string;
  compatibilityScore: number;
  haulingDistanceKm: number;
  estimatedFreightPerTonInr: number;
  netDeliveredCostPerTonInr: number;
  matchReasons: string[];
  disqualifyingFactors: string[];
}

export interface EnvironmentalImpactSummary {
  totalQuantityListedTons: number;
  totalQuantityMatchedTons: number;
  totalQuantityAcceptedTons: number;
  totalQuantityCollectedTons: number;
  totalQuantityVerifiedTons: number;
  co2eAvoidedTonsEstimate: number | null;
  pm25AvoidedKgEstimate: number | null;
  emissionsValidationStatus?: 'UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION' | 'VALIDATED' | string;
  farmerIncomeGeneratedInr: number;
  stubbleFiresAvertedEstimate?: number | null;
  burningAversionValidationStatus?: 'UNAVAILABLE_UNESTABLISHED_BURNING_BASELINE' | string;
  calculationMethodologyNotes?: string;
  isDemoAggregate: boolean;
}

export interface RegionalStationStatus {
  id: string;
  name: string;
  district: string;
  state: 'Delhi-NCR' | 'Punjab' | 'Haryana';
  aqi: number | null;
  category: string;
  dominant: string | null;
  pm25: number | null;
  pm10: number | null;
  distanceKm: number;
  lastUpdated: string;
  provenance: DataProvenance;
  isTelemetryAvailable: boolean;
  unavailableReason?: string;
  agency?: string;
}

export interface DecisionEngineRequest {
  locationName: string;
  coordinates: { lat: number; lon: number };
  targetDate: string; // YYYY-MM-DD
  activityType:
    | 'running'
    | 'walking'
    | 'brisk_walking'
    | 'outdoor_gym'
    | 'shopping'
    | 'cycling'
    | 'yoga'
    | 'outdoor_sports'
    | 'other';
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'high' | 'vigorous';
  earliestStartTime?: string;
  latestStartTime?: string;
  healthSensitivities?: {
    hasAsthma?: boolean;
    hasCardiovascularCondition?: boolean;
    isElderly?: boolean;
    isChild?: boolean;
    pregnancy?: boolean;
  };
  policyThreshold?: {
    maxAcceptableAQI?: number;
    mandatoryIndoorAQI?: number;
  };
}

export interface DecisionEngineResponse {
  locationName: string;
  coordinates: { lat: number; lon: number };
  targetDate: string;
  activityType:
    | 'running'
    | 'walking'
    | 'brisk_walking'
    | 'outdoor_gym'
    | 'shopping'
    | 'cycling'
    | 'yoga'
    | 'outdoor_sports'
    | 'other';
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'high' | 'vigorous';
  exertionVentilationMultiplier: number;
  candidateWindows: CandidateWindow[];
  bestWindow: CandidateWindow | null;
  status: 'OPTIMAL_WINDOW_FOUND' | 'CAUTION_ADVISED' | 'MANDATORY_INDOOR_RECOMMENDED' | 'INSUFFICIENT_DATA';
  alternativeAction?: {
    suggestIndoorAlternative: boolean;
    indoorActivitySuggestion: string;
    postponementRecommended: boolean;
    reason: string;
  };
  dataQuality: {
    provenance: DataProvenance;
    forecastModel: string;
    forecastIssueTime?: string;
    isForecastStale: boolean;
    hourlyCoverageCount: number;
  };
  disclaimers: {
    exposureRelativism: string;
    nonClinicalNotice: string;
    modelUncertainty: string;
  };
}

// -------------------------------------------------------------
// Grounded AI, Notifications, Scheduling & Observability (Prompt 9)
// -------------------------------------------------------------

export type NotificationType =
  | 'PERSONAL_ALERT'
  | 'ACTIVITY_REMINDER'
  | 'CAREGIVER_ALERT'
  | 'SCHOOL_BROADCAST'
  | 'SCHOOL_CAREGIVER_NOTICE'
  | 'MARKETPLACE_OFFER_UPDATE'
  | 'MARKETPLACE_LOGISTICS_UPDATE';

export type NotificationChannel = 'EMAIL' | 'IN_APP' | 'BROWSER';

export type NotificationStatus =
  | 'QUEUED'
  | 'SUBMITTED'
  | 'DELIVERED_SIMULATED'
  | 'FAILED'
  | 'UNCONFIGURED';

export interface NotificationRecord {
  id: string;
  userId: string;
  recipientEmail?: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  idempotencyKey?: string;
  sentAt: string;
  isRead: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationDeliveryStats {
  totalSent: number;
  deliveredSimulated: number;
  submitted: number;
  failed: number;
  unconfigured: number;
  byType: Record<string, number>;
}

export type ScheduledJobType =
  | 'REFRESH_AIR_DATA'
  | 'EVALUATE_ALERTS'
  | 'SEND_DUE_REMINDERS';

export interface ScheduledJobResult {
  jobType: ScheduledJobType;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  itemsProcessed: number;
  details?: Record<string, any>;
}

export interface SystemDiagnosticsResult {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  uptimeSeconds: number;
  region: string;
  cloudServices: {
    bedrock: { configured: boolean; mode: 'deterministic_fallback' | 'cloud_active'; modelId: string };
    ses: { configured: boolean; mode: 'simulation' | 'active'; senderEmail: string };
    dynamodb: { mode: 'in_memory_repository' | 'cloud_dynamodb' };
    eventBridge: { mode: 'in_process_cron' | 'cloud_events' };
  };
  notificationStats: NotificationDeliveryStats;
  scheduledJobs: {
    lastRunAt?: string;
    history: ScheduledJobResult[];
  };
  cacheAndProviders: {
    cpcbStatus: string;
    openMeteoCamsStatus: string;
    openMeteoWeatherStatus: string;
  };
  recentLogsSample: Array<{
    timestamp: string;
    level: string;
    correlationId: string;
    message: string;
  }>;
}


