import {
  AQICategory,
  CPCBNaqiResult,
  DataProvenance,
  PollutantSubIndices,
  PollutantValues,
} from '../types';

interface Breakpoint {
  bLo: number;
  bHi: number;
  iLo: number;
  iHi: number;
}

// CPCB NAQI Breakpoint Definitions (Ministry of Environment, Forest & Climate Change)
const BREAKPOINTS: Record<string, Breakpoint[]> = {
  pm25: [
    { bLo: 0, bHi: 30, iLo: 0, iHi: 50 },
    { bLo: 31, bHi: 60, iLo: 51, iHi: 100 },
    { bLo: 61, bHi: 90, iLo: 101, iHi: 200 },
    { bLo: 91, bHi: 120, iLo: 201, iHi: 300 },
    { bLo: 121, bHi: 250, iLo: 301, iHi: 400 },
    { bLo: 251, bHi: 500, iLo: 401, iHi: 500 },
  ],
  pm10: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 51, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 101, bHi: 250, iLo: 101, iHi: 200 },
    { bLo: 251, bHi: 350, iLo: 201, iHi: 300 },
    { bLo: 351, bHi: 430, iLo: 301, iHi: 400 },
    { bLo: 431, bHi: 600, iLo: 401, iHi: 500 },
  ],
  no2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 41, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 81, bHi: 180, iLo: 101, iHi: 200 },
    { bLo: 181, bHi: 280, iLo: 201, iHi: 300 },
    { bLo: 281, bHi: 400, iLo: 301, iHi: 400 },
    { bLo: 401, bHi: 600, iLo: 401, iHi: 500 },
  ],
  so2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 41, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 81, bHi: 380, iLo: 101, iHi: 200 },
    { bLo: 381, bHi: 800, iLo: 201, iHi: 300 },
    { bLo: 801, bHi: 1600, iLo: 301, iHi: 400 },
    { bLo: 1601, bHi: 2000, iLo: 401, iHi: 500 },
  ],
  co: [
    { bLo: 0, bHi: 1.0, iLo: 0, iHi: 50 },
    { bLo: 1.1, bHi: 2.0, iLo: 51, iHi: 100 },
    { bLo: 2.1, bHi: 10.0, iLo: 101, iHi: 200 },
    { bLo: 10.1, bHi: 17.0, iLo: 201, iHi: 300 },
    { bLo: 17.1, bHi: 34.0, iLo: 301, iHi: 400 },
    { bLo: 34.1, bHi: 50.0, iLo: 401, iHi: 500 },
  ],
  o3: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 51, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 101, bHi: 168, iLo: 101, iHi: 200 },
    { bLo: 169, bHi: 208, iLo: 201, iHi: 300 },
    { bLo: 209, bHi: 748, iLo: 301, iHi: 400 },
    { bLo: 749, bHi: 1000, iLo: 401, iHi: 500 },
  ],
  nh3: [
    { bLo: 0, bHi: 200, iLo: 0, iHi: 50 },
    { bLo: 201, bHi: 400, iLo: 51, iHi: 100 },
    { bLo: 401, bHi: 800, iLo: 101, iHi: 200 },
    { bLo: 801, bHi: 1200, iLo: 201, iHi: 300 },
    { bLo: 1201, bHi: 1800, iLo: 301, iHi: 400 },
    { bLo: 1801, bHi: 2400, iLo: 401, iHi: 500 },
  ],
  pb: [
    { bLo: 0, bHi: 0.5, iLo: 0, iHi: 50 },
    { bLo: 0.6, bHi: 1.0, iLo: 51, iHi: 100 },
    { bLo: 1.1, bHi: 2.0, iLo: 101, iHi: 200 },
    { bLo: 2.1, bHi: 3.0, iLo: 201, iHi: 300 },
    { bLo: 3.1, bHi: 3.5, iLo: 301, iHi: 400 },
    { bLo: 3.6, bHi: 5.0, iLo: 401, iHi: 500 },
  ],
};

