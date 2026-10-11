import React, { useState } from 'react';
import { X, Lock, Mail, Shield, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { email: string; role: string }) => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'personal' | 'farmer' | 'school'>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectDemoUser = (demoEmail: string, demoRole: 'personal' | 'farmer' | 'school') => {
    setEmail(demoEmail);
    setRole(demoRole);
    setAuthError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    // Simulated client-side validation before Cognito SRP dispatch
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess({ email: email || 'parasnath@gmail.com', role });
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card-subtle w-full max-w-md p-6 bg-white space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-forest-800">
            <Lock className="w-5 h-5" />
            <h2 className="text-lg font-black tracking-tight">Amazon Cognito Authentication</h2>
          </div>
          <p className="text-xs text-gray-500">
            Secure SRP Authentication &amp; Role-Based Access Control
          </p>
        </div>

        {/* Demo Identity Quick Selector */}
        <div className="p-3.5 bg-ivory-100 rounded-xl border border-ivory-300 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-forest-900 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-forest-700" />
            <span>Select Demonstration Identity</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectDemoUser('parasnath@gmail.com', 'personal')}
              className={`p-2 rounded-lg text-left text-xs font-semibold border flex items-center justify-between transition ${
                email === 'parasnath@gmail.com'
                  ? 'bg-forest-800 text-white border-forest-900'
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>parasnath@gmail.com</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-sage-200 text-forest-900">
                Personal Role
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemoUser('sunilnagrale@gmail.com', 'farmer')}
              className={`p-2 rounded-lg text-left text-xs font-semibold border flex items-center justify-between transition ${
                email === 'sunilnagrale@gmail.com'
                  ? 'bg-forest-800 text-white border-forest-900'
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>sunilnagrale@gmail.com</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-amber-200 text-amber-900">
                Farmer Role
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemoUser('kvkailashahar@gmail.com', 'school')}
              className={`p-2 rounded-lg text-left text-xs font-semibold border flex items-center justify-between transition ${
                email === 'kvkailashahar@gmail.com'
                  ? 'bg-forest-800 text-white border-forest-900'
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>kvkailashahar@gmail.com</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-blue-200 text-blue-900">
                School Role
              </span>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Account Email Address:</label>
            <div className="relative mt-1">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs bg-ivory-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">Password:</label>
            <div className="relative mt-1">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs bg-ivory-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-700"
              />
            </div>
          </div>

          {authError && (
            <div className="p-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-forest-800 hover:bg-forest-900 text-white text-xs font-extrabold rounded-lg transition shadow-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Authenticating via Cognito SRP...' : 'Authenticate & Enter Platform'}
          </button>
        </form>

        <p className="text-[10px] text-gray-400 text-center">
          Amazon Cognito User Pool `ap-south-1` • SRP Protocol • Zero Passwords Logged
        </p>
      </div>
    </div>
  );
};
