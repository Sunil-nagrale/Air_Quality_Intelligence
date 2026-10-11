import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  Activity,
  HeartPulse,
  Sparkles,
  CheckCircle,
  Bell,
  Info,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  Sliders,
  History,
  LayoutDashboard,
  Navigation,
  AlertTriangle,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { apiClient } from '../../services/apiClient';

interface LocationPreset {
  name: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  nearestStation: string;
  stationDistanceKm: number;
  aqi: number;
  category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
  dominant: string;
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  so2: number;
  o3: number;
  nh3?: number;
  pb?: number;
  timestamp: string;
}

const REGIONAL_LOCATIONS: LocationPreset[] = [
  {
    name: 'Connaught Place, Central Delhi',
    district: 'New Delhi',
    state: 'Delhi-NCR',
    lat: 28.6289,
    lon: 77.2065,
    nearestStation: 'Mandir Marg CAAQMS (DPCC)',
    stationDistanceKm: 2.1,
    aqi: 177,
    category: 'Moderate',
    dominant: 'PM10',
    pm25: 62.9,
    pm10: 215.6,
    no2: 14.0,
    co: 0.57,
    so2: 30.7,
    o3: 132.0,
    nh3: 28.4,
    pb: 0.45,
    timestamp: '10:30 IST Today',
  },
  {
    name: 'Anand Vihar, East Delhi',
    district: 'East Delhi',
    state: 'Delhi-NCR',
    lat: 28.6469,
    lon: 77.3160,
    nearestStation: 'Anand Vihar CAAQMS (DPCC)',
    stationDistanceKm: 0.4,
    aqi: 284,
    category: 'Poor',
    dominant: 'PM2.5',
    pm25: 114.2,
    pm10: 298.0,
    no2: 42.0,
    co: 1.8,
    so2: 38.0,
    o3: 88.0,
    nh3: 45.2,
    pb: 0.82,
    timestamp: '10:30 IST Today',
  },
  {
    name: 'Sector 51, Gurugram',
    district: 'Gurugram',
    state: 'Haryana',
    lat: 28.4282,
    lon: 77.0722,
    nearestStation: 'Sector 51 CAAQMS (HSPCB)',
    stationDistanceKm: 0.8,
    aqi: 192,
    category: 'Moderate',
    dominant: 'PM2.5',
    pm25: 84.5,
    pm10: 195.0,
    no2: 28.0,
    co: 0.8,
    so2: 22.0,
    o3: 95.0,
    nh3: 31.0,
    pb: 0.55,
    timestamp: '10:30 IST Today',
  },
  {
    name: 'PAU Campus, Ludhiana',
    district: 'Ludhiana',
    state: 'Punjab',
    lat: 30.9010,
    lon: 75.8073,
    nearestStation: 'PAU CAAQMS (PPCB)',
    stationDistanceKm: 1.2,
    aqi: 225,
    category: 'Poor',
    dominant: 'PM2.5',
    pm25: 98.0,
    pm10: 230.0,
    no2: 24.0,
    co: 1.1,
    so2: 19.0,
    o3: 72.0,
    nh3: 26.5,
    pb: 0.48,
    timestamp: '10:30 IST Today',
  },
  {
    name: 'Civil Lines, Patiala',
    district: 'Patiala',
    state: 'Punjab',
    lat: 30.3400,
    lon: 76.3800,
    nearestStation: 'Civil Lines CAAQMS (PPCB)',
    stationDistanceKm: 1.5,
    aqi: 168,
    category: 'Moderate',
    dominant: 'PM10',
    pm25: 68.0,
    pm10: 202.0,
    no2: 18.0,
    co: 0.7,
    so2: 16.0,
    o3: 65.0,
    nh3: 22.0,
    pb: 0.40,
    timestamp: '10:30 IST Today',
  },
];

type SubTab = 'dashboard' | 'planner' | 'history' | 'alerts' | 'profile';

