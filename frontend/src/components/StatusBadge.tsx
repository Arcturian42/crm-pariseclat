import React from 'react';
import { ProspectStatus } from '../types';

interface StatusBadgeProps {
  status: ProspectStatus | string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  prospect_brut: { label: 'Prospect brut', className: 'badge-gray' },
  premier_contact: { label: 'Premier contact', className: 'badge-blue' },
  rdv_fixe: { label: 'RDV fixé', className: 'badge-orange' },
  devis_envoye: { label: 'Devis envoyé', className: 'badge-purple' },
  client_actif: { label: 'Client actif', className: 'badge-green' },
  perdu: { label: 'Perdu', className: 'badge-red' },
  // Client statuses
  actif: { label: 'Actif', className: 'badge-green' },
  inactif: { label: 'Inactif', className: 'badge-gray' },
  renouvellement: { label: 'Renouvellement', className: 'badge-orange' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'badge-gray' };

  return (
    <span className={`badge ${config.className} ${size === 'sm' ? 'badge-sm' : ''}`}>
      {config.label}
    </span>
  );
}

export { statusConfig };
