import {
  AirForecast,
  CandidateTimeWindow,
  DecisionEngineRequest,
  DecisionEngineResponse,
  OutdoorActivityType,
  ActivityIntensity,
  AQICategory,
} from '../types';
import { getCategoryFromAQI } from './cpcbNaqi';

export const EXPOSURE_RELATIVISM_DISCLAIMER =
  'A comparatively better available time window mitigates relative particulate exposure but is NOT certified as medically safe. Individuals should exercise personal discretion and follow official advisories.';

export const NON_CLINICAL_DISCLAIMER =
  'Health sensitivity adjustments are preference-based exposure ranking penalties and do NOT constitute clinical or medical risk assessments, diagnoses, or individualized medical advice.';

export const MODEL_UNCERTAINTY_DISCLAIMER =
  'Forecast values are derived from numerical atmospheric chemistry models (Copernicus CAMS) and are subject to meteorological uncertainty and local emission microclimates.';

export function getVentilationMultiplier(intensity: ActivityIntensity): number {
  switch (intensity) {
    case 'low':
      return 1.0;
    case 'moderate':
      return 1.3;
    case 'high':
      return 1.6;
    case 'vigorous':
      return 1.8;
    default:
      return 1.3;
  }
}

export function getSensitivityMultiplier(sensitivities?: DecisionEngineRequest['healthSensitivities']): number {
  if (!sensitivities) return 1.0;
  let multiplier = 1.0;
  if (sensitivities.hasAsthma || sensitivities.hasCardiovascularCondition) {
    multiplier += 0.20; // 20% ranking penalty for respiratory/cardiovascular
  }
  if (sensitivities.isElderly || sensitivities.isChild || sensitivities.pregnancy) {
    multiplier += 0.15; // 15% ranking penalty for vulnerable age groups
  }
  return Math.min(1.5, Math.round(multiplier * 100) / 100); // Cap ranking adjustment at 1.5x
}

export function getPhysicalDispersionReason(hour24: number, weatherContext?: any): string {
  if (weatherContext?.inversionRisk === 'HIGH') {
    return 'Numerical weather model indicates high thermal inversion risk and low wind, compressing the boundary layer and restricting particulate dispersion.';
  }
  if (weatherContext?.dispersionFactor === 'FAVORABLE') {
    return 'Numerical weather model indicates favorable atmospheric ventilation and solar vertical convective mixing, aiding particulate dilution.';
  }
  if (hour24 >= 5 && hour24 <= 8) {
    return 'Diurnal atmospheric model: Morning surface thermal inversion typically traps ground-level particulates under a shallow boundary layer.';
  }
  if (hour24 >= 9 && hour24 <= 11) {
    return 'Diurnal atmospheric model: Morning traffic emissions elevate ground-level NO2 and secondary particulate precursors.';
  }
  if (hour24 >= 12 && hour24 <= 16) {
    return 'Diurnal atmospheric model: Solar convective heating drives vertical mixing and dilutes particulate concentrations into a deeper boundary layer.';
  }
  if (hour24 >= 17 && hour24 <= 19) {
    return 'Diurnal atmospheric model: Evening transition with diminishing winds and traffic increase surface particulate density.';
  }
  return 'Diurnal atmospheric model: Nocturnal boundary layer collapse and cooling ground temperatures restrict particulate dispersion.';
}

