import React from 'react';
import { MarketplaceWorkspaceView } from '../components/marketplace/MarketplaceWorkspaceView';
import { AppRoute } from '../types';

interface MarketplacePreviewPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const MarketplacePreviewPage: React.FC<MarketplacePreviewPageProps> = ({ onNavigate }) => {
  return <MarketplaceWorkspaceView onNavigate={onNavigate} initialMode="public" />;
};
