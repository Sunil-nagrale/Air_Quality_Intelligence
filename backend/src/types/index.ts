export type DataProvenance =
  | 'MEASURED_OBSERVATION'
  | 'FORECAST'
  | 'MODELLED_ESTIMATE'
  | 'DEMO_DATA';

export type AQICategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe'
  | 'Insufficient Data';

// Five Authoritative Platform Roles per Master Specification
export type UserRole =
  | 'PERSONAL_USER'
  | 'SCHOOL_ADMIN'
  | 'FARMER'
  | 'BUYER'
  | 'PLATFORM_ADMIN';

export interface AuthPrincipal {
  userId: string;
  email: string;
  role: UserRole;
  schoolId?: string;
  farmerId?: string;
  buyerId?: string;
  isDemo?: boolean;
}

export interface PollutantValues {
  pm25?: number; // ug/m3
  pm10?: number; // ug/m3
  no2?: number;  // ug/m3
  so2?: number;  // ug/m3
  co?: number;   // mg/m3
  o3?: number;   // ug/m3
  nh3?: number;  // ug/m3 (Ammonia)
  pb?: number;   // ug/m3 (Lead)
}

export interface PollutantSubIndices {
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  nh3?: number;
  pb?: number;
}

export interface CPCBNaqiResult {
  aqi: number | null;
  category: AQICategory;
  dominantPollutant: string | null;
  subIndices: PollutantSubIndices;
  isSufficientData: boolean;
  missingPollutants: string[];
  provenance: DataProvenance;
  timestamp: string;
  stationOrModelInfo: string;
  uncertaintyRadiusKm?: number;
  aqiStandard?: 'CPCB_NAQI_2014';
  averagingPeriod?: '24h_regulatory' | '1h_indicative';
  inputsUsed?: string[];
  calculationTimestamp?: string;
}

export interface EnvironmentalContext {
  temperatureC?: number;
  relativeHumidityPercent?: number;
  windSpeedKmH?: number;
  windDirectionDegrees?: number;
  surfacePressureHPa?: number;
  inversionRisk?: 'LOW' | 'MODERATE' | 'HIGH';
  dispersionFactor?: 'FAVORABLE' | 'MODERATE' | 'POOR_STAGNANT';
  timestamp: string;
  source: string;
}

// -------------------------------------------------------------
// 14 Persistent Domain Entities
// -------------------------------------------------------------

// 1. UserProfile
export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  phoneNumberMasked?: string;
  institutionOrOrgName?: string;
  district?: string;
  state?: string;
  isEmailVerified: boolean;
  isDemoUser?: boolean;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
}

// 2. HealthPreferences
export interface HealthPreferences {
  userId: string;
  hasAsthma: boolean;
  hasCardiovascularCondition: boolean;
  isElderly: boolean;
  isChild: boolean;
  pregnancy: boolean;
  nonClinicalSensitivityWeight: number; // 1.0 = standard, 1.25 = moderate, 1.5 = sensitive
  isOptionalConsentGiven: boolean;
  updatedAt: string;
}

// 3. AirObservation (Ground Truth CAAQMS)
export interface AirObservation {
  stationId: string;
  stationName: string;
  district: string;
  state: string;
  coordinates: { lat: number; lon: number };
  agency: string; // DPCC, HSPCB, PPCB, CPCB
  aqi: number | null;
  category: AQICategory;
  dominantPollutant: string | null;
  pollutants: PollutantValues;
  observationTimestamp: string; // Source time in UTC
  sourceTimezone: string;        // 'Asia/Kolkata'
  ingestionTimestamp?: string;
  provenance: 'MEASURED_OBSERVATION' | 'DEMO_DATA';
  isTelemetryAvailable: boolean;
  unavailableReason?: string;
}

// 4. AirForecast (Numerical Models)
export interface AirForecast {
  forecastId: string;
  coordinates: { lat: number; lon: number };
  modelName: 'Copernicus CAMS European Centre (via Open-Meteo)';
  issueTimestamp: string;        // Forecast run timestamp
  hoursCount: number;
  hourlyPredictions: Array<{
    timestamp: string;           // UTC
    hourOffset: number;
    aqi: number;
    category: AQICategory;
    dominantPollutant: string;
    pm25: number;
    pm10: number;
    no2?: number;
    so2?: number;
    co?: number;
    o3?: number;
  }>;
  provenance: 'FORECAST';
}