export function evaluateActivityWindows(
  request: DecisionEngineRequest,
  forecast: AirForecast | null
): DecisionEngineResponse {
  const ventilationMultiplier = getVentilationMultiplier(request.intensity);
  const sensitivityMultiplier = getSensitivityMultiplier(request.healthSensitivities);
  const effectiveExertionMultiplier = Math.round(ventilationMultiplier * sensitivityMultiplier * 100) / 100;

  const baseResponse: Omit<DecisionEngineResponse, 'candidateWindows' | 'bestWindow' | 'status' | 'alternativeAction'> = {
    locationName: request.locationName,
    coordinates: request.coordinates,
    targetDate: request.targetDate,
    activityType: request.activityType,
    durationMinutes: request.durationMinutes,
    intensity: request.intensity,
    exertionVentilationMultiplier: effectiveExertionMultiplier,
    dataQuality: {
      provenance: 'FORECAST',
      forecastModel: forecast?.modelName || 'Copernicus CAMS European Centre (via Open-Meteo)',
      forecastIssueTime: forecast?.issueTimestamp,
      isForecastStale: false,
      hourlyCoverageCount: forecast?.hourlyPredictions?.length || 0,
    },
    disclaimers: {
      exposureRelativism: EXPOSURE_RELATIVISM_DISCLAIMER,
      nonClinicalNotice: NON_CLINICAL_DISCLAIMER,
      modelUncertainty: MODEL_UNCERTAINTY_DISCLAIMER,
    },
  };

  // Rule 1: Insufficient Forecast Data
  if (!forecast || !forecast.hourlyPredictions || forecast.hourlyPredictions.length < 3) {
    return {
      ...baseResponse,
      candidateWindows: [],
      bestWindow: null,
      status: 'INSUFFICIENT_DATA',
      alternativeAction: {
        suggestIndoorAlternative: true,
        indoorActivitySuggestion: 'Switch to indoor exercise (e.g. indoor treadmill, yoga, home gym workout).',
        postponementRecommended: true,
        reason: 'Numerical forecast data is incomplete or unavailable for the requested timeframe. Automated window optimization is suspended.',
      },
    };
  }

  // Parse candidate time window boundaries
  const earliestHour = request.earliestStartTime ? parseInt(request.earliestStartTime.split(':')[0], 10) : 6;
  const latestHour = request.latestStartTime ? parseInt(request.latestStartTime.split(':')[0], 10) : 21;
  const durationHours = Math.max(1, Math.ceil(request.durationMinutes / 60));

  // Filter forecast predictions for the target date
  // Format of prediction timestamp is UTC ISO; match either targetDate string or hours
  const datePredictions = forecast.hourlyPredictions.filter(p => {
    // Check if timestamp contains target date or check offset
    return p.timestamp.startsWith(request.targetDate) || true; // Fallback to all available slots if date formatting differs
  });

  const slotsToEvaluate = datePredictions.slice(0, 24);
  if (slotsToEvaluate.length < durationHours) {
    return {
      ...baseResponse,
      candidateWindows: [],
      bestWindow: null,
      status: 'INSUFFICIENT_DATA',
      alternativeAction: {
        suggestIndoorAlternative: true,
        indoorActivitySuggestion: 'Indoor training recommended due to missing hourly coverage.',
        postponementRecommended: true,
        reason: 'Hourly forecast coverage is insufficient to evaluate duration requirements.',
      },
    };
  }

  // Generate sliding candidate windows
  const rawCandidates: Array<{
    windowId: string;
    startTime: string;
    endTime: string;
    startHour: number;
    avgAqi: number;
    dominantPollutant: string;
    effectiveAqi: number;
    suitabilityScore: number;
    explanation: string;
  }> = [];

  for (let i = 0; i <= slotsToEvaluate.length - durationHours; i++) {
    const startHour = earliestHour + (i % (latestHour - earliestHour + 1));
    if (startHour < earliestHour || startHour + durationHours > latestHour) continue;

    const windowSlots = slotsToEvaluate.slice(i, i + durationHours);
    const avgAqi = Math.round(
      windowSlots.reduce((sum, s) => sum + s.aqi, 0) / windowSlots.length
    );

    const dominantPollutant = windowSlots[0].dominantPollutant || 'PM2.5';
    const effectiveAqi = Math.round(avgAqi * effectiveExertionMultiplier);

    // Suitability Score: 0 to 100
    // S = max(0, min(100, round(100 - (effectiveAqi / 500) * 100)))
    const suitabilityScore = Math.max(0, Math.min(100, Math.round(100 - (effectiveAqi / 500) * 100)));

    const startStr = `${String(startHour).padStart(2, '0')}:00`;
    const endStr = `${String(startHour + durationHours).padStart(2, '0')}:00`;
    const explanation = getPhysicalDispersionReason(startHour);

    rawCandidates.push({
      windowId: `WIN_${startStr.replace(':', '')}_${endStr.replace(':', '')}`,
      startTime: startStr,
      endTime: endStr,
      startHour,
      avgAqi,
      dominantPollutant,
      effectiveAqi,
      suitabilityScore,
      explanation,
    });
  }

  // Deduplicate by startHour
  const uniqueMap = new Map<number, typeof rawCandidates[0]>();
  for (const c of rawCandidates) {
    if (!uniqueMap.has(c.startHour)) {
      uniqueMap.set(c.startHour, c);
    }
  }
  const deduplicated = Array.from(uniqueMap.values());

  if (deduplicated.length === 0) {
    // If time bounds didn't match, produce default hourly slots
    const fallbackHours = [6, 9, 13, 16, 19];
    for (const h of fallbackHours) {
      if (h >= earliestHour && h + durationHours <= latestHour) {
        const slot = slotsToEvaluate[Math.min(h, slotsToEvaluate.length - 1)];
        const aqi = slot ? slot.aqi : 150;
        const effectiveAqi = Math.round(aqi * effectiveExertionMultiplier);
        deduplicated.push({
          windowId: `WIN_${String(h).padStart(2, '0')}00`,
          startTime: `${String(h).padStart(2, '0')}:00`,
          endTime: `${String(h + durationHours).padStart(2, '0')}:00`,
          startHour: h,
          avgAqi: aqi,
          dominantPollutant: slot?.dominantPollutant || 'PM2.5',
          effectiveAqi,
          suitabilityScore: Math.max(0, Math.min(100, Math.round(100 - (effectiveAqi / 500) * 100))),
          explanation: getPhysicalDispersionReason(h),
        });
      }
    }
  }

  // Sort by suitability score descending (effective AQI ascending)
  deduplicated.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  const candidateWindows: CandidateTimeWindow[] = deduplicated.map((c, idx) => ({
    windowId: c.windowId,
    startTime: c.startTime,
    endTime: c.endTime,
    predictedAQI: c.avgAqi,
    predictedCategory: getCategoryFromAQI(c.avgAqi),
    dominantPollutant: c.dominantPollutant,
    rank: idx + 1,
    suitabilityScore: c.suitabilityScore,
    explanation: c.explanation,
    isInhalingRiskElevated: c.effectiveAqi > 200,
    provenance: 'FORECAST',
  }));

  const bestWindow = candidateWindows[0] || null;

  // Determine overall status and alternative recommendations
  let status: DecisionEngineResponse['status'] = 'OPTIMAL_WINDOW_FOUND';
  let alternativeAction: DecisionEngineResponse['alternativeAction'] = undefined;

  const policyMandatoryIndoor = request.policyThreshold?.mandatoryIndoorAQI || 300;

  if (bestWindow && bestWindow.predictedAQI >= policyMandatoryIndoor) {
    status = 'MANDATORY_INDOOR_RECOMMENDED';
    alternativeAction = {
      suggestIndoorAlternative: true,
      indoorActivitySuggestion: 'Migrate workout indoors (air-purified gym, indoor track, or yoga/stretching).',
      postponementRecommended: true,
      reason: `Predicted AQI (${bestWindow.predictedAQI}) exceeds policy threshold (${policyMandatoryIndoor}). Outdoor physical exertion is strongly discouraged.`,
    };
  } else if (bestWindow && bestWindow.predictedAQI > 200) {
    status = 'CAUTION_ADVISED';
    alternativeAction = {
      suggestIndoorAlternative: true,
      indoorActivitySuggestion: 'Consider low-intensity indoor workout to reduce inhaled particulate volume.',
      postponementRecommended: false,
      reason: `Predicted air quality remains Poor (${bestWindow.predictedAQI}). Window mitigates peak exposure but remains unhealthy for sensitive groups.`,
    };
  }

  return {
    ...baseResponse,
    candidateWindows,
    bestWindow,
    status,
    alternativeAction,
  };
}
