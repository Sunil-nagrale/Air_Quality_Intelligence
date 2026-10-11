export type SchoolCohort = 'primary' | 'middle' | 'senior';

export interface SchoolPolicyThresholds {
  maxOutdoorAQI: number;
  mandatoryIndoorAQI: number;
}

export interface SchoolEvaluationInput {
  cohort: SchoolCohort;
  policy: SchoolPolicyThresholds;
  campusAQI: number | null;
  dominantPollutant: string | null;
  isTelemetryAvailable: boolean;
}

export interface SchoolEvaluationResult {
  status:
    | 'MANDATORY_INDOOR'
    | 'PRECAUTIONARY_OUTDOOR_PERMITTED'
    | 'DATA_INSUFFICIENT_MANUAL_REVIEW';
  isBreached: boolean;
  recommendation: string;
  isStatutoryRegulation: false;
  governanceNotice: string;
  suggestedAlternativeWindow?: string;
  requiresAdminSignOff: boolean;
}

export const INSTITUTIONAL_GOVERNANCE_NOTICE =
  'Activity thresholds are discretionary school policies established by the institutional safety committee, NOT statutory national regulatory standards. A comparatively lower AQI window mitigates relative exposure but is not certified as medically safe.';

export function evaluateSchoolActivity(
  input: SchoolEvaluationInput
): SchoolEvaluationResult {
  // Rule 1: Missing or insufficient air-quality data MUST NOT produce a clearance recommendation
  if (!input.isTelemetryAvailable || input.campusAQI === null || isNaN(input.campusAQI)) {
    return {
      status: 'DATA_INSUFFICIENT_MANUAL_REVIEW',
      isBreached: false,
      recommendation:
        'Campus telemetry is currently incomplete or offline. Automated safety recommendations are suspended; school administration must conduct an explicit manual precautionary review before permitting outdoor activity.',
      isStatutoryRegulation: false,
      governanceNotice: INSTITUTIONAL_GOVERNANCE_NOTICE,
      requiresAdminSignOff: true,
    };
  }

  // Rule 2: Institutional threshold breach
  if (input.campusAQI > input.policy.mandatoryIndoorAQI) {
    return {
      status: 'MANDATORY_INDOOR',
      isBreached: true,
      recommendation: `Campus air reading of AQI ${input.campusAQI} exceeds configured institutional policy limit (${input.policy.mandatoryIndoorAQI}) for ${input.cohort} students. The system recommends mandatory indoor auditorium migration.`,
      isStatutoryRegulation: false,
      governanceNotice: INSTITUTIONAL_GOVERNANCE_NOTICE,
      suggestedAlternativeWindow:
        'Reschedule outdoor activities to 14:30 – 16:00 (estimated AQI ~148 with lower particulate exposure). Note: comparative improvement does not imply absolute safety.',
      requiresAdminSignOff: true,
    };
  }

  // Rule 3: Within configured threshold
  return {
    status: 'PRECAUTIONARY_OUTDOOR_PERMITTED',
    isBreached: false,
    recommendation: `Conditions (AQI ${input.campusAQI}) are within the configured school policy limit (${input.policy.maxOutdoorAQI}) for ${input.cohort} students. Precautionary monitoring advised.`,
    isStatutoryRegulation: false,
    governanceNotice: INSTITUTIONAL_GOVERNANCE_NOTICE,
    requiresAdminSignOff: false,
  };
}
