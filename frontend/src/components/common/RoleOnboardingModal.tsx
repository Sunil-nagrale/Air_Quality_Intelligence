import React, { useState } from 'react';
import {
  User,
  School,
  Sprout,
  Factory,
  CheckCircle2,
  ArrowRight,
  HeartPulse,
  MapPin,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Modal, Button, Card, Badge } from '../ui';
import { AppRoute, UserRole } from '../../types';

interface RoleOnboardingModalProps {
  isOpen: boolean;
  initialRole?: 'personal' | 'school' | 'farmer' | 'buyer';
  onClose: () => void;
  onComplete: (role: UserRole, targetRoute: AppRoute, profileSummary: string) => void;
}

export const RoleOnboardingModal: React.FC<RoleOnboardingModalProps> = ({
  isOpen,
  initialRole = 'personal',
  onClose,
  onComplete,
}) => {
  const [selectedRole, setSelectedRole] = useState<'personal' | 'school' | 'farmer' | 'buyer'>(initialRole);

  // Personal state
  const [personalActivity, setPersonalActivity] = useState<'running' | 'walking' | 'gym' | 'commute'>('running');
  const [healthSensitivity, setHealthSensitivity] = useState<'none' | 'asthma' | 'elderly' | 'child'>('asthma');

  // School state
  const [campusName, setCampusName] = useState('Kendriya Vidyalaya Kailashahar');
  const [primaryMaxAQI, setPrimaryMaxAQI] = useState(120);

  // Farmer state
  const [farmerDistrict, setFarmerDistrict] = useState('Sangrur');
  const [farmerCrop, setFarmerCrop] = useState('Paddy Straw (Non-Basmati)');
  const [farmerTonnage, setFarmerTonnage] = useState(300);

  // Buyer state
  const [buyerIndustry, setBuyerIndustry] = useState('Bio-CNG Refining Plant');
  const [monthlyCapacity, setMonthlyCapacity] = useState(1500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === 'personal') {
      onComplete('personal', '/personal', `Activity: ${personalActivity}, Sensitivity: ${healthSensitivity}`);
    } else if (selectedRole === 'school') {
      onComplete('school', '/school', `Campus: ${campusName}, Primary Limit: AQI ${primaryMaxAQI}`);
    } else if (selectedRole === 'farmer') {
      onComplete('farmer', '/marketplace', `District: ${farmerDistrict}, Crop: ${farmerCrop}, Tons: ${farmerTonnage}`);
    } else {
      onComplete('buyer', '/marketplace', `Industry: ${buyerIndustry}, Capacity: ${monthlyCapacity}t/mo`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Role-Based Onboarding Portal"
      description="Select your operational persona to configure custom thresholds and open the tailored intelligence view."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedRole('personal')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
              selectedRole === 'personal'
                ? 'bg-forest-800 text-white border-forest-800 shadow-sm'
                : 'bg-white text-gray-800 border-ivory-300 hover:bg-ivory-100'
            }`}
          >
            <User className={`w-5 h-5 ${selectedRole === 'personal' ? 'text-sage-200' : 'text-forest-700'}`} />
            <div>
              <div className="text-xs font-bold leading-tight">Individual</div>
              <div className="text-[10px] opacity-80">Citizen Copilot</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('school')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
              selectedRole === 'school'
                ? 'bg-forest-800 text-white border-forest-800 shadow-sm'
                : 'bg-white text-gray-800 border-ivory-300 hover:bg-ivory-100'
            }`}
          >
            <School className={`w-5 h-5 ${selectedRole === 'school' ? 'text-sage-200' : 'text-forest-700'}`} />
            <div>
              <div className="text-xs font-bold leading-tight">School</div>
              <div className="text-[10px] opacity-80">Principal / Admin</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('farmer')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
              selectedRole === 'farmer'
                ? 'bg-forest-800 text-white border-forest-800 shadow-sm'
                : 'bg-white text-gray-800 border-ivory-300 hover:bg-ivory-100'
            }`}
          >
            <Sprout className={`w-5 h-5 ${selectedRole === 'farmer' ? 'text-sage-200' : 'text-forest-700'}`} />
            <div>
              <div className="text-xs font-bold leading-tight">Farmer / FPO</div>
              <div className="text-[10px] opacity-80">Residue Seller</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('buyer')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
              selectedRole === 'buyer'
                ? 'bg-forest-800 text-white border-forest-800 shadow-sm'
                : 'bg-white text-gray-800 border-ivory-300 hover:bg-ivory-100'
            }`}
          >
            <Factory className={`w-5 h-5 ${selectedRole === 'buyer' ? 'text-sage-200' : 'text-forest-700'}`} />
            <div>
              <div className="text-xs font-bold leading-tight">Bio-Offtaker</div>
              <div className="text-[10px] opacity-80">Processor</div>
            </div>
          </button>
        </div>

        {/* Dynamic Role Configuration Form */}
        <div className="p-4 bg-ivory-100/70 rounded-2xl border border-ivory-300 space-y-4">
          {selectedRole === 'personal' && (
            <div className="space-y-4 text-xs">
              <div className="font-bold text-forest-950 text-sm flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-forest-700" />
                Personal Profile Preferences
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Primary Activity</label>
                  <select
                    value={personalActivity}
                    onChange={(e) => setPersonalActivity(e.target.value as any)}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  >
                    <option value="running">Morning / Evening Running (High Exertion)</option>
                    <option value="walking">Brisk Walking (Moderate Exertion)</option>
                    <option value="gym">Outdoor Calisthenics / Gym</option>
                    <option value="commute">Two-Wheeler / Walking Commute</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Health Sensitivity Multiplier</label>
                  <select
                    value={healthSensitivity}
                    onChange={(e) => setHealthSensitivity(e.target.value as any)}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  >
                    <option value="asthma">Asthma / Respiratory History (+35% Risk Weighting)</option>
                    <option value="cardiac">Cardiac Vulnerability (+30% Risk Weighting)</option>
                    <option value="elderly">Senior Citizen Age 65+ (+25% Weighting)</option>
                    <option value="none">Standard Baseline (No Multiplier)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {selectedRole === 'school' && (
            <div className="space-y-4 text-xs">
              <div className="font-bold text-forest-950 text-sm flex items-center gap-1.5">
                <School className="w-4 h-4 text-forest-700" />
                Institutional Campus Configuration
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Campus Name</label>
                  <input
                    type="text"
                    value={campusName}
                    onChange={(e) => setCampusName(e.target.value)}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Primary Students (Age 5-10) Max AQI</label>
                  <input
                    type="number"
                    value={primaryMaxAQI}
                    onChange={(e) => setPrimaryMaxAQI(Number(e.target.value))}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  />
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    Triggers automated indoor hall relocation
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedRole === 'farmer' && (
            <div className="space-y-4 text-xs">
              <div className="font-bold text-forest-950 text-sm flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-forest-700" />
                Farmer Residue Listing Profile
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">District</label>
                  <select
                    value={farmerDistrict}
                    onChange={(e) => setFarmerDistrict(e.target.value)}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  >
                    <option value="Sangrur">Sangrur, Punjab</option>
                    <option value="Ludhiana">Ludhiana, Punjab</option>
                    <option value="Patiala">Patiala, Punjab</option>
                    <option value="Karnal">Karnal, Haryana</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Residue Type</label>
                  <select
                    value={farmerCrop}
                    onChange={(e) => setFarmerCrop(e.target.value)}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  >
                    <option value="Paddy Straw (Non-Basmati)">Paddy Straw (Non-Basmati)</option>
                    <option value="Basmati Straw">Basmati Straw</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Available Tons</label>
                  <input
                    type="number"
                    value={farmerTonnage}
                    onChange={(e) => setFarmerTonnage(Number(e.target.value))}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedRole === 'buyer' && (
            <div className="space-y-4 text-xs">
              <div className="font-bold text-forest-950 text-sm flex items-center gap-1.5">
                <Factory className="w-4 h-4 text-forest-700" />
                Off-Taker Feedstock Profile
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Industrial Facility Type</label>
                  <select
                    value={buyerIndustry}
                    onChange={(e) => setBuyerIndustry(e.target.value)}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  >
                    <option value="Bio-CNG Refining Plant">Bio-CNG Compressed Biogas Plant</option>
                    <option value="2G Ethanol Bio-Refinery">2G Ethanol Bio-Refinery</option>
                    <option value="Bio-Pellets & Briquettes">Bio-Pellets / Thermal Co-Firing</option>
                    <option value="Kriya Labs Agri-Pulp">Agri-Residue Pulp & Tableware (IIT Delhi)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Monthly Demand (Tons)</label>
                  <input
                    type="number"
                    value={monthlyCapacity}
                    onChange={(e) => setMonthlyCapacity(Number(e.target.value))}
                    className="w-full p-2 bg-white rounded-xl border border-ivory-300 font-medium"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Launch Tailored View
          </Button>
        </div>
      </form>
    </Modal>
  );
};
