import React from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Badge } from './Badge';

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead?: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-14 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-ivory-300 p-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between pb-3 border-b border-ivory-200">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-forest-800" />
          <h4 className="font-bold text-forest-950 text-sm">Notifications &amp; Alerts</h4>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sage-200 text-forest-900 font-bold">
            {notifications.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onMarkAllAsRead && (
            <button
              onClick={onMarkAllAsRead}
              className="text-[11px] text-forest-700 hover:text-forest-900 font-bold"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-ivory-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-gray-400">No active alerts.</div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl border transition-all ${
                item.read ? 'bg-ivory-50/50 border-ivory-200' : 'bg-white border-ivory-300 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {item.type === 'warning' && (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                {item.type === 'alert' && (
                  <AlertTriangle className="w-4 h-4 text-mutedRed shrink-0 mt-0.5" />
                )}
                {item.type === 'info' && (
                  <Info className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                )}
                {item.type === 'success' && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-0.5">
                  <div className="font-bold text-forest-950 flex items-center justify-between">
                    <span>{item.title}</span>
                    <span className="text-[10px] text-gray-400 font-normal">{item.timestamp}</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-[11px]">{item.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