// 5. LocalAirEstimate (Spatial Interpolation)
export interface LocalAirEstimate {
  estimateId: string;
  coordinates: { lat: number; lon: number };
  estimatedAQI: number | null;
  category: AQICategory;
  nearestStationId: string;
  nearestStationDistanceKm: number;
  uncertaintyStdDev: number;
  methodology: 'IDW_INVERSE_DISTANCE_WEIGHTED';
  calculationTimestamp: string;
  provenance: 'MODELLED_ESTIMATE';
}

// 6. ActivityPlan (Personal Copilot Plan)
export type OutdoorActivityType =
  | 'running'
  | 'walking'
  | 'brisk_walking'
  | 'outdoor_gym'
  | 'shopping'
  | 'cycling'
  | 'yoga'
  | 'outdoor_sports'
  | 'other';
export type ActivityIntensity = 'low' | 'moderate' | 'high' | 'vigorous';

export interface CandidateTimeWindow {
  windowId: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  predictedAQI: number;
  predictedCategory: AQICategory;
  dominantPollutant: string;
  rank: number;
  suitabilityScore: number; // 0-100
  explanation: string;
  isInhalingRiskElevated: boolean;
  provenance: DataProvenance;
}

export interface ActivityPlan {
  planId: string;
  userId: string;
  activityType: OutdoorActivityType;
  durationMinutes: number;
  intensity: ActivityIntensity;
  targetDate: string; // YYYY-MM-DD
  locationName: string;
  coordinates: { lat: number; lon: number };
  rankedWindows: CandidateTimeWindow[];
  selectedWindow?: CandidateTimeWindow;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionEngineRequest {
  locationName: string;
  coordinates: { lat: number; lon: number };
  targetDate: string; // YYYY-MM-DD
  activityType: OutdoorActivityType;
  durationMinutes: number;
  intensity: ActivityIntensity;
  earliestStartTime?: string; // HH:mm, default '06:00'
  latestStartTime?: string;   // HH:mm, default '21:00'
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
  activityType: OutdoorActivityType;
  durationMinutes: number;
  intensity: ActivityIntensity;
  exertionVentilationMultiplier: number;
  candidateWindows: CandidateTimeWindow[];
  bestWindow: CandidateTimeWindow | null;
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

// 7. AlertPreference
export interface AlertPreference {
  userId: string;
  emailAlertsEnabled: boolean;
  aqiThresholdAlert: number;     // e.g. 200 or 250
  preferredNotificationChannel: 'EMAIL' | 'IN_APP' | 'BOTH';
  caregiverRecipientEmail?: string;
  caregiverConsentVerified: boolean;
  updatedAt: string;
}

// 8. SchoolCampus & SchoolProfile
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt?: string;
}

// 9. SchoolSafetyPolicy
export type SchoolAgeGroup = 'primary' | 'middle' | 'senior';

export interface SchoolPolicy {
  policyId: string;
  schoolId: string;
  ageGroup: SchoolAgeGroup;
  maxOutdoorAQI: number;
  mandatoryIndoorAQI: number;
  policySource: 'INSTITUTIONAL_DISCRETIONARY_COMMITTEE';
  governanceDisclaimer: string;
  modifiedAt: string;
  modifiedBy: string;
}

// 10. SchoolActivity
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
  intensity?: ActivityIntensity;
  predictedAQI: number;
  category: AQICategory;
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

// 11. ResidueListing
export type ParaliCropType = 'Paddy Straw (Non-Basmati)' | 'Basmati Straw' | 'Wheat Straw' | 'Mustard Stalk';
export type ResidueBalingType = 'Loose Stubble' | 'Ex-Field Baled (Round/Square)' | 'Ex-Depot Aggregated';
export type ListingStatus = 'LISTED' | 'MATCHED' | 'IN_OFFER' | 'ACCEPTED' | 'COLLECTING' | 'VERIFIED' | 'EXPIRED';

export interface ResidueListing {
  listingId: string;
  farmerId: string;
  farmerName: string;
  farmerPhoneMasked: string;
  cropType: ParaliCropType;
  district: string;
  state: 'Punjab' | 'Haryana' | 'Delhi-NCR';
  locationName: string;
  coordinates: { lat: number; lon: number };
  quantityTons: number;
  moisturePercent: number;
  askingPricePerTonInr: number;
  balingType: ResidueBalingType;
  availableFromDate: string;
  availableUntilDate: string;
  status: ListingStatus;
  isDemoData: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Aliases for backward compatibility
export type ParaliListing = ResidueListing;

// 12. BuyerProfile
export interface BuyerProfile {
  buyerId: string;
  buyerName: string;
  organizationType:
    | 'Biomass Pellet Manufacturer'
    | 'Bio-CNG / CBG Plant'
    | '2G Bio-Ethanol Refinery'
    | 'Pulp & Tableware Manufacturer (Ref: Kriya Labs IIT Delhi)';
  district: string;
  state: string;
  coordinates: { lat: number; lon: number };
  acceptedCrops: ParaliCropType[];
  maxAcceptableMoisturePercent: number;
  monthlyCapacityTons: number;
  maxHaulingRadiusKm: number;
  offeredBasePricePerTonInr: number;
  isAcademicReference?: boolean;
  isDemoData: boolean;
  createdAt?: string;
}

export type BuyerRequirement = BuyerProfile;

// 13. Offer
export type OfferStatus = 'SUBMITTED' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface Offer {
  offerId: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  offeredPricePerTonInr: number;
  quantityTons: number;
  status: OfferStatus;
  buyerNotes?: string;
  counterOfferPricePerTonInr?: number;
  lastUpdatedTimestamp: string;
  isDemoData: boolean;
  remainingQuantityTons?: number;
  reservedQuantityTons?: number;
  actualCollectedGrossTons?: number;
  deliveredGrossTons?: number;
  rejectedQuantityTons?: number;
  totalCollectedTons?: number;
  verifiedNetTons?: number;
}

export type MarketplaceOffer = Offer;

// 14. CollectionRecord
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

export interface CollectionRecord {
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
  exceptionType?: 'CANCELLED_BEFORE_PICKUP' | 'REJECTED_AT_GATE' | 'QUALITY_REJECTED' | 'RETURNED' | 'TRANSIT_EXCEPTION';
  rejectionTimestamp?: string;
  rejectionDisposition?: 'DISPOSED' | 'RETURNED_TO_FARM' | 'PENDING_ARBITRATION';
  updatedAt: string;
  isDemoData: boolean;
}

export type CollectionMilestone = CollectionRecord;

// 15. AuditEvent
export interface AuditEvent {
  eventId: string;
  entityType: 'USER' | 'POLICY' | 'SCHOOL_ACTIVITY' | 'LISTING' | 'OFFER' | 'COLLECTION' | 'CAMPUS';
  entityId: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
  timestamp: string; // ISO UTC
}

// -------------------------------------------------------------
// Additional Domain Support Types
// -------------------------------------------------------------

export interface ParaliMatchResult {
  listingId: string;
  buyerId: string;
  buyerName: string;
  industryType: string;
  compatibilityScore: number; // 0-100
  haulingDistanceKm: number;
  estimatedFreightPerTonInr: number;
  netDeliveredCostPerTonInr: number;
  matchReasons: string[];
  disqualifyingFactors: string[];
}

export interface EnvironmentalImpactMetrics {
  totalQuantityListedTons: number;
  totalQuantityMatchedTons: number;
  totalQuantityAcceptedTons: number;
  totalQuantityCollectedTons: number;
  totalQuantityVerifiedTons: number;
  co2eAvoidedTonsEstimate: number | null;
  pm25AvoidedKgEstimate: number | null;
  emissionsValidationStatus: 'UNAVAILABLE_PENDING_BATCH_LCA_CERTIFICATION' | 'VALIDATED';
  farmerIncomeGeneratedInr: number;
  stubbleFiresAvertedEstimate: number | null;
  burningAversionValidationStatus: 'UNAVAILABLE_UNESTABLISHED_BURNING_BASELINE';
  calculationMethodologyNotes: string;
  isDemoAggregate: boolean;
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