// Physical plausibility upper limits (anything above is deemed sensor failure/corrupt)
const PHYSICAL_PLAUSIBILITY_LIMITS: Record<string, number> = {
  pm25: 1500,
  pm10: 2500,
  no2: 1200,
  so2: 2500,
  co: 100,
  o3: 1200,
  nh3: 2500,
  pb: 20,
};

export function calculateSubIndex(pollutant: string, concentration: number): number | null {
  const table = BREAKPOINTS[pollutant];
  if (!table || concentration === null || concentration === undefined || isNaN(concentration) || concentration < 0) {
    return null;
  }

  const maxPhysicalLimit = PHYSICAL_PLAUSIBILITY_LIMITS[pollutant];
  if (maxPhysicalLimit !== undefined && concentration > maxPhysicalLimit) {
    // Sensor failure or corrupted reading
    return null;
  }

  // Handle out of upper bounds of standard table gracefully by capping at 500 (Severe max)
  if (concentration > table[table.length - 1].bHi) {
    return 500;
  }

  for (const bp of table) {
    if (concentration >= bp.bLo && concentration <= bp.bHi) {
      const subIndex = bp.iLo + ((bp.iHi - bp.iLo) / (bp.bHi - bp.bLo)) * (concentration - bp.bLo);
      return Math.round(subIndex);
    }
  }

  // Fallback interpolation between breakpoints
  for (let i = 0; i < table.length - 1; i++) {
    if (concentration > table[i].bHi && concentration < table[i + 1].bLo) {
      return table[i].iHi;
    }
  }

  return null;
}

export function getCategoryFromAQI(aqi: number): AQICategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function calculateCPCBNaqi(
  values: PollutantValues,
  provenance: DataProvenance,
  stationOrModelInfo: string,
  timestamp: string = new Date().toISOString(),
  averagingPeriod: '24h_regulatory' | '1h_indicative' = '24h_regulatory'
): CPCBNaqiResult {
  const subIndices: PollutantSubIndices = {};
  const validPollutants: string[] = [];
  const missingPollutants: string[] = [];

  const checkList: Array<keyof PollutantValues> = [
    'pm25',
    'pm10',
    'no2',
    'so2',
    'co',
    'o3',
    'nh3',
    'pb',
  ];

  for (const p of checkList) {
    const val = values[p];
    if (val !== undefined && val !== null && !isNaN(val)) {
      const sub = calculateSubIndex(p, val);
      if (sub !== null) {
        subIndices[p] = sub;
        validPollutants.push(p);
      } else {
        missingPollutants.push(p);
      }
    } else {
      missingPollutants.push(p);
    }
  }

  // CPCB Strict Rule:
  // 1. At least three pollutants must be monitored.
  // 2. At least one must be PM2.5 or PM10.
  const hasParticulate = subIndices.pm25 !== undefined || subIndices.pm10 !== undefined;
  const isSufficientData = validPollutants.length >= 3 && hasParticulate;

  const calculationTimestamp = new Date().toISOString();

  if (!isSufficientData) {
    return {
      aqi: null,
      category: 'Insufficient Data',
      dominantPollutant: null,
      subIndices,
      isSufficientData: false,
      missingPollutants,
      provenance,
      timestamp,
      stationOrModelInfo,
      aqiStandard: 'CPCB_NAQI_2014',
      averagingPeriod,
      inputsUsed: validPollutants,
      calculationTimestamp,
    };
  }

  // Overall AQI = max of available sub-indices
  let maxSubIndex = -1;
  let dominantPollutant: string | null = null;

  for (const [p, sub] of Object.entries(subIndices)) {
    if (sub !== undefined && sub > maxSubIndex) {
      maxSubIndex = sub;
      dominantPollutant = p.toUpperCase();
    }
  }

  return {
    aqi: maxSubIndex,
    category: getCategoryFromAQI(maxSubIndex),
    dominantPollutant,
    subIndices,
    isSufficientData: true,
    missingPollutants,
    provenance,
    timestamp,
    stationOrModelInfo,
    aqiStandard: 'CPCB_NAQI_2014',
    averagingPeriod,
    inputsUsed: validPollutants,
    calculationTimestamp,
  };
}