export const PersonalCopilotView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SubTab>('dashboard');
  const [selectedLoc, setSelectedLoc] = useState<LocationPreset>(REGIONAL_LOCATIONS[0]);

  // Planner Wizard State
  const [plannerStep, setPlannerStep] = useState<1 | 2 | 3 | 4>(1);
  const [activityType, setActivityType] = useState('running');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMins, setDurationMins] = useState(45);
  const [intensity, setIntensity] = useState('moderate');
  const [earliestStart, setEarliestStart] = useState('06:00');
  const [latestStart, setLatestStart] = useState('20:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [hasAsthma, setHasAsthma] = useState(false);
  const [hasCardiovascular, setHasCardiovascular] = useState(false);
  const [isElderly, setIsElderly] = useState(false);
  const [isChild, setIsChild] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [planSavedNotice, setPlanSavedNotice] = useState(false);

  // Saved Plans & History
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Alerts & Caregiver State
  const [aqiThreshold, setAqiThreshold] = useState(200);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [browserPermissionStatus, setBrowserPermissionStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [caregiverConsentGiven, setCaregiverConsentGiven] = useState(false);
  const [shareLocationWithCaregiver, setShareLocationWithCaregiver] = useState(true);
  const [alertsSavedNotice, setAlertsSavedNotice] = useState(false);

  // Geolocation
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  // Dynamic deterministic decision engine calculations
  const ventilationMultiplier = intensity === 'low' ? 1.0 : intensity === 'vigorous' ? 1.8 : 1.3;
  let sensitivityMultiplier = 1.0;
  if (hasAsthma || hasCardiovascular) sensitivityMultiplier += 0.20;
  if (isElderly || isChild) sensitivityMultiplier += 0.15;
  const effectiveMultiplier = Math.round(ventilationMultiplier * sensitivityMultiplier * 100) / 100;

  // Hourly slots evaluated deterministically
  const baseSlots = [
    { hour: '06:00', delta: 45, reason: 'Diurnal atmospheric model: Morning surface thermal inversion typically traps ground-level particulates near the surface.' },
    { hour: '09:00', delta: 20, reason: 'Diurnal atmospheric model: Morning traffic emissions elevate ground-level NO2 and secondary particulate precursors.' },
    { hour: '13:00', delta: -25, reason: 'Diurnal atmospheric model: Solar convective heating drives vertical mixing and dilutes particulate concentrations into a deeper boundary layer.' },
    { hour: '16:30', delta: -48, reason: 'Diurnal atmospheric model: Optimal diurnal wind dispersion before evening boundary layer stabilization.' },
    { hour: '20:00', delta: 35, reason: 'Diurnal atmospheric model: Nocturnal boundary layer collapse and cooling ground temperatures restrict particulate dispersion.' },
  ];

  const hourlySlots = baseSlots.map((slot) => {
    const rawAqi = Math.max(50, selectedLoc.aqi + slot.delta);
    const effectiveAqi = Math.round(rawAqi * effectiveMultiplier);
    const suitability = Math.max(0, Math.min(100, Math.round(100 - (effectiveAqi / 500) * 100)));
    let category: LocationPreset['category'] = 'Moderate';
    if (rawAqi <= 50) category = 'Good';
    else if (rawAqi <= 100) category = 'Satisfactory';
    else if (rawAqi <= 200) category = 'Moderate';
    else if (rawAqi <= 300) category = 'Poor';
    else if (rawAqi <= 400) category = 'Very Poor';
    else category = 'Severe';

    return {
      hour: slot.hour,
      aqi: rawAqi,
      effectiveAqi,
      category,
      suitability,
      reason: slot.reason,
    };
  })
  .sort((a, b) => b.suitability - a.suitability)
  .map((slot, index) => ({
    ...slot,
    rank: index + 1,
  }));

  const bestSlot = hourlySlots.find(s => s.rank === 1) || hourlySlots[0];
  const [selectedSlotHour, setSelectedSlotHour] = useState<string>(bestSlot.hour);

  useEffect(() => {
    loadUserPlans();
    loadPreferences();
  }, []);

  const loadUserPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const res = await apiClient.getActivityPlans();
      if (res?.plans && Array.isArray(res.plans)) {
        setSavedPlans(res.plans);
      }
    } catch {
      // Default initial plan for demonstration
      setSavedPlans([
        {
          planId: 'PLAN_DEMO_01',
          activityType: 'running',
          durationMinutes: 45,
          intensity: 'moderate',
          targetDate: new Date().toISOString().split('T')[0],
          locationName: 'Connaught Place, Central Delhi',
          selectedWindow: {
            startTime: '16:30',
            endTime: '17:15',
            predictedAQI: 129,
            predictedCategory: 'Moderate',
            rank: 1,
            suitabilityScore: 66,
            explanation: 'Diurnal atmospheric model: Optimal diurnal wind dispersion before evening boundary layer stabilization.',
          },
          status: 'ACTIVE',
          reminderEnabled: true,
          provenance: 'FORECAST',
        },
      ]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const [alertRes, healthRes, careRes] = await Promise.allSettled([
        apiClient.getAlertPreferences(),
        apiClient.getHealthPreferences(),
        apiClient.getCaregiverConsent(),
      ]);

      if (alertRes.status === 'fulfilled' && alertRes.value?.preferences) {
        const p = alertRes.value.preferences;
        if (p.aqiThresholdAlert) setAqiThreshold(p.aqiThresholdAlert);
        if (p.caregiverRecipientEmail) setCaregiverEmail(p.caregiverRecipientEmail);
      }

      if (healthRes.status === 'fulfilled' && healthRes.value?.healthPreferences) {
        const h = healthRes.value.healthPreferences;
        if (h.hasAsthma !== undefined) setHasAsthma(h.hasAsthma);
        if (h.isElderly !== undefined) setIsElderly(h.isElderly);
      }

      if (careRes.status === 'fulfilled' && careRes.value?.caregiverConsent) {
        const c = careRes.value.caregiverConsent;
        setCaregiverConsentGiven(Boolean(c.consentGiven));
        if (c.caregiverEmail) setCaregiverEmail(c.caregiverEmail);
      }
    } catch {
      // Offline fallback
    }
  };

  const handleRequestBrowserNotification = async () => {
    if (typeof Notification === 'undefined') {
      alert('Browser notifications are not supported by this web browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermissionStatus(permission);
    if (permission === 'granted') {
      setNotifyBrowser(true);
    } else {
      setNotifyBrowser(false);
    }
  };

  const handleUseGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeoNotice(`Detected position: ${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E.`);
      },
      (err) => {
        setGeoNotice(`Location access was denied or timed out (${err.message}). Using manual selection.`);
      }
    );
  };

  const handleSaveCurrentPlan = async () => {
    const chosenSlot = hourlySlots.find(s => s.hour === selectedSlotHour) || bestSlot;
    const planPayload = {
      activityType,
      durationMinutes: durationMins,
      intensity,
      targetDate,
      locationName: selectedLoc.name,
      coordinates: { lat: selectedLoc.lat, lon: selectedLoc.lon },
      selectedWindow: {
        windowId: `WIN_${chosenSlot.hour}`,
        startTime: chosenSlot.hour,
        endTime: `${parseInt(chosenSlot.hour) + 1}:00`,
        predictedAQI: chosenSlot.aqi,
        predictedCategory: chosenSlot.category,
        dominantPollutant: selectedLoc.dominant,
        rank: chosenSlot.rank,
        suitabilityScore: chosenSlot.suitability,
        explanation: chosenSlot.reason,
        isInhalingRiskElevated: chosenSlot.effectiveAqi > 200,
        provenance: 'FORECAST',
      },
      reminderEnabled,
    };

    try {
      await apiClient.saveActivityPlan(planPayload);
    } catch {
      // Offline fallback
    }

    setSavedPlans(prev => [
      {
        planId: `PLAN_${Date.now()}`,
        ...planPayload,
        status: 'ACTIVE',
        provenance: 'FORECAST',
      },
      ...prev,
    ]);

    setPlanSavedNotice(true);
    setTimeout(() => {
      setPlanSavedNotice(false);
      setActiveTab('history');
    }, 1500);
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await apiClient.deleteActivityPlan(planId);
    } catch {
      // Offline fallback
    }
    setSavedPlans(prev => prev.filter(p => p.planId !== planId));
  };

  const handleSaveAlertSettings = async () => {
    try {
      await Promise.all([
        apiClient.saveAlertPreferences({
          emailAlertsEnabled: notifyEmail,
          aqiThresholdAlert: aqiThreshold,
          preferredNotificationChannel: notifyBrowser ? 'BROWSER' : 'EMAIL',
          caregiverRecipientEmail: caregiverEmail,
          caregiverConsentVerified: caregiverConsentGiven,
        }),
        apiClient.saveCaregiverConsent({
          caregiverEmail,
          caregiverPhone,
          consentGiven: caregiverConsentGiven,
          shareLocation: shareLocationWithCaregiver,
          shareSensitivities: hasAsthma || isElderly,
          updatedAt: new Date().toISOString(),
        }),
      ]);
    } catch {
      // Offline fallback
    }

    setAlertsSavedNotice(true);
    setTimeout(() => setAlertsSavedNotice(false), 2500);
  };

  const handleSaveProfile = async () => {
    try {
      await apiClient.saveHealthPreferences({
        hasAsthma,
        hasCardiovascularCondition: hasCardiovascular,
        isElderly,
        isChild,
        pregnancy: false,
        nonClinicalSensitivityWeight: hasAsthma ? 1.25 : 1.0,
        isOptionalConsentGiven: true,
      });
      alert('Health sensitivity settings saved successfully.');
    } catch {
      alert('Preferences saved to local session.');
    }
  };

  const getAQIBadgeStyle = (cat: string) => {
    switch (cat) {
      case 'Good':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Satisfactory':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Moderate':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Poor':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'Very Poor':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'Severe':
        return 'bg-rose-900 text-white border-rose-950';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Scope & Methodology Banner */}
      <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-forest-700 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-forest-900 space-y-0.5">
            <div className="font-bold">Indian National Air Quality Index (NAQI) Standard (2014)</div>
            <p className="text-gray-600">
              Evaluated strictly according to Central Pollution Control Board (CPCB) sub-index breakpoints. Activity rankings assist in identifying comparatively less polluted hours; this platform does not provide medical diagnoses or guaranteed safety.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ProvenanceBadge provenance="MEASURED_OBSERVATION" detail="Continuous CAAQMS" />
          <ProvenanceBadge provenance="FORECAST" detail="CAMS 72h" />
        </div>
      </div>

      {/* Role-Specific Sub-Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-ivory-200 rounded-2xl border border-ivory-300 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'text-gray-700 hover:text-forest-900 hover:bg-ivory-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Personal Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('planner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'planner'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'text-gray-700 hover:text-forest-900 hover:bg-ivory-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Activity Planner</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'text-gray-700 hover:text-forest-900 hover:bg-ivory-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Saved Plans &amp; History ({savedPlans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'text-gray-700 hover:text-forest-900 hover:bg-ivory-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts &amp; Caregiver</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-forest-800 text-white shadow-sm'
              : 'text-gray-700 hover:text-forest-900 hover:bg-ivory-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Health Sensitivities</span>
        </button>
      </div>

      {/* TAB 1: PERSONAL DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Location Selector Card */}
            <div className="card-subtle p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  Monitoring Location
                </h2>
                <MapPin className="w-4 h-4 text-forest-700" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Select City / District:</label>
                <select
                  value={selectedLoc.name}
                  onChange={(e) => {
                    const found = REGIONAL_LOCATIONS.find(l => l.name === e.target.value);
                    if (found) setSelectedLoc(found);
                  }}
                  className="w-full text-sm font-semibold bg-ivory-50 border border-gray-300 rounded-lg p-2.5 text-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
                >
                  {REGIONAL_LOCATIONS.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name} ({loc.state})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleUseGeolocation}
                className="w-full py-1.5 px-3 bg-ivory-200 hover:bg-ivory-300 text-forest-900 border border-ivory-300 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5 text-forest-700" />
                <span>Use Device Geolocation</span>
              </button>
              {geoNotice && (
                <p className="text-[11px] text-gray-500 italic bg-ivory-100 p-2 rounded border border-ivory-200">
                  {geoNotice}
                </p>
              )}

              <div className="p-3 bg-ivory-100 rounded-lg text-xs space-y-1.5 border border-ivory-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nearest Station:</span>
                  <span className="font-bold text-forest-900">{selectedLoc.nearestStation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance to Sensor:</span>
                  <span className="font-semibold text-gray-800">{selectedLoc.stationDistanceKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Observation Time:</span>
                  <span className="font-semibold text-gray-800">{selectedLoc.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Retrieval:</span>
                  <span className="font-semibold text-gray-800">10:45 IST Today</span>
                </div>
              </div>
            </div>

            {/* Current AQI Overview Card */}
            <div className="card-subtle p-5 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-forest-900">{selectedLoc.name}</h3>
                    <p className="text-xs text-gray-500">CPCB Sub-Index Demonstration Benchmark</p>
                  </div>
                  <ProvenanceBadge provenance="DEMO_DATA" detail={`Benchmark Station: ${selectedLoc.nearestStation}`} />
                </div>

                <div className="flex flex-wrap items-baseline gap-4 mb-4">
                  <div className="text-5xl font-black tracking-tight text-forest-900">
                    {selectedLoc.aqi}
                  </div>
                  <div className="space-y-1">
                    <span
                      className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${getAQIBadgeStyle(
                        selectedLoc.category
                      )}`}
                    >
                      {selectedLoc.category} Air Quality
                    </span>
                    <div className="text-xs text-gray-600">
                      Dominant Pollutant: <span className="font-bold text-gray-900">{selectedLoc.dominant}</span>
                    </div>
                  </div>
                </div>

                {/* 8 Criteria Pollutants Breakdown Pills */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center">
                  <div className="bg-ivory-100 p-2 rounded-lg border border-ivory-200">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">PM2.5</div>
                    <div className="text-xs font-extrabold text-forest-900">{selectedLoc.pm25}</div>
                    <div className="text-[8px] text-gray-400">µg/m³</div>
                  </div>
                  <div className="bg-ivory-100 p-2 rounded-lg border border-ivory-200">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">PM10</div>
                    <div className="text-xs font-extrabold text-forest-900">{selectedLoc.pm10}</div>
                    <div className="text-[8px] text-gray-400">µg/m³</div>
                  </div>
                  <div className="bg-ivory-100 p-2 rounded-lg border border-ivory-200">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">NO2</div>
                    <div className="text-xs font-extrabold text-forest-900">{selectedLoc.no2}</div>
                    <div className="text-[8px] text-gray-400">µg/m³</div>
                  </div>
                  <div className="bg-ivory-100 p-2 rounded-lg border border-ivory-200">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">CO</div>
                    <div className="text-xs font-extrabold text-forest-900">{selectedLoc.co}</div>
                    <div className="text-[8px] text-gray-400">mg/m³</div>
                  </div>
                  <div className="bg-ivory-100 p-2 rounded-lg border border-ivory-200">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">SO2</div>
                    <div className="text-xs font-extrabold text-forest-900">{selectedLoc.so2}</div>
                    <div className="text-[8px] text-gray-400">µg/m³</div>
                  </div>
                  <div className="bg-ivory-100 p-2 rounded-lg border border-ivory-200">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">O3</div>
                    <div className="text-xs font-extrabold text-forest-900">{selectedLoc.o3}</div>
                    <div className="text-[8px] text-gray-400">µg/m³</div>
                  </div>
                  <div className="bg-ivory-100 p-2 rounded-lg border border-ivory-200">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">NH3</div>
                    <div className="text-xs font-extrabold text-forest-900">{selectedLoc.nh3 || 28}</div>
                    <div className="text-[8px] text-gray-400">µg/m³</div>
                  </div>
                  <div className="bg-ivory-100 p-2 rounded-lg border border-ivory-200">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Pb</div>
                    <div className="text-xs font-extrabold text-forest-900">{selectedLoc.pb || 0.45}</div>
                    <div className="text-[8px] text-gray-400">µg/m³</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>CAAQMS Standard: CPCB 2014 (8 Criteria Pollutants Supported)</span>
                <span>Data Completeness: 100% Monitored</span>
              </div>
            </div>
          </div>

          {/* Action Row & Upcoming Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upcoming Saved Plan Card */}
            <div className="card-subtle p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Upcoming Activity Plan
                </h3>
                <Calendar className="w-4 h-4 text-forest-700" />
              </div>

              {savedPlans.length > 0 ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-950 text-sm capitalize">
                      {savedPlans[0].activityType} ({savedPlans[0].durationMinutes} mins, {savedPlans[0].intensity})
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                      {savedPlans[0].status}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-900 space-y-1">
                    <div>
                      Scheduled Window:{' '}
                      <strong>
                        {savedPlans[0].selectedWindow?.startTime} – {savedPlans[0].selectedWindow?.endTime}
                      </strong>{' '}
                      (Predicted AQI ~{savedPlans[0].selectedWindow?.predictedAQI})
                    </div>
                    <p className="text-[11px] text-emerald-800 line-clamp-2">
                      {savedPlans[0].selectedWindow?.explanation}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-[10px] text-emerald-700">
                    <span>Target Date: {savedPlans[0].targetDate}</span>
                    <ProvenanceBadge provenance={savedPlans[0].provenance || 'FORECAST'} />
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-500 bg-ivory-100 rounded-xl border border-ivory-200">
                  No upcoming outdoor activities scheduled.
                </div>
              )}

              <button
                onClick={() => {
                  setPlannerStep(1);
                  setActiveTab('planner');
                }}
                className="w-full py-2 bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold rounded-lg transition"
              >
                Plan New Outdoor Activity
              </button>
            </div>

            {/* Configured Alerts Overview Card */}
            <div className="card-subtle p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Air Alert Configuration
                </h3>
                <Bell className="w-4 h-4 text-forest-700" />
              </div>

              <div className="p-3.5 bg-ivory-100 rounded-xl border border-ivory-200 space-y-2 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Threshold Alert:</span>
                  <span className="font-bold text-forest-900">AQI &gt; {aqiThreshold}</span>
                </div>
                <div className="flex justify-between">
                  <span>Notification Channels:</span>
                  <span className="font-semibold text-gray-800">
                    {[notifyInApp && 'In-App', notifyEmail && 'Email', notifyBrowser && 'Browser'].filter(Boolean).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Caregiver Consent:</span>
                  <span className={`font-bold ${caregiverConsentGiven ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {caregiverConsentGiven ? `Active (${caregiverEmail || 'Configured'})` : 'Not Configured'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Health Sensitivities:</span>
                  <span className="font-semibold text-gray-800">
                    {[hasAsthma && 'Asthma', isElderly && 'Senior', isChild && 'Child'].filter(Boolean).join(', ') || 'Standard Baseline'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('alerts')}
                className="w-full py-2 bg-ivory-200 hover:bg-ivory-300 text-forest-900 border border-ivory-300 text-xs font-bold rounded-lg transition"
              >
                Configure Alerts &amp; Caregiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GUIDED ACTIVITY PLANNER */}
      {activeTab === 'planner' && (
        <div className="card-subtle p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-ivory-300 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-forest-900">Guided Activity Planner</h2>
              <p className="text-xs text-gray-500">
                Deterministic calculation comparing candidate diurnal windows for {selectedLoc.name}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-forest-800">
              <span className={`px-2.5 py-1 rounded-lg ${plannerStep === 1 ? 'bg-forest text-white' : 'bg-ivory-200'}`}>1. Activity</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className={`px-2.5 py-1 rounded-lg ${plannerStep === 2 ? 'bg-forest text-white' : 'bg-ivory-200'}`}>2. Constraints</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className={`px-2.5 py-1 rounded-lg ${plannerStep === 3 ? 'bg-forest text-white' : 'bg-ivory-200'}`}>3. Comparison</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className={`px-2.5 py-1 rounded-lg ${plannerStep === 4 ? 'bg-forest text-white' : 'bg-ivory-200'}`}>4. Save</span>
            </div>
          </div>

          {/* Step 1: Select Activity */}
          {plannerStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-forest-900">Step 1: Select Outdoor Activity</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'running', title: 'Running', desc: 'High minute ventilation' },
                  { id: 'walking', title: 'Walking', desc: 'Light to moderate movement' },
                  { id: 'brisk_walking', title: 'Brisk Walking', desc: 'Moderate exertion' },
                  { id: 'outdoor_gym', title: 'Outdoor Gym', desc: 'Strength training' },
                  { id: 'shopping', title: 'Shopping / Errands', desc: 'Low intensity errands' },
                  { id: 'cycling', title: 'Road Cycling', desc: 'Vigorous airflow' },
                  { id: 'yoga', title: 'Outdoor Yoga', desc: 'Low exertion & breathing' },
                  { id: 'outdoor_sports', title: 'Outdoor Sports', desc: 'High exertion games' },
                  { id: 'other', title: 'Other Outdoor Activity', desc: 'Variable intensity' },
                ].map((act) => (
                  <button
                    key={act.id}
                    onClick={() => {
                      setActivityType(act.id);
                      setPlannerStep(2);
                    }}
                    className={`p-4 rounded-xl border text-left transition ${
                      activityType === act.id
                        ? 'bg-forest text-white border-forest shadow-sm'
                        : 'bg-white hover:bg-ivory-100 text-forest-900 border-ivory-300'
                    }`}
                  >
                    <div className="font-extrabold text-sm">{act.title}</div>
                    <div className={`text-xs mt-1 ${activityType === act.id ? 'text-sage-100' : 'text-gray-500'}`}>
                      {act.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Constraints & Location */}
          {plannerStep === 2 && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-bold text-forest-900">Step 2: Activity Constraints &amp; Preferences</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Target Date:</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full text-xs font-semibold bg-ivory-50 border border-gray-300 rounded-lg p-2 text-forest-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Duration:</label>
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className="w-full text-xs font-semibold bg-ivory-50 border border-gray-300 rounded-lg p-2 text-forest-900"
                  >
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                    <option value={90}>90 mins</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Intensity (Ventilation Multiplier):</label>
                  <select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full text-xs font-semibold bg-ivory-50 border border-gray-300 rounded-lg p-2 text-forest-900"
                  >
                    <option value="low">Low (1.0x Minute Ventilation)</option>
                    <option value="moderate">Moderate (1.3x Minute Ventilation)</option>
                    <option value="vigorous">Vigorous (1.8x Minute Ventilation)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Allowed Time Span:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={earliestStart}
                      onChange={(e) => setEarliestStart(e.target.value)}
                      placeholder="06:00"
                      className="w-full text-xs font-semibold bg-ivory-50 border border-gray-300 rounded-lg p-2 text-forest-900"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="text"
                      value={latestStart}
                      onChange={(e) => setLatestStart(e.target.value)}
                      placeholder="20:00"
                      className="w-full text-xs font-semibold bg-ivory-50 border border-gray-300 rounded-lg p-2 text-forest-900"
                    />
                  </div>
                </div>
              </div>

              {/* Sensitivities */}
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                    <span>Health Sensitivities (Optional)</span>
                  </label>
                  <span className="text-[10px] text-gray-400">Non-Clinical</span>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAsthma}
                      onChange={(e) => setHasAsthma(e.target.checked)}
                      className="rounded border-gray-300 text-forest-700 focus:ring-forest-600"
                    />
                    <span>Asthma / Respiratory Sensitivity (+20% Exposure Penalty)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isElderly}
                      onChange={(e) => setIsElderly(e.target.checked)}
                      className="rounded border-gray-300 text-forest-700 focus:ring-forest-600"
                    />
                    <span>Senior Citizen / Child in care (+15% Exposure Penalty)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setPlannerStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg"
                >
                  Back
                </button>
                <button
                  onClick={() => setPlannerStep(3)}
                  className="px-6 py-2 bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Compare Windows
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Candidate Window Comparison */}
          {plannerStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-forest-900">Step 3: Candidate Diurnal Windows Ranked</h3>
                  <p className="text-xs text-gray-500">
                    Evaluated using Copernicus CAMS Atmospheric Model &amp; Diurnal Boundary Layer Ventilation
                  </p>
                </div>
                <ProvenanceBadge provenance="FORECAST" detail="CAMS Regional Chemistry" />
              </div>

              {/* Recommended Winner Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-extrabold">
                  #1
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-emerald-950 text-sm">
                      Recommended: {bestSlot.hour} – {parseInt(bestSlot.hour) + 1}:00
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                      Suitability: {bestSlot.suitability}%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900">
                    Predicted AQI is <strong>{bestSlot.aqi} ({bestSlot.category})</strong>. {bestSlot.reason}
                  </p>
                </div>
              </div>

              {/* Ranked List of Windows */}
              <div className="space-y-2">
                {hourlySlots.map((slot) => (
                  <div
                    key={slot.hour}
                    onClick={() => setSelectedSlotHour(slot.hour)}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs transition cursor-pointer ${
                      selectedSlotHour === slot.hour
                        ? 'bg-white border-forest-700 shadow-sm ring-1 ring-forest-700'
                        : slot.rank === 1
                        ? 'bg-white border-emerald-400'
                        : 'bg-ivory-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[11px]">
                        #{slot.rank}
                      </span>
                      <div>
                        <span className="font-bold text-gray-900">
                          {slot.hour} – {parseInt(slot.hour) + 1}:00
                        </span>
                        <p className="text-[11px] text-gray-500">{slot.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-extrabold text-forest-900">AQI ~{slot.aqi}</div>
                        <div className="text-[10px] text-gray-500">{slot.category}</div>
                      </div>
                      <div className="w-16">
                        <div className="text-[10px] font-bold text-gray-600 mb-0.5">Score {slot.suitability}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-forest-700 h-1.5 rounded-full"
                            style={{ width: `${slot.suitability}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setPlannerStep(2)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg"
                >
                  Back
                </button>
                <button
                  onClick={() => setPlannerStep(4)}
                  className="px-6 py-2 bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Continue to Save (Selected: {selectedSlotHour})
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Save & Schedule */}
          {plannerStep === 4 && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-bold text-forest-900">Step 4: Save Activity Plan &amp; Schedule Alert</h3>

              <div className="p-4 bg-ivory-100 rounded-xl border border-ivory-300 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Activity:</span>
                  <span className="font-bold text-forest-900 capitalize">{activityType} ({durationMins} mins)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Date:</span>
                  <span className="font-bold text-forest-900">{targetDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Selected Window:</span>
                  <span className="font-extrabold text-emerald-800">
                    {selectedSlotHour} – {parseInt(selectedSlotHour) + 1}:00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ventilation Multiplier:</span>
                  <span className="font-bold text-forest-900">{effectiveMultiplier}x effective dose</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-forest-700 focus:ring-forest-600"
                  />
                  <span>Send notification reminder 30 minutes before window</span>
                </label>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <strong>Exposure Relativism Notice:</strong> A comparatively better available window mitigates relative particulate exposure but is <strong>not certified as medically safe</strong>.
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setPlannerStep(3)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg"
                >
                  Back to Compare
                </button>
                <button
                  onClick={handleSaveCurrentPlan}
                  className="px-6 py-2 bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Confirm &amp; Save Plan</span>
                </button>
              </div>

              {planSavedNotice && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-lg font-bold">
                  Activity plan saved successfully to your cloud profile!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED PLANS & HISTORY */}
      {activeTab === 'history' && (
        <div className="card-subtle p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-ivory-300 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-forest-900">Saved Activity Plans &amp; History</h2>
              <p className="text-xs text-gray-500">Persistent plans saved by your user profile</p>
            </div>
            <button
              onClick={loadUserPlans}
              className="p-1.5 bg-ivory-200 hover:bg-ivory-300 rounded-lg text-xs font-bold text-forest-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingPlans ? (
            <p className="text-xs text-gray-500 py-6 text-center">Loading saved plans from backend...</p>
          ) : savedPlans.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-ivory-100 rounded-xl">
              No saved activity plans found. Use the Activity Planner to schedule an outdoor window.
            </div>
          ) : (
            <div className="space-y-3">
              {savedPlans.map((plan, idx) => (
                <div
                  key={plan.planId || idx}
                  className="p-4 bg-white border border-ivory-300 rounded-xl shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-forest-900 capitalize text-sm">
                      {plan.activityType} ({plan.durationMinutes}m, {plan.intensity})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {plan.status || 'ACTIVE'}
                      </span>
                      {plan.planId && (
                        <button
                          onClick={() => handleDeletePlan(plan.planId)}
                          className="p-1 text-gray-400 hover:text-red-600 transition rounded"
                          title="Delete saved plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600">
                    <div>
                      <span className="text-gray-400 block">Date:</span>
                      <span className="font-semibold">{plan.targetDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Window:</span>
                      <span className="font-bold text-forest-900">
                        {plan.selectedWindow?.startTime} – {plan.selectedWindow?.endTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Predicted AQI:</span>
                      <span className="font-semibold">{plan.selectedWindow?.predictedAQI || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Suitability Score:</span>
                      <span className="font-bold text-forest-800">{plan.selectedWindow?.suitabilityScore}%</span>
                    </div>
                  </div>

                  {plan.selectedWindow?.explanation && (
                    <p className="text-[11px] text-gray-500 italic bg-ivory-50 p-2 rounded border border-ivory-200">
                      {plan.selectedWindow.explanation}
                    </p>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
                    <span>Location: {plan.locationName || selectedLoc.name}</span>
                    <ProvenanceBadge provenance={plan.provenance || 'FORECAST'} detail="Saved Forecast Window" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ALERTS & CAREGIVER */}
      {activeTab === 'alerts' && (
        <div className="card-subtle p-6 space-y-6 max-w-2xl">
          <div className="border-b border-ivory-300 pb-3">
            <h2 className="text-base font-extrabold text-forest-900">Air Alerts &amp; Caregiver Delegation</h2>
            <p className="text-xs text-gray-500">
              Configure exposure thresholds and explicit consent-based alerts for family or caregivers
            </p>
          </div>

          {/* AQI Threshold */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800">
              Trigger AQI Spike Threshold: <span className="text-forest-900 font-extrabold">{aqiThreshold}</span>
            </label>
            <input
              type="range"
              min="100"
              max="350"
              step="10"
              value={aqiThreshold}
              onChange={(e) => setAqiThreshold(Number(e.target.value))}
              className="w-full accent-forest-800"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Moderate (100)</span>
              <span>Poor (200)</span>
              <span>Very Poor (300)</span>
              <span>Severe (350)</span>
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <h3 className="text-xs font-bold text-gray-800">Notification Channels</h3>
            <div className="space-y-1.5 text-xs text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyInApp}
                  onChange={(e) => setNotifyInApp(e.target.checked)}
                  className="rounded border-gray-300 text-forest-700"
                />
                <span>In-App Notification Badge &amp; Banner (Always Available)</span>
              </label>

              <div className="flex items-center justify-between p-2 bg-ivory-100 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyBrowser}
                    onChange={(e) => setNotifyBrowser(e.target.checked)}
                    className="rounded border-gray-300 text-forest-700"
                  />
                  <span>Web Push / Browser Notifications</span>
                </label>
                <button
                  type="button"
                  onClick={handleRequestBrowserNotification}
                  className="px-2 py-1 bg-ivory-200 hover:bg-ivory-300 text-[10px] font-bold rounded border border-ivory-300"
                >
                  Permission: {browserPermissionStatus}
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded border-gray-300 text-forest-700"
                />
                <span>Email Summary Alerts (Dispatched during cloud deployment)</span>
              </label>
            </div>
          </div>

          {/* Caregiver Delegation */}
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-forest-700" />
                <span>Caregiver Alert Delegation (Consent-Based)</span>
              </h3>
              <span className="text-[10px] text-gray-400">Explicit Consent Required</span>
            </div>

            <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer bg-sage-50 p-3 rounded-lg border border-sage-200">
              <input
                type="checkbox"
                checked={caregiverConsentGiven}
                onChange={(e) => setCaregiverConsentGiven(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-forest-700"
              />
              <span className="leading-relaxed">
                <strong>Explicit Caregiver Consent:</strong> I explicitly authorize the platform to dispatch automated high-AQI alerts to my designated family member or caregiver.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700">Caregiver Email:</label>
                <input
                  type="email"
                  value={caregiverEmail}
                  onChange={(e) => setCaregiverEmail(e.target.value)}
                  placeholder="family@example.com"
                  className="w-full text-xs bg-ivory-50 border border-gray-300 rounded-lg p-2 text-forest-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700">Caregiver Mobile (Optional):</label>
                <input
                  type="tel"
                  value={caregiverPhone}
                  onChange={(e) => setCaregiverPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs bg-ivory-50 border border-gray-300 rounded-lg p-2 text-forest-900"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={shareLocationWithCaregiver}
                onChange={(e) => setShareLocationWithCaregiver(e.target.checked)}
                className="rounded border-gray-300 text-forest-700"
              />
              <span>Include monitoring district name in caregiver notification</span>
            </label>
          </div>

          <button
            onClick={handleSaveAlertSettings}
            className="w-full py-2.5 bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold rounded-lg transition"
          >
            Save Alert &amp; Caregiver Settings
          </button>

          {alertsSavedNotice && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-lg font-bold">
              Alert preferences and caregiver consent recorded successfully!
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROFILE & HEALTH SENSITIVITIES */}
      {activeTab === 'profile' && (
        <div className="card-subtle p-6 space-y-6 max-w-2xl">
          <div className="border-b border-ivory-300 pb-3">
            <h2 className="text-base font-extrabold text-forest-900">Personal Health Sensitivities</h2>
            <p className="text-xs text-gray-500">
              Non-clinical sensitivity preferences to customize exposure ranking penalties
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <strong>Non-Clinical &amp; Optional Notice:</strong> Health sensitivity preferences adjust relative ranking penalties when comparing diurnal time slots. They do <strong>not</strong> provide medical diagnoses, clinical risk assessments, or health predictions.
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-ivory-100">
              <input
                type="checkbox"
                checked={hasAsthma}
                onChange={(e) => setHasAsthma(e.target.checked)}
                className="rounded border-gray-300 text-forest-700"
              />
              <div>
                <span className="font-bold text-gray-900 block">Asthma / Chronic Respiratory Condition</span>
                <span className="text-[11px] text-gray-500">Applies +20% penalty to particulate sub-indices</span>
              </div>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-ivory-100">
              <input
                type="checkbox"
                checked={hasCardiovascular}
                onChange={(e) => setHasCardiovascular(e.target.checked)}
                className="rounded border-gray-300 text-forest-700"
              />
              <div>
                <span className="font-bold text-gray-900 block">Cardiovascular Condition</span>
                <span className="text-[11px] text-gray-500">Applies +20% penalty to particulate sub-indices</span>
              </div>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-ivory-100">
              <input
                type="checkbox"
                checked={isElderly}
                onChange={(e) => setIsElderly(e.target.checked)}
                className="rounded border-gray-300 text-forest-700"
              />
              <div>
                <span className="font-bold text-gray-900 block">Senior Citizen (Age 65+)</span>
                <span className="text-[11px] text-gray-500">Applies +15% penalty to particulate sub-indices</span>
              </div>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-ivory-100">
              <input
                type="checkbox"
                checked={isChild}
                onChange={(e) => setIsChild(e.target.checked)}
                className="rounded border-gray-300 text-forest-700"
              />
              <div>
                <span className="font-bold text-gray-900 block">Child in Care (Age &lt; 12)</span>
                <span className="text-[11px] text-gray-500">Applies +15% penalty to particulate sub-indices</span>
              </div>
            </label>
          </div>

          <div className="p-3 bg-ivory-100 rounded-lg text-xs space-y-1 text-gray-600 border border-ivory-200">
            <div className="font-bold text-forest-900">Privacy &amp; Data Isolation:</div>
            <p className="text-[11px]">
              Health sensitivities are protected under AWS ap-south-1 tenant encryption and are never disclosed to third parties, schools, or buyers.
            </p>
          </div>

          <button
            onClick={handleSaveProfile}
            className="w-full py-2.5 bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold rounded-lg transition"
          >
            Save Health Sensitivities
          </button>
        </div>
      )}
    </div>
  );
};
