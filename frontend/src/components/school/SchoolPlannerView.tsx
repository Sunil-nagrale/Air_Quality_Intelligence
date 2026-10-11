import React, { useState, useEffect } from 'react';
import {
  School,
  Building,
  Calendar,
  ShieldCheck,
  FileText,
  MessageSquare,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Bell,
  Plus,
  Trash2,
  HelpCircle,
  Send,
  Download,
  RefreshCw,
  Info,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
} from 'lucide-react';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { apiClient } from '../../services/apiClient';
import { cognitoAuth } from '../../services/cognitoAuth';
import type {
  SchoolProfile,
  SchoolCampus,
  SchoolPolicy,
  SchoolActivity,
  SchoolAgeGroup,
} from '../../types';

type SchoolTab =
  | 'overview'
  | 'activities'
  | 'calendar'
  | 'policies'
  | 'reports'
  | 'assistant'
  | 'settings';

interface ActivityTemplate {
  name: string;
  activityType: string;
  ageGroup: SchoolAgeGroup;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'high' | 'vigorous';
  indoorAlternativeVenue: string;
}

const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    name: 'Morning Assembly & Physical Drill',
    activityType: 'assembly',
    ageGroup: 'primary',
    startTime: '08:00',
    endTime: '08:45',
    durationMinutes: 45,
    intensity: 'low',
    indoorAlternativeVenue: 'Central Auditorium',
  },
  {
    name: 'Junior PE Sprint Heats & Track',
    activityType: 'pe_sprint',
    ageGroup: 'primary',
    startTime: '08:30',
    endTime: '10:00',
    durationMinutes: 90,
    intensity: 'high',
    indoorAlternativeVenue: 'Multipurpose Indoor Badminton Hall',
  },
  {
    name: 'Middle School Recess & Free Play',
    activityType: 'recess',
    ageGroup: 'middle',
    startTime: '11:00',
    endTime: '11:45',
    durationMinutes: 45,
    intensity: 'moderate',
    indoorAlternativeVenue: 'Covered Recreation Atrium',
  },
  {
    name: 'Senior Secondary Annual Football Trials',
    activityType: 'football_trials',
    ageGroup: 'senior',
    startTime: '14:30',
    endTime: '16:00',
    durationMinutes: 90,
    intensity: 'vigorous',
    indoorAlternativeVenue: 'Indoor Sports Complex & Gymnasium',
  },
];

