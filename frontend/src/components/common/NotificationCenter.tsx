import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  Layers,
  X,
  ExternalLink,
  RefreshCw,
  Info,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import type { NotificationRecord, NotificationDeliveryStats, SystemDiagnosticsResult } from '../../types';

interface NotificationCenterProps {
  currentUser: { email: string; role: string; isDemo?: boolean } | null;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [stats, setStats] = useState<NotificationDeliveryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<SystemDiagnosticsResult | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getNotificationHistory({ limit: 20 });
      if (res?.notifications) {
        setNotifications(res.notifications);
        setStats(res.stats);
      }
    } catch (err) {
      // In local mode fallback silently
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    fetchNotifications();
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      // Local fallback
    }
  };

  const handleLoadDiagnostics = async () => {
    setShowDiagnostics(true);
    try {
      const data = await apiClient.getSystemDiagnostics();
      setDiagnosticsData(data);
    } catch (err) {
      // Fallback
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl bg-ivory-200/80 hover:bg-ivory-300 border border-ivory-300 text-forest transition"
        title="Notifications & System Telemetry"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-muted-red text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over / Dropdown Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/20 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-ivory-300 flex flex-col">
            {/* Header */}
            <div className="p-4 bg-forest text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">Notifications & Dispatch Center</h3>
                  <div className="text-[11px] text-sage-200">
                    Amazon SES Simulation &bull; EventBridge Cron &bull; Bedrock Grounding
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-forest-900 text-white/80 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cloud Status Transparency Strip */}
            <div className="px-4 py-2.5 bg-ivory-100 border-b border-ivory-300 text-[11px] text-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Mode: Local Sandbox (Zero Cloud Charges)</span>
              </div>
              <button
                onClick={handleLoadDiagnostics}
                className="text-forest hover:underline font-bold text-[11px] flex items-center gap-1"
              >
                <Activity className="w-3 h-3" /> Diagnostics
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && notifications.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-forest" />
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No notification events recorded yet.
                  <div className="text-[11px] text-gray-500 mt-1">
                    Alert rules and reminders will appear here when evaluated.
                  </div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border transition ${
                      n.isRead
                        ? 'bg-ivory-100/50 border-ivory-200 text-gray-600'
                        : 'bg-white border-forest/20 shadow-sm text-gray-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            n.type.includes('ALERT')
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-sage-200 text-forest'
                          }`}
                        >
                          {n.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {n.status === 'DELIVERED_SIMULATED' ? 'Delivered (Simulated)' : n.status}
                        </span>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[10px] text-forest font-bold hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>

                    <div className="font-bold text-xs mt-1.5 text-forest">{n.subject}</div>
                    <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">{n.bodyText}</div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
                      <span>Recipient: {n.recipientEmail || 'In-App User'}</span>
                      <span>{new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-3 bg-ivory-100 border-t border-ivory-300 text-[11px] text-gray-600 flex items-center justify-between">
              <span>
                Total Dispatched:{' '}
                <strong className="text-forest">{stats?.totalSent ?? notifications.length}</strong>
              </span>
              <button
                onClick={fetchNotifications}
                className="flex items-center gap-1 text-forest font-bold hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      {showDiagnostics && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col border border-ivory-300">
            <div className="p-4 bg-forest text-white rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <h3 className="font-bold text-sm">System Observability & Diagnostic Telemetry</h3>
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="p-1 rounded-lg hover:bg-forest-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-ivory-100 border border-ivory-300">
                  <div className="text-gray-500 font-medium">Service Status</div>
                  <div className="text-sm font-bold text-forest">
                    {diagnosticsData?.status || 'HEALTHY'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-ivory-100 border border-ivory-300">
                  <div className="text-gray-500 font-medium">Target Region</div>
                  <div className="text-sm font-bold text-forest">
                    {diagnosticsData?.region || 'ap-south-1'}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-forest mb-2">Cloud Services Configuration</h4>
                <div className="p-3 bg-ivory-100 rounded-xl space-y-1.5 border border-ivory-300 font-mono text-[11px]">
                  <div>Bedrock AI: {diagnosticsData?.cloudServices?.bedrock?.mode || 'deterministic_fallback'}</div>
                  <div>SES Email: {diagnosticsData?.cloudServices?.ses?.mode || 'simulation'}</div>
                  <div>EventBridge Scheduler: {diagnosticsData?.cloudServices?.eventBridge?.mode || 'in_process_cron'}</div>
                  <div>DynamoDB: {diagnosticsData?.cloudServices?.dynamodb?.mode || 'in_memory_repository'}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-forest mb-2">Recent CloudWatch Structured Logs</h4>
                <div className="p-3 bg-gray-900 text-gray-200 rounded-xl font-mono text-[10px] max-h-40 overflow-y-auto space-y-1">
                  {diagnosticsData?.recentLogsSample?.length ? (
                    diagnosticsData.recentLogsSample.map((log, i) => (
                      <div key={i} className="truncate">
                        <span className="text-emerald-400">[{log.level}]</span>{' '}
                        <span className="text-gray-400">{log.correlationId}</span> &bull; {log.message}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">No logs captured yet in circular buffer.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-ivory-100 rounded-b-2xl border-t border-ivory-300 flex justify-end">
              <button
                onClick={() => setShowDiagnostics(false)}
                className="px-4 py-1.5 bg-forest text-white rounded-xl font-bold text-xs hover:bg-forest-900 transition"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