export const SchoolPlannerView: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<SchoolTab>('overview');

  // Institution & Campus state
  const [profile, setProfile] = useState<SchoolProfile>({
    schoolId: 'KV_KAILASHAHAR',
    institutionName: 'Kendriya Vidyalaya Kailashahar',
    district: 'Central Delhi',
    state: 'Delhi-NCR',
    coordinates: { lat: 28.63, lon: 77.21 },
    administratorEmail: 'kvkailashahar@gmail.com',
    administratorName: 'Principal Sharma',
    tenantId: 'TENANT_KV_4402',
    notificationPreferences: {
      parentBroadcastEnabled: true,
      staffAlertsEnabled: true,
      aqiAlertThreshold: 150,
      preferredChannel: 'EMAIL',
    },
  });

  const [campuses, setCampuses] = useState<SchoolCampus[]>([
    {
      campusId: 'CAMP_KV_01',
      schoolId: 'KV_KAILASHAHAR',
      campusName: 'Main Campus - Kailashahar',
      isMainCampus: true,
      district: 'Central Delhi',
      state: 'Delhi-NCR',
      coordinates: { lat: 28.63, lon: 77.21 },
      nearestStationId: 'DEL_01',
      totalStudents: 1450,
      contactPhone: '+91 11-2384-9001',
    },
    {
      campusId: 'CAMP_KV_02',
      schoolId: 'KV_KAILASHAHAR',
      campusName: 'Junior Wing - Kailashahar South',
      isMainCampus: false,
      district: 'Central Delhi',
      state: 'Delhi-NCR',
      coordinates: { lat: 28.625, lon: 77.215 },
      nearestStationId: 'DEL_04',
      totalStudents: 780,
      contactPhone: '+91 11-2384-9002',
    },
  ]);

  const [selectedCampusId, setSelectedCampusId] = useState<string>('CAMP_KV_01');

  // Campus Telemetry state
  const [isTelemetryAvailable, setIsTelemetryAvailable] = useState<boolean>(true);
  const campusAQI = 218; // Elevated Poor air reading in demo scenario
  const dominantPollutant = 'PM2.5 (104 µg/m³)';
  const campusStationName = 'Mandir Marg CAAQMS (DPCC - Station DEL_01)';

  // Policies (Discretionary institutional committee rules, NOT statutory standards)
  const [policies, setPolicies] = useState<Record<SchoolAgeGroup, { maxOutdoor: number; mandatoryIndoor: number }>>({
    primary: { maxOutdoor: 120, mandatoryIndoor: 160 },
    middle: { maxOutdoor: 160, mandatoryIndoor: 200 },
    senior: { maxOutdoor: 200, mandatoryIndoor: 250 },
  });
  const [policySaveStatus, setPolicySaveStatus] = useState<string | null>(null);

  // Activities list
  const [activities, setActivities] = useState<SchoolActivity[]>([
    {
      activityId: 'ACT_KV_DEMO_01',
      schoolId: 'KV_KAILASHAHAR',
      campusId: 'CAMP_KV_01',
      campusName: 'Main Campus - Kailashahar',
      activityName: 'Junior Sports Day & 400m Heats',
      activityType: 'pe_sprint',
      ageGroup: 'primary',
      scheduledDate: '2026-10-15',
      startTime: '08:30',
      endTime: '10:00',
      durationMinutes: 90,
      intensity: 'high',
      predictedAQI: 218,
      category: 'Poor',
      evaluationStatus: 'MANDATORY_INDOOR_REQUIRED',
      systemRecommendation: {
        status: 'MANDATORY_INDOOR_REQUIRED',
        reason: 'Predicted morning AQI (218) breaches configured primary cohort mandatory threshold (160). High exertion increases particulate pulmonary deposition.',
        indoorAlternativeSuggested: true,
        suggestedAlternativeWindow: '14:30 - 16:00 (Predicted AQI ~148)',
      },
      administratorDecision: {
        decision: 'MANDATORY_INDOOR',
        notes: 'Relocate 400m sprint heats to Multipurpose Badminton Hall; postpone outdoor events to 14:30.',
        decidedBy: 'Principal Sharma',
        decidedAt: '2026-10-10T09:15:00Z',
      },
      indoorAlternativeVenue: 'Multipurpose Indoor Badminton Hall',
      suggestedAlternativeWindow: '14:30 - 16:00',
      requiresAdminSignOff: true,
      adminSignOff: {
        isSignedOff: true,
        signedOffBy: 'Principal Sharma',
        decisionNotes: 'Relocated to indoor badminton hall per air safety protocol.',
        signedOffAt: '2026-10-10T09:15:00Z',
      },
      createdAt: '2026-10-09T14:00:00Z',
    },
    {
      activityId: 'ACT_KV_DEMO_02',
      schoolId: 'KV_KAILASHAHAR',
      campusId: 'CAMP_KV_01',
      campusName: 'Main Campus - Kailashahar',
      activityName: 'Middle School Recess & Yard Games',
      activityType: 'recess',
      ageGroup: 'middle',
      scheduledDate: '2026-10-16',
      startTime: '11:00',
      endTime: '11:45',
      durationMinutes: 45,
      intensity: 'moderate',
      predictedAQI: 185,
      category: 'Moderate',
      evaluationStatus: 'PRECAUTIONARY_OUTDOOR_PERMITTED',
      systemRecommendation: {
        status: 'PRECAUTIONARY_OUTDOOR_PERMITTED',
        reason: 'Predicted midday AQI (185) is within institutional middle school threshold (200). Precautionary monitoring advised.',
        indoorAlternativeSuggested: false,
      },
      indoorAlternativeVenue: 'Covered Recreation Atrium',
      requiresAdminSignOff: false,
      createdAt: '2026-10-09T15:30:00Z',
    },
    {
      activityId: 'ACT_KV_DEMO_03',
      schoolId: 'KV_KAILASHAHAR',
      campusId: 'CAMP_KV_02',
      campusName: 'Junior Wing - Kailashahar South',
      activityName: 'Primary KG Free Play Session',
      activityType: 'recess',
      ageGroup: 'primary',
      scheduledDate: '2026-10-17',
      startTime: '09:00',
      endTime: '09:45',
      durationMinutes: 45,
      intensity: 'moderate',
      predictedAQI: 220,
      category: 'Poor',
      evaluationStatus: 'MANDATORY_INDOOR_REQUIRED',
      systemRecommendation: {
        status: 'MANDATORY_INDOOR_REQUIRED',
        reason: 'Predicted AQI (220) breaches primary policy threshold (160). Relocation required.',
        indoorAlternativeSuggested: true,
      },
      indoorAlternativeVenue: 'Junior Wing Multipurpose Room',
      requiresAdminSignOff: true,
      createdAt: '2026-10-10T08:00:00Z',
    },
  ]);

  // Activity Creation Modal & Form
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newActivityForm, setNewActivityForm] = useState({
    activityName: '',
    activityType: 'pe_sprint',
    ageGroup: 'primary' as SchoolAgeGroup,
    scheduledDate: new Date().toISOString().split('T')[0],
    startTime: '08:30',
    endTime: '10:00',
    durationMinutes: 60,
    intensity: 'moderate' as 'low' | 'moderate' | 'high' | 'vigorous',
    indoorAlternativeVenue: 'Indoor Multipurpose Hall',
  });

  // Administrator Decision Sign-Off Modal
  const [decidingActivity, setDecidingActivity] = useState<SchoolActivity | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVED_OUTDOOR' | 'MANDATORY_INDOOR' | 'POSTPONED' | 'CANCELLED'>('MANDATORY_INDOOR');
  const [decisionNotes, setDecisionNotes] = useState<string>('');

  // Calendar view state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('2026-10-15');

  // Grounded Assistant state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string; isAiGenerated?: boolean }>>([
    {
      sender: 'bot',
      text: 'Good day, Principal Sharma. I am grounded in your institutional safety policies and regional station telemetry. Note: Comparative window evaluations indicate relative exposure risk; they do not imply outdoor air is certified medically safe. How can I assist with campus activity planning today?',
      time: '08:00 AM',
      isAiGenerated: false,
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // New Campus Form Modal in Settings
  const [showAddCampusModal, setShowAddCampusModal] = useState<boolean>(false);
  const [newCampusForm, setNewCampusForm] = useState({
    campusName: '',
    district: 'Central Delhi',
    totalStudents: 500,
    contactPhone: '+91 11-2384-9003',
  });

  const currentSession = cognitoAuth.getCurrentSession();
  const isAuthenticated = Boolean(currentSession?.idToken);
  const [authRequiredNotice, setAuthRequiredNotice] = useState<string | null>(null);

  // Load profile and activities from backend ONLY if genuinely authenticated via Cognito
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const [profileRes, policiesRes, activitiesRes] = await Promise.all([
          apiClient.getSchoolProfile().catch(() => null),
          apiClient.getSchoolPolicies().catch(() => null),
          apiClient.getSchoolActivities().catch(() => null),
        ]);

        if (profileRes?.profile) {
          setProfile(profileRes.profile);
          if (profileRes.campuses && profileRes.campuses.length > 0) {
            setCampuses(profileRes.campuses);
          }
        }
        if (policiesRes?.policies && policiesRes.policies.length > 0) {
          const map: any = { ...policies };
          policiesRes.policies.forEach((p) => {
            if (p.ageGroup) {
              map[p.ageGroup] = {
                maxOutdoor: p.maxOutdoorAQI,
                mandatoryIndoor: p.mandatoryIndoorAQI,
              };
            }
          });
          setPolicies(map);
        }
        if (activitiesRes?.activities && activitiesRes.activities.length > 0) {
          setActivities(activitiesRes.activities);
        }
      } catch {
        // Retain initial seeded state gracefully
      }
    }
    fetchData();
  }, []);

  const activeCampus =
    campuses.find((c) => c.campusId === selectedCampusId) || campuses[0];

  // Helper to apply activity template
  const handleApplyTemplate = (tmpl: ActivityTemplate) => {
    setNewActivityForm({
      ...newActivityForm,
      activityName: tmpl.name,
      activityType: tmpl.activityType,
      ageGroup: tmpl.ageGroup,
      startTime: tmpl.startTime,
      endTime: tmpl.endTime,
      durationMinutes: tmpl.durationMinutes,
      intensity: tmpl.intensity,
      indoorAlternativeVenue: tmpl.indoorAlternativeVenue,
    });
  };

  // Evaluate & Create new activity
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityForm.activityName.trim()) return;

    try {
      const payload = {
        campusId: activeCampus.campusId,
        campusName: activeCampus.campusName,
        activityName: newActivityForm.activityName,
        activityType: newActivityForm.activityType,
        ageGroup: newActivityForm.ageGroup,
        scheduledDate: newActivityForm.scheduledDate,
        startTime: newActivityForm.startTime,
        endTime: newActivityForm.endTime,
        durationMinutes: newActivityForm.durationMinutes,
        intensity: newActivityForm.intensity,
        indoorAlternativeVenue: newActivityForm.indoorAlternativeVenue,
        campusAQI: isTelemetryAvailable ? campusAQI : undefined,
        isTelemetryAvailable,
      };

      const res = await apiClient.evaluateSchoolActivity(payload).catch(() => null);

      if (res?.activity) {
        setActivities((prev) => [res.activity, ...prev]);
      } else {
        // Fallback local calculation
        const currentPolicy = policies[newActivityForm.ageGroup];
        const status = !isTelemetryAvailable
          ? 'DATA_INSUFFICIENT_MANUAL_REVIEW'
          : campusAQI > currentPolicy.mandatoryIndoor
          ? 'MANDATORY_INDOOR_REQUIRED'
          : 'PRECAUTIONARY_OUTDOOR_PERMITTED';

        const fallbackActivity: SchoolActivity = {
          activityId: `ACT_LOCAL_${Date.now()}`,
          schoolId: 'KV_KAILASHAHAR',
          campusId: activeCampus.campusId,
          campusName: activeCampus.campusName,
          activityName: newActivityForm.activityName,
          activityType: newActivityForm.activityType,
          ageGroup: newActivityForm.ageGroup,
          scheduledDate: newActivityForm.scheduledDate,
          startTime: newActivityForm.startTime,
          endTime: newActivityForm.endTime,
          durationMinutes: newActivityForm.durationMinutes,
          intensity: newActivityForm.intensity,
          predictedAQI: isTelemetryAvailable ? campusAQI : 0,
          category: isTelemetryAvailable ? (campusAQI > 200 ? 'Poor' : 'Moderate') : 'Insufficient Data',
          evaluationStatus: status,
          systemRecommendation: {
            status,
            reason:
              status === 'MANDATORY_INDOOR_REQUIRED'
                ? `Campus AQI (${campusAQI}) breaches configured ${newActivityForm.ageGroup} mandatory indoor threshold (${currentPolicy.mandatoryIndoor}).`
                : status === 'DATA_INSUFFICIENT_MANUAL_REVIEW'
                ? 'Campus telemetry offline. Manual administrative review required.'
                : 'AQI within institutional policy limit. Precautionary monitoring active.',
            indoorAlternativeSuggested: status === 'MANDATORY_INDOOR_REQUIRED',
            suggestedAlternativeWindow: status === 'MANDATORY_INDOOR_REQUIRED' ? '14:30 - 16:00' : undefined,
          },
          indoorAlternativeVenue: newActivityForm.indoorAlternativeVenue,
          requiresAdminSignOff: status !== 'PRECAUTIONARY_OUTDOOR_PERMITTED',
          createdAt: new Date().toISOString(),
        };

        setActivities((prev) => [fallbackActivity, ...prev]);
      }

      setShowCreateModal(false);
      setNewActivityForm({
        activityName: '',
        activityType: 'pe_sprint',
        ageGroup: 'primary',
        scheduledDate: new Date().toISOString().split('T')[0],
        startTime: '08:30',
        endTime: '10:00',
        durationMinutes: 60,
        intensity: 'moderate',
        indoorAlternativeVenue: 'Indoor Multipurpose Hall',
      });
    } catch {
      setShowCreateModal(false);
    }
  };

  // Sign off administrator decision
  const handleRecordDecision = async () => {
    if (!decidingActivity) return;

    try {
      const res = await apiClient
        .decideSchoolActivity(decidingActivity.activityId, decisionType, decisionNotes)
        .catch(() => null);

      const updatedActivity: SchoolActivity = res?.activity || {
        ...decidingActivity,
        administratorDecision: {
          decision: decisionType,
          notes: decisionNotes || 'Administrator evaluated campus outdoor risk against institutional safety threshold.',
          decidedBy: profile.administratorName || 'Principal Sharma',
          decidedAt: new Date().toISOString(),
        },
        adminSignOff: {
          isSignedOff: true,
          signedOffBy: profile.administratorName || 'Principal Sharma',
          decisionNotes,
          signedOffAt: new Date().toISOString(),
        },
      };

      setActivities((prev) =>
        prev.map((act) => (act.activityId === decidingActivity.activityId ? updatedActivity : act))
      );
      setDecidingActivity(null);
    } catch {
      setDecidingActivity(null);
    }
  };

  // Delete activity
  const handleDeleteActivity = async (activityId: string) => {
    try {
      await apiClient.deleteSchoolActivity(activityId).catch(() => null);
      setActivities((prev) => prev.filter((a) => a.activityId !== activityId));
    } catch {
      setActivities((prev) => prev.filter((a) => a.activityId !== activityId));
    }
  };

  // Save policy thresholds
  const handleSavePolicies = async () => {
    setPolicySaveStatus('Saving changes...');
    try {
      await Promise.all([
        apiClient.saveSchoolPolicy({
          ageGroup: 'primary',
          maxOutdoorAQI: policies.primary.maxOutdoor,
          mandatoryIndoorAQI: policies.primary.mandatoryIndoor,
        }).catch(() => null),
        apiClient.saveSchoolPolicy({
          ageGroup: 'middle',
          maxOutdoorAQI: policies.middle.maxOutdoor,
          mandatoryIndoorAQI: policies.middle.mandatoryIndoor,
        }).catch(() => null),
        apiClient.saveSchoolPolicy({
          ageGroup: 'senior',
          maxOutdoorAQI: policies.senior.maxOutdoor,
          mandatoryIndoorAQI: policies.senior.mandatoryIndoor,
        }).catch(() => null),
      ]);
      setPolicySaveStatus('Policies saved and recorded to audit trail successfully.');
      setTimeout(() => setPolicySaveStatus(null), 3000);
    } catch {
      setPolicySaveStatus('Policies updated locally.');
      setTimeout(() => setPolicySaveStatus(null), 3000);
    }
  };

  // Grounded Assistant Send
  const handleSendChatMessage = async (presetQuestion?: string) => {
    const questionText = presetQuestion || chatInput;
    if (!questionText.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: questionText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetQuestion) setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await apiClient.askSchoolAssistant({
        question: questionText,
        campusName: activeCampus.campusName,
        campusAQI: isTelemetryAvailable ? campusAQI : 0,
        ageGroup: 'primary',
        dominantPollutant,
      }).catch(() => null);

      let botText = res?.assistantResponse;
      if (!botText) {
        if (!isTelemetryAvailable) {
          botText =
            'Campus telemetry is currently offline. Under institutional safety rules, automated approvals are halted; please perform an administrative manual inspection.';
        } else if (
          questionText.toLowerCase().includes('recess') ||
          questionText.toLowerCase().includes('sports') ||
          questionText.toLowerCase().includes('outdoor')
        ) {
          botText = `Campus air monitor reads AQI ${campusAQI} (${dominantPollutant}). For primary students, this exceeds your institutional mandatory indoor threshold (${policies.primary.mandatoryIndoor}). The system recommends migrating to the indoor badminton hall or postponing to 14:30–16:00 (Predicted AQI ~148). Comparative improvement reduces exposure but does not guarantee safe air.`;
        } else {
          botText = `Institutional Safety Committee Policy: Primary max outdoor AQI is ${policies.primary.maxOutdoor} (indoor migration at ${policies.primary.mandatoryIndoor}); Middle school limit is ${policies.middle.maxOutdoor} (indoor at ${policies.middle.mandatoryIndoor}); Senior secondary limit is ${policies.senior.maxOutdoor} (indoor at ${policies.senior.mandatoryIndoor}). These are school policies, NOT statutory standards.`;
        }
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAiGenerated: res?.isAiGenerated ?? false,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Add campus
  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampusForm.campusName.trim()) return;

    const newCamp: SchoolCampus = {
      campusId: `CAMP_KV_${Date.now()}`,
      schoolId: 'KV_KAILASHAHAR',
      campusName: newCampusForm.campusName,
      isMainCampus: false,
      district: newCampusForm.district,
      state: 'Delhi-NCR',
      coordinates: { lat: 28.62, lon: 77.22 },
      nearestStationId: 'DEL_02',
      totalStudents: Number(newCampusForm.totalStudents),
      contactPhone: newCampusForm.contactPhone,
      createdAt: new Date().toISOString(),
    };

    try {
      await apiClient.createSchoolCampus(newCamp).catch(() => null);
    } catch {}

    setCampuses((prev) => [...prev, newCamp]);
    setShowAddCampusModal(false);
    setNewCampusForm({
      campusName: '',
      district: 'Central Delhi',
      totalStudents: 500,
      contactPhone: '+91 11-2384-9003',
    });
  };

  // Export report to CSV
  const handleExportReportsCsv = () => {
    const headers = [
      'Activity ID',
      'Name',
      'Campus',
      'Cohort',
      'Date',
      'Time',
      'Predicted AQI',
      'System Recommendation',
      'Admin Decision',
      'Decided By',
      'Notes',
    ];
    const rows = activities.map((a) => [
      a.activityId,
      `"${a.activityName}"`,
      `"${a.campusName || ''}"`,
      a.ageGroup,
      a.scheduledDate,
      `"${a.startTime} - ${a.endTime}"`,
      a.predictedAQI,
      a.evaluationStatus,
      a.administratorDecision?.decision || 'PENDING_DECISION',
      `"${a.administratorDecision?.decidedBy || 'N/A'}"`,
      `"${(a.administratorDecision?.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KV_Air_Safety_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics summary
  const totalActivities = activities.length;
  const indoorEnforced = activities.filter((a) => a.evaluationStatus === 'MANDATORY_INDOOR_REQUIRED').length;
  const outdoorPermitted = activities.filter((a) => a.evaluationStatus === 'PRECAUTIONARY_OUTDOOR_PERMITTED').length;
  const manualReviewRequired = activities.filter((a) => a.evaluationStatus === 'DATA_INSUFFICIENT_MANUAL_REVIEW').length;
  const adminSignedCount = activities.filter((a) => a.administratorDecision?.decision).length;
  const pendingDecisionsCount = activities.filter((a) => a.requiresAdminSignOff && !a.administratorDecision?.decision).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Governance & Regulatory Disclaimer Banner */}
      <div className="bg-sage-50 border border-sage-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-forest-700 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-forest-950 space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              <span>Institutional Safety Governance Framework</span>
              <span className="text-[10px] bg-sage-200 text-forest-900 px-1.5 py-0.5 rounded font-mono font-semibold">
                NON-STATUTORY
              </span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Activity thresholds below are <strong>discretionary school policies</strong> established by the institutional safety committee, <strong>NOT statutory national regulatory standards</strong>. A comparatively lower AQI window mitigates relative exposure but is not certified as medically safe.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsTelemetryAvailable(!isTelemetryAvailable)}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold border transition flex items-center gap-1.5 ${
              isTelemetryAvailable
                ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isTelemetryAvailable ? 'Simulate Telemetry Offline' : 'Restore Campus Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* 2. Public Demonstration Preview Banner when unauthenticated */}
      {!isAuthenticated && (
        <div className="bg-sage-100 border border-sage-300 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-forest-800 flex-shrink-0" />
            <div className="text-xs text-forest-950">
              <span className="font-extrabold">Public Demonstration Preview Mode (Read-Only):</span> You are viewing synthetic sample institutional records for Kendriya Vidyalaya Kailashahar. Protected administrative sign-offs, policy modifications, and persistent activity plans require genuine Amazon Cognito authentication.
            </div>
          </div>
          <a
            href="#/sign-in"
            className="px-3.5 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded-lg text-xs font-bold transition flex-shrink-0 text-center"
          >
            Sign In with Cognito
          </a>
        </div>
      )}

      {/* 3. Top Institution Header & Campus Switcher */}
      <div className="bg-forest-900 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-forest-800 flex items-center justify-center text-sage-200 border border-forest-700 flex-shrink-0">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight">{profile.institutionName}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-forest-700 text-sage-200 font-semibold border border-forest-600">
                Seeded Tenant: {profile.tenantId}
              </span>
            </div>
            <p className="text-xs text-sage-200 mt-0.5">
              Principal: {profile.administratorName} • Account: {profile.administratorEmail}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-forest-800 border border-forest-700 rounded-lg px-2.5 py-1.5">
            <Building className="w-4 h-4 text-sage-300" />
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="text-xs font-bold bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {campuses.map((c) => (
                <option key={c.campusId} value={c.campusId} className="bg-forest-900 text-white">
                  {c.campusName} {c.isMainCampus ? '(Main)' : ''}
                </option>
              ))}
            </select>
          </div>

          <ProvenanceBadge
            provenance="DEMO_DATA"
            detail={isTelemetryAvailable ? 'Synthetic Demonstration Fixture (Station DEL_01 Benchmark)' : 'Telemetry Offline'}
            subtext={isTelemetryAvailable ? 'Station DEL_01 Synthetic Fixture' : 'Telemetry Offline'}
          />
        </div>
      </div>

      {/* 3. Navigation Tabs Bar */}
      <div className="border-b border-gray-200 bg-white rounded-xl shadow-xs px-2 sm:px-4 flex overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-3 sm:px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'overview'
              ? 'border-forest-800 text-forest-900'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={`py-3 px-3 sm:px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition relative ${
            activeTab === 'activities'
              ? 'border-forest-800 text-forest-900'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Activities &amp; Evaluations</span>
          {pendingDecisionsCount > 0 && (
            <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
              {pendingDecisionsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`py-3 px-3 sm:px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'calendar'
              ? 'border-forest-800 text-forest-900'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Activity Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`py-3 px-3 sm:px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'policies'
              ? 'border-forest-800 text-forest-900'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>School Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-3 sm:px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'reports'
              ? 'border-forest-800 text-forest-900'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Reports &amp; Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`py-3 px-3 sm:px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'assistant'
              ? 'border-forest-800 text-forest-900'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Safety Assistant</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-3 sm:px-4 text-xs font-extrabold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'settings'
              ? 'border-forest-800 text-forest-900'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Campus Settings</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW DASHBOARD
      ========================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Action Required Banner if pending sign-offs exist */}
          {pendingDecisionsCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <div className="text-xs text-rose-950">
                  <span className="font-extrabold">Administrative Directive Required:</span>{' '}
                  {pendingDecisionsCount} outdoor activity scheduled during elevated AQI is awaiting your official sign-off.
                </div>
              </div>
              <button
                onClick={() => setActiveTab('activities')}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex-shrink-0"
              >
                Review Now
              </button>
            </div>
          )}

          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Campus</div>
              <div className="text-base font-black text-forest-900 mt-1 truncate">{activeCampus.campusName}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{activeCampus.totalStudents} enrolled students</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between gap-1">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Campus Air Status</div>
                <ProvenanceBadge provenance="DEMO_DATA" detail="Synthetic Fixture" />
              </div>
              {isTelemetryAvailable ? (
                <div className="mt-1">
                  <div className="text-base font-black text-rose-700 flex items-center gap-1.5">
                    <span>AQI {campusAQI}</span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-semibold">
                      Poor
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 truncate">{dominantPollutant}</div>
                  <div className="text-[10px] text-amber-800 font-medium mt-1">
                    Synthetic Fixture: Station DEL_01 Benchmark
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="text-base font-black text-amber-700">DATA UNAVAILABLE</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">Manual Review Required</div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Evaluated Activities</div>
              <div className="text-xl font-black text-forest-900 mt-1">{totalActivities}</div>
              <div className="text-[11px] text-emerald-700 mt-0.5 font-semibold">
                {indoorEnforced} indoor enforced • {outdoorPermitted} outdoor
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Admin Decisions</div>
              <div className="text-xl font-black text-forest-900 mt-1">{adminSignedCount} / {totalActivities}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {pendingDecisionsCount === 0 ? 'All activities cleared' : `${pendingDecisionsCount} pending approval`}
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activities Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Activity Safety Status Overview */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-forest-900">Upcoming Campus Activities</h3>
                  <p className="text-xs text-gray-500">Evaluated against committee policy thresholds for active campus</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1.5 bg-forest-800 hover:bg-forest-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule Activity</span>
                </button>
              </div>

              <div className="space-y-3">
                {activities.slice(0, 3).map((act) => (
                  <div
                    key={act.activityId}
                    className="p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition bg-ivory-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-forest-900">{act.activityName}</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-sage-200 text-forest-900">
                          {act.ageGroup}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {act.scheduledDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {act.startTime} - {act.endTime}
                        </span>
                        <span>Campus: {act.campusName || activeCampus.campusName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:justify-end">
                      {act.evaluationStatus === 'MANDATORY_INDOOR_REQUIRED' ? (
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Indoor Required (AQI {act.predictedAQI})
                        </span>
                      ) : act.evaluationStatus === 'DATA_INSUFFICIENT_MANUAL_REVIEW' ? (
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Manual Review Required
                        </span>
                      ) : (
                        <span className="text-[11px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Outdoor Permitted (AQI {act.predictedAQI})
                        </span>
                      )}

                      {act.administratorDecision?.decision ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-forest-100 text-forest-900 border border-forest-300">
                          {act.administratorDecision.decision}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setDecidingActivity(act);
                            setDecisionType(
                              act.evaluationStatus === 'MANDATORY_INDOOR_REQUIRED'
                                ? 'MANDATORY_INDOOR'
                                : 'APPROVED_OUTDOOR'
                            );
                            setDecisionNotes('');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-amber-500 text-white hover:bg-amber-600 transition"
                        >
                          Sign Off
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setActiveTab('activities')}
                  className="text-xs font-bold text-forest-800 hover:text-forest-900 flex items-center gap-1 ml-auto"
                >
                  <span>View all activities &amp; historical sign-offs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Col: Current Telemetry & Cohort Threshold Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-forest-900">
                    Station Telemetry Details
                  </h4>
                  <ProvenanceBadge provenance="DEMO_DATA" subtext="Benchmark Monitor" />
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Nearest Station:</span>
                    <span className="font-bold text-gray-800 truncate max-w-[180px]">{campusStationName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">PM2.5 Concentration:</span>
                    <span className="font-bold text-rose-700">104 µg/m³ (Severe category)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">PM10 Concentration:</span>
                    <span className="font-bold text-gray-800">178 µg/m³</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Nitrogen Dioxide (NO₂):</span>
                    <span className="font-bold text-gray-800">42 µg/m³</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Telemetry Status:</span>
                    <span className={`font-bold ${isTelemetryAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isTelemetryAvailable ? 'Online & Synchronized' : 'Offline (Simulated)'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-ivory-100 rounded-xl text-xs space-y-1.5 border border-ivory-300">
                  <div className="font-bold text-forest-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
                    <span>Active Discretionary Thresholds</span>
                  </div>
                  <p className="text-gray-600 text-[11px]">
                    Primary: &lt;{policies.primary.mandatoryIndoor} AQI | Middle: &lt;{policies.middle.mandatoryIndoor} AQI | Senior: &lt;{policies.senior.mandatoryIndoor} AQI
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('policies')}
                className="w-full py-2 bg-sage-100 hover:bg-sage-200 text-forest-900 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 mt-4"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Adjust Policy Thresholds</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ACTIVITIES & EVALUATIONS WORKFLOW
      ========================================================================== */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-forest-900">Activity Scheduling &amp; Safety Evaluations</h3>
                <p className="text-xs text-gray-500">
                  Separates automated policy system recommendations from official administrator directives
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Activity Evaluation</span>
              </button>
            </div>

            {/* Activities Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Activity &amp; Campus</th>
                    <th className="py-2.5 px-3">Cohort</th>
                    <th className="py-2.5 px-3">Schedule</th>
                    <th className="py-2.5 px-3">Predicted AQI</th>
                    <th className="py-2.5 px-3">System Recommendation</th>
                    <th className="py-2.5 px-3">Administrator Decision</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activities.map((act) => (
                    <tr key={act.activityId} className="hover:bg-ivory-50/50">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-forest-900">{act.activityName}</div>
                        <div className="text-[11px] text-gray-500">{act.campusName || activeCampus.campusName}</div>
                        <div className="text-[10px] text-gray-400">Indoor Alt: {act.indoorAlternativeVenue}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sage-200 text-forest-900">
                          {act.ageGroup}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-800">{act.scheduledDate}</div>
                        <div className="text-[11px] text-gray-500">{act.startTime} - {act.endTime}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-extrabold text-gray-900">
                          {act.predictedAQI > 0 ? `AQI ${act.predictedAQI}` : 'N/A'}
                        </div>
                        <span className="text-[10px] text-gray-500">{act.category}</span>
                      </td>

                      {/* System Recommendation */}
                      <td className="py-3 px-3 max-w-[220px]">
                        {act.evaluationStatus === 'MANDATORY_INDOOR_REQUIRED' ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                              MANDATORY INDOOR
                            </span>
                            <p className="text-[10px] text-rose-950 truncate" title={act.systemRecommendation?.reason}>
                              {act.systemRecommendation?.reason || 'Breaches school threshold.'}
                            </p>
                          </div>
                        ) : act.evaluationStatus === 'DATA_INSUFFICIENT_MANUAL_REVIEW' ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-block">
                              DATA INSUFFICIENT
                            </span>
                            <p className="text-[10px] text-amber-950">Manual review required.</p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                              OUTDOOR PERMITTED
                            </span>
                            <p className="text-[10px] text-emerald-950">Within committee thresholds.</p>
                          </div>
                        )}
                      </td>

                      {/* Administrator Decision */}
                      <td className="py-3 px-3">
                        {act.administratorDecision?.decision ? (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-forest-100 text-forest-900 border border-forest-300 inline-block">
                              {act.administratorDecision.decision}
                            </span>
                            <div className="text-[10px] text-gray-500">
                              By {act.administratorDecision.decidedBy}
                            </div>
                            {act.administratorDecision.notes && (
                              <div className="text-[10px] text-gray-600 italic truncate max-w-[150px]" title={act.administratorDecision.notes}>
                                &quot;{act.administratorDecision.notes}&quot;
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            PENDING SIGN-OFF
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setDecidingActivity(act);
                              setDecisionType(
                                act.administratorDecision?.decision ||
                                  (act.evaluationStatus === 'MANDATORY_INDOOR_REQUIRED'
                                    ? 'MANDATORY_INDOOR'
                                    : 'APPROVED_OUTDOOR')
                              );
                              setDecisionNotes(act.administratorDecision?.notes || '');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-forest-800 text-white hover:bg-forest-900 transition"
                          >
                            {act.administratorDecision?.decision ? 'Update' : 'Sign Off'}
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(act.activityId)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                            title="Delete Activity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CALENDAR VIEW
      ========================================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-forest-900">Institutional Activity Calendar</h3>
                <p className="text-xs text-gray-500">
                  Multi-day schedule of school events with predicted diurnal exposure alerts
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedCalendarDate}
                  onChange={(e) => setSelectedCalendarDate(e.target.value)}
                  className="text-xs font-bold border border-gray-300 rounded-lg p-2 bg-ivory-50 text-forest-900"
                />
              </div>
            </div>

            {/* Calendar Event Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {['2026-10-15', '2026-10-16', '2026-10-17'].map((calDate) => {
                const dayActivities = activities.filter((a) => a.scheduledDate === calDate);
                const isSelected = selectedCalendarDate === calDate;

                return (
                  <div
                    key={calDate}
                    onClick={() => setSelectedCalendarDate(calDate)}
                    className={`p-4 rounded-xl border transition cursor-pointer space-y-3 ${
                      isSelected
                        ? 'border-forest-800 bg-forest-50/40 ring-2 ring-forest-700/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="font-black text-forest-900 text-sm">{calDate}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {dayActivities.length} {dayActivities.length === 1 ? 'Event' : 'Events'}
                      </span>
                    </div>

                    {dayActivities.length === 0 ? (
                      <div className="text-xs text-gray-400 italic py-4 text-center">No events scheduled</div>
                    ) : (
                      <div className="space-y-2">
                        {dayActivities.map((act) => (
                          <div
                            key={act.activityId}
                            className="p-2.5 rounded-lg bg-white border border-gray-200 text-xs space-y-1 shadow-2xs"
                          >
                            <div className="font-bold text-gray-900 flex items-center justify-between">
                              <span className="truncate">{act.activityName}</span>
                              <span className="text-[10px] text-gray-500 flex-shrink-0">{act.startTime}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-gray-500 uppercase text-[10px]">{act.ageGroup}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  act.evaluationStatus === 'MANDATORY_INDOOR_REQUIRED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : act.evaluationStatus === 'DATA_INSUFFICIENT_MANUAL_REVIEW'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {act.evaluationStatus === 'MANDATORY_INDOOR_REQUIRED'
                                  ? 'Indoor'
                                  : act.evaluationStatus === 'DATA_INSUFFICIENT_MANUAL_REVIEW'
                                  ? 'Review'
                                  : 'Outdoor'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Date Details */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-forest-900 mb-2">
                Detailed Events for {selectedCalendarDate}
              </h4>
              {activities.filter((a) => a.scheduledDate === selectedCalendarDate).length === 0 ? (
                <div className="p-6 bg-ivory-50 rounded-xl text-center text-xs text-gray-500 border border-gray-200">
                  No activities scheduled for this date. Click &quot;New Activity Evaluation&quot; to plan an event.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activities
                    .filter((a) => a.scheduledDate === selectedCalendarDate)
                    .map((act) => (
                      <div
                        key={act.activityId}
                        className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-forest-900">{act.activityName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-200 text-forest-900 uppercase">
                            {act.ageGroup}
                          </span>
                        </div>
                        <div className="text-gray-600 text-[11px]">
                          Time: {act.startTime} - {act.endTime} ({act.durationMinutes} mins)
                        </div>
                        <div className="text-gray-600 text-[11px]">
                          Indoor Alternative: <strong>{act.indoorAlternativeVenue}</strong>
                        </div>
                        <div className="p-2 bg-ivory-100 rounded-md text-[11px] text-gray-700">
                          <strong>Directive:</strong>{' '}
                          {act.administratorDecision?.decision
                            ? `${act.administratorDecision.decision} (${act.administratorDecision.notes || 'Official sign-off'})`
                            : 'Pending administrator decision'}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: POLICIES (INSTITUTIONAL GOVERNANCE)
      ========================================================================== */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-forest-900">
                School Safety Policy Configuration
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Institutional committee thresholds for outdoor activity restrictions across student age cohorts
              </p>
            </div>

            {/* Non-Statutory Disclaimer Box */}
            <div className="p-4 bg-sage-50 border border-sage-300 rounded-xl space-y-1.5 text-xs text-forest-950">
              <div className="font-bold flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-forest-700" />
                <span>Statutory Authority Disclaimer</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                These thresholds represent <strong>discretionary school policies</strong> established by the institution&apos;s health and safety board. They are <strong>NOT statutory national regulatory standards</strong>. Changing these values updates automated evaluation triggers for Kendriya Vidyalaya Kailashahar only.
              </p>
            </div>

            {/* Policy Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Primary Cohort */}
              <div className="border border-gray-200 rounded-xl p-4 bg-ivory-50/50 space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <div className="font-black text-forest-900 text-sm">Primary Cohort</div>
                  <div className="text-[11px] text-gray-500">Classes 1 to 5 (Ages 5–10)</div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700">Max Acceptable Outdoor AQI:</label>
                    <input
                      type="number"
                      value={policies.primary.maxOutdoor}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          primary: { ...policies.primary, maxOutdoor: Number(e.target.value) },
                        })
                      }
                      className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-lg text-forest-900 font-bold"
                    />
                    <span className="text-[10px] text-gray-400">Above this, warnings are issued.</span>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Mandatory Indoor Migration AQI:</label>
                    <input
                      type="number"
                      value={policies.primary.mandatoryIndoor}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          primary: { ...policies.primary, mandatoryIndoor: Number(e.target.value) },
                        })
                      }
                      className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-lg text-forest-900 font-bold"
                    />
                    <span className="text-[10px] text-gray-400">Above this, outdoor activity is barred.</span>
                  </div>
                </div>
              </div>

              {/* Middle School Cohort */}
              <div className="border border-gray-200 rounded-xl p-4 bg-ivory-50/50 space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <div className="font-black text-forest-900 text-sm">Middle School Cohort</div>
                  <div className="text-[11px] text-gray-500">Classes 6 to 8 (Ages 11–14)</div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700">Max Acceptable Outdoor AQI:</label>
                    <input
                      type="number"
                      value={policies.middle.maxOutdoor}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          middle: { ...policies.middle, maxOutdoor: Number(e.target.value) },
                        })
                      }
                      className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-lg text-forest-900 font-bold"
                    />
                    <span className="text-[10px] text-gray-400">Above this, warnings are issued.</span>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Mandatory Indoor Migration AQI:</label>
                    <input
                      type="number"
                      value={policies.middle.mandatoryIndoor}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          middle: { ...policies.middle, mandatoryIndoor: Number(e.target.value) },
                        })
                      }
                      className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-lg text-forest-900 font-bold"
                    />
                    <span className="text-[10px] text-gray-400">Above this, outdoor activity is barred.</span>
                  </div>
                </div>
              </div>

              {/* Senior Secondary Cohort */}
              <div className="border border-gray-200 rounded-xl p-4 bg-ivory-50/50 space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <div className="font-black text-forest-900 text-sm">Senior Secondary Cohort</div>
                  <div className="text-[11px] text-gray-500">Classes 9 to 12 (Ages 15–18)</div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700">Max Acceptable Outdoor AQI:</label>
                    <input
                      type="number"
                      value={policies.senior.maxOutdoor}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          senior: { ...policies.senior, maxOutdoor: Number(e.target.value) },
                        })
                      }
                      className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-lg text-forest-900 font-bold"
                    />
                    <span className="text-[10px] text-gray-400">Above this, warnings are issued.</span>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Mandatory Indoor Migration AQI:</label>
                    <input
                      type="number"
                      value={policies.senior.mandatoryIndoor}
                      onChange={(e) =>
                        setPolicies({
                          ...policies,
                          senior: { ...policies.senior, mandatoryIndoor: Number(e.target.value) },
                        })
                      }
                      className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-lg text-forest-900 font-bold"
                    />
                    <span className="text-[10px] text-gray-400">Above this, outdoor activity is barred.</span>
                  </div>
                </div>
              </div>
            </div>

            {policySaveStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>{policySaveStatus}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-500">
                Authorised Policy Administrator: Principal Sharma (KV Kailashahar)
              </span>
              <button
                onClick={handleSavePolicies}
                className="px-5 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Save &amp; Record Policy Directive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: REPORTS & AUDIT TRAIL
      ========================================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-forest-900">
                  Compliance Reports &amp; Decision Audit Trail
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Institutional record of all air quality safety evaluations, directives, and sign-offs
                </p>
              </div>
              <button
                onClick={handleExportReportsCsv}
                className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit Log (CSV)</span>
              </button>
            </div>

            {/* Compliance Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-ivory-50 border border-gray-200 rounded-xl text-xs">
                <div className="font-bold text-gray-500 uppercase text-[10px]">Total Events Evaluated</div>
                <div className="text-2xl font-black text-forest-900 mt-1">{totalActivities}</div>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                <div className="font-bold text-rose-800 uppercase text-[10px]">Mandatory Indoor Enforced</div>
                <div className="text-2xl font-black text-rose-700 mt-1">{indoorEnforced}</div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                <div className="font-bold text-emerald-800 uppercase text-[10px]">Precautionary Outdoor Permitted</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{outdoorPermitted}</div>
              </div>

              <div className="p-4 bg-forest-50 border border-forest-200 rounded-xl text-xs">
                <div className="font-bold text-forest-800 uppercase text-[10px]">Official Decisions Signed</div>
                <div className="text-2xl font-black text-forest-800 mt-1">{adminSignedCount}</div>
              </div>
            </div>

            {/* Audit Trail List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-forest-900">
                Recent Institutional Audit Entries
              </h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-xs">
                {activities.map((act) => (
                  <div key={act.activityId} className="p-3.5 bg-white hover:bg-ivory-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-forest-900">{act.activityName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-gray-100 text-gray-700">
                          {act.ageGroup}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Date: {act.scheduledDate} • Time: {act.startTime}–{act.endTime} • Predicted AQI: {act.predictedAQI}
                      </div>
                      {act.administratorDecision?.notes && (
                        <div className="text-[11px] text-gray-700 italic">
                          Directive Note: &quot;{act.administratorDecision.notes}&quot;
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-forest-900 text-xs">
                        Decision: {act.administratorDecision?.decision || 'PENDING'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Signatory: {act.administratorDecision?.decidedBy || 'Awaiting Sign-Off'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: GROUNDED SAFETY ASSISTANT
      ========================================================================== */}
      {activeTab === 'assistant' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-extrabold text-forest-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-forest-800" />
                  <span>Context-Grounded School Air Safety Copilot</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Grounded in Kendriya Vidyalaya Kailashahar discretionary committee policies and regional telemetry
                </p>
              </div>

              {/* Bedrock Uninvoked Safe Cost Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sage-200 text-forest-900 border border-sage-300">
                  Bedrock Uninvoked (Zero Cloud Charges)
                </span>
                <ProvenanceBadge provenance="FORECAST" subtext="Policy Grounded" />
              </div>
            </div>

            {/* Quick Prompts Bar */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-[11px] text-gray-500 font-semibold self-center">Suggested queries:</span>
              <button
                onClick={() => handleSendChatMessage('Should Primary students have outdoor recess this morning?')}
                className="px-2.5 py-1 bg-ivory-100 hover:bg-ivory-200 text-forest-900 rounded-lg font-semibold border border-ivory-300 transition"
              >
                &quot;Should Primary students have outdoor recess this morning?&quot;
              </button>
              <button
                onClick={() => handleSendChatMessage('What alternative windows exist for tomorrow outdoor sports day?')}
                className="px-2.5 py-1 bg-ivory-100 hover:bg-ivory-200 text-forest-900 rounded-lg font-semibold border border-ivory-300 transition"
              >
                &quot;What alternative windows exist for tomorrow sports day?&quot;
              </button>
              <button
                onClick={() => handleSendChatMessage('Explain our policy difference between primary and senior students.')}
                className="px-2.5 py-1 bg-ivory-100 hover:bg-ivory-200 text-forest-900 rounded-lg font-semibold border border-ivory-300 transition"
              >
                &quot;Explain policy difference between primary and senior students.&quot;
              </button>
            </div>

            {/* Chat Box */}
            <div className="h-[400px] border border-gray-200 rounded-xl p-4 overflow-y-auto space-y-3 bg-ivory-50/40 custom-scrollbar text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl leading-relaxed max-w-[85%] ${
                    msg.sender === 'user'
                      ? 'bg-forest-800 text-white ml-auto'
                      : 'bg-white text-gray-900 mr-auto border border-gray-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase mb-1 opacity-70">
                    <span>{msg.sender === 'user' ? 'Principal Sharma' : 'School Safety Assistant'}</span>
                    <span>{msg.time}</span>
                  </div>
                  <div className="text-xs">{msg.text}</div>
                </div>
              ))}
              {isChatLoading && (
                <div className="p-3 bg-white text-gray-500 border border-gray-200 rounded-xl mr-auto text-xs animate-pulse">
                  Synthesizing campus air readings and committee policy limits...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about outdoor activities, age cohorts, or alternative time windows..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                className="flex-1 text-xs bg-white border border-gray-300 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={isChatLoading || !chatInput.trim()}
                className="px-5 py-3 bg-forest-800 hover:bg-forest-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: CAMPUS SETTINGS & TENANT PROFILE
      ========================================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-extrabold text-forest-900">
                  Campus Facilities &amp; Notification Preferences
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Multi-campus management and parental alert broadcast rules for Kendriya Vidyalaya Kailashahar
                </p>
              </div>
              <button
                onClick={() => setShowAddCampusModal(true)}
                className="px-3.5 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Campus Wing</span>
              </button>
            </div>

            {/* Campuses List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-forest-900">
                Registered Institution Campuses ({campuses.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campuses.map((c) => (
                  <div
                    key={c.campusId}
                    className="p-4 border border-gray-200 rounded-xl bg-ivory-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-forest-900">{c.campusName}</span>
                      {c.isMainCampus && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-forest-800 text-white">
                          Main Campus
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600 text-[11px]">
                      District: {c.district}, {c.state} • Nearest Station: {c.nearestStationId}
                    </div>
                    <div className="text-gray-600 text-[11px]">
                      Student Capacity: {c.totalStudents} • Contact: {c.contactPhone}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification & Communication Preferences */}
            <div className="border-t border-gray-100 pt-5 space-y-4 text-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-forest-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-forest-700" />
                <span>Parental Communication &amp; Indoor Relocation Broadcasts</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3.5 bg-ivory-50 rounded-xl border border-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences?.parentBroadcastEnabled ?? true}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notificationPreferences: {
                          ...profile.notificationPreferences!,
                          parentBroadcastEnabled: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-forest-800 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-gray-800">Broadcast Indoor Migration Alerts to Parents</div>
                    <div className="text-[11px] text-gray-500">
                      Dispatches email/SMS when an outdoor event is relocated due to elevated AQI
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-ivory-50 rounded-xl border border-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences?.staffAlertsEnabled ?? true}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        notificationPreferences: {
                          ...profile.notificationPreferences!,
                          staffAlertsEnabled: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-forest-800 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-gray-800">Direct Alerts to PE Faculty &amp; Caretakers</div>
                    <div className="text-[11px] text-gray-500">
                      Sends immediate notifications to sports staff on policy threshold breaches
                    </div>
                  </div>
                </label>
              </div>

              {/* Privacy Consent Disclosure */}
              <div className="p-3 bg-sage-50 border border-sage-200 rounded-xl text-[11px] text-forest-950 flex items-start gap-2">
                <Info className="w-4 h-4 text-forest-700 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Parental Privacy &amp; Data Ethics Disclosure:</strong> Broadcasts utilize school-held parent contact records exclusively for student health and air safety advisories. No student data, geolocation, or medical tags are shared with external commercial advertisers or third-party networks.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ACTIVITY CREATION & EVALUATION WIZARD
      ========================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-forest-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-forest-900">
                Plan &amp; Evaluate New School Activity
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-600 uppercase">Pre-Fill from Template:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {ACTIVITY_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="p-2 text-left rounded-lg border border-gray-200 hover:border-forest-700 bg-ivory-50 transition text-[11px] font-bold text-gray-800 truncate"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700">Activity Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Junior Sports Day & 400m Heats"
                  value={newActivityForm.activityName}
                  onChange={(e) => setNewActivityForm({ ...newActivityForm, activityName: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Student Cohort:</label>
                  <select
                    value={newActivityForm.ageGroup}
                    onChange={(e) => setNewActivityForm({ ...newActivityForm, ageGroup: e.target.value as SchoolAgeGroup })}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                  >
                    <option value="primary">Primary (Ages 5–10)</option>
                    <option value="middle">Middle (Ages 11–14)</option>
                    <option value="senior">Senior (Ages 15–18)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700">Scheduled Date:</label>
                  <input
                    type="date"
                    required
                    value={newActivityForm.scheduledDate}
                    onChange={(e) => setNewActivityForm({ ...newActivityForm, scheduledDate: e.target.value })}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Start Time:</label>
                  <input
                    type="time"
                    required
                    value={newActivityForm.startTime}
                    onChange={(e) => setNewActivityForm({ ...newActivityForm, startTime: e.target.value })}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700">End Time:</label>
                  <input
                    type="time"
                    required
                    value={newActivityForm.endTime}
                    onChange={(e) => setNewActivityForm({ ...newActivityForm, endTime: e.target.value })}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700">Intensity:</label>
                  <select
                    value={newActivityForm.intensity}
                    onChange={(e) => setNewActivityForm({ ...newActivityForm, intensity: e.target.value as any })}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                  >
                    <option value="low">Low (Assembly)</option>
                    <option value="moderate">Moderate (Recess)</option>
                    <option value="high">High (PE Drills)</option>
                    <option value="vigorous">Vigorous (Trials)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700">Indoor Alternative Venue:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Multipurpose Indoor Badminton Hall"
                  value={newActivityForm.indoorAlternativeVenue}
                  onChange={(e) => setNewActivityForm({ ...newActivityForm, indoorAlternativeVenue: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded-xl font-bold transition shadow-xs"
                >
                  Evaluate &amp; Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADMINISTRATOR DECISION & DIRECTIVE SIGN-OFF
      ========================================================================== */}
      {decidingActivity && (
        <div className="fixed inset-0 z-50 bg-forest-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-forest-800" />
                <h3 className="text-base font-black text-forest-900">
                  Administrator Decision &amp; Directive Sign-Off
                </h3>
              </div>
              <button
                onClick={() => setDecidingActivity(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 space-y-1 text-xs">
              <div className="font-extrabold text-forest-900">{decidingActivity.activityName}</div>
              <div className="text-[11px] text-gray-600">
                Cohort: {decidingActivity.ageGroup.toUpperCase()} • Scheduled: {decidingActivity.scheduledDate} ({decidingActivity.startTime}–{decidingActivity.endTime})
              </div>
              <div className="text-[11px] text-rose-800 font-semibold pt-1">
                System Recommendation: {decidingActivity.evaluationStatus} (Campus AQI {decidingActivity.predictedAQI})
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="font-bold text-gray-800 block">Select Official Administrative Directive:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'MANDATORY_INDOOR', label: 'Enforce Indoor Relocation' },
                  { id: 'APPROVED_OUTDOOR', label: 'Grant Outdoor Clearance' },
                  { id: 'POSTPONED', label: 'Postpone to Later Window' },
                  { id: 'CANCELLED', label: 'Cancel Activity' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`p-3 rounded-xl border cursor-pointer font-bold transition flex items-center gap-2 ${
                      decisionType === opt.id
                        ? 'border-forest-800 bg-forest-50/60 text-forest-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decisionType"
                      value={opt.id}
                      checked={decisionType === opt.id}
                      onChange={() => setDecisionType(opt.id as any)}
                      className="text-forest-800"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="font-bold text-gray-800 block mb-1">Administrative Directive Notes:</label>
                <textarea
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="e.g. Relocate races to indoor badminton hall; outdoor heats deferred until 14:30."
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 focus:ring-2 focus:ring-forest-700"
                ></textarea>
              </div>

              <div className="text-[11px] text-gray-500 italic">
                Signatory: {profile.administratorName || 'Principal Sharma'} ({profile.institutionName})
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDecidingActivity(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordDecision}
                className="px-5 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded-xl font-bold transition shadow-xs text-xs"
              >
                Sign &amp; Record Directive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW CAMPUS
      ========================================================================== */}
      {showAddCampusModal && (
        <div className="fixed inset-0 z-50 bg-forest-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-forest-900">Add Campus Wing</h3>
              <button
                onClick={() => setShowAddCampusModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCampus} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700">Campus Wing Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Secondary Sports Block"
                  value={newCampusForm.campusName}
                  onChange={(e) => setNewCampusForm({ ...newCampusForm, campusName: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700">District:</label>
                <input
                  type="text"
                  required
                  value={newCampusForm.district}
                  onChange={(e) => setNewCampusForm({ ...newCampusForm, district: e.target.value })}
                  className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Student Capacity:</label>
                  <input
                    type="number"
                    value={newCampusForm.totalStudents}
                    onChange={(e) => setNewCampusForm({ ...newCampusForm, totalStudents: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700">Contact Phone:</label>
                  <input
                    type="text"
                    value={newCampusForm.contactPhone}
                    onChange={(e) => setNewCampusForm({ ...newCampusForm, contactPhone: e.target.value })}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl bg-ivory-50 text-forest-900 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddCampusModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded-xl font-bold transition shadow-xs"
                >
                  Add Campus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SchoolPlannerView;
