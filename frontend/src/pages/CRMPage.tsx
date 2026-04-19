import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import { Prospect, Interaction, ProspectStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import ProspectModal from '../components/ProspectModal';
import InteractionForm from '../components/InteractionForm';
import toast from 'react-hot-toast';

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'prospect_brut', label: 'Prospect brut' },
  { value: 'premier_contact', label: 'Premier contact' },
  { value: 'rdv_fixe', label: 'RDV fixé' },
  { value: 'devis_envoye', label: 'Devis envoyé' },
  { value: 'client_actif', label: 'Client actif' },
  { value: 'perdu', label: 'Perdu' },
];

const interactionTypeIcons: Record<string, string> = {
  appel: '📞',
  rdv: '📅',
  email: '📧',
  note: '📝',
};

export default function CRMPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [emailDraftLoading, setEmailDraftLoading] = useState(false);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);

  const fetchProspects = useCallback(async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await api.get<{ data: Prospect[] }>('/prospects', { params });
      setProspects(response.data.data);
    } catch {
      toast.error('Erreur lors du chargement des prospects');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const fetchInteractions = async (prospectId: number) => {
    setInteractionsLoading(true);
    try {
      const response = await api.get<{ data: Interaction[] }>(`/prospects/${prospectId}/interactions`);
      setInteractions(response.data.data);
    } catch {
      toast.error('Erreur lors du chargement des interactions');
    } finally {
      setInteractionsLoading(false);
    }
  };

  const handleSelectProspect = async (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setShowInteractionForm(false);
    setEmailDraft(null);
    await fetchInteractions(prospect.id);
  };

  const handleStatusChange = async (prospect: Prospect, newStatus: ProspectStatus) => {
    try {
      const response = await api.put<{ data: Prospect }>(`/prospects/${prospect.id}`, {
        status: newStatus,
      });
      const updatedProspect = response.data.data;
      setProspects((prev) => prev.map((p) => (p.id === prospect.id ? updatedProspect : p)));
      if (selectedProspect?.id === prospect.id) {
        setSelectedProspect(updatedProspect);
      }
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleInteractionAdded = async () => {
    setShowInteractionForm(false);
    if (selectedProspect) {
      await fetchInteractions(selectedProspect.id);
      // Refresh prospect to get updated_at
      const response = await api.get<{ data: Prospect }>(`/prospects/${selectedProspect.id}`);
      setSelectedProspect(response.data.data);
    }
    fetchProspects();
  };

  const handleGenerateEmail = async () => {
    if (!selectedProspect) return;
    setEmailDraftLoading(true);
    setEmailDraft(null);
    try {
      const response = await api.post<{ data: { email_draft: string } }>('/agents/draft-email', {
        prospect_id: selectedProspect.id,
      });
      setEmailDraft(response.data.data.email_draft);
      toast.success('Email généré avec succès !');
    } catch {
      toast.error("Erreur lors de la génération de l'email. Vérifiez votre clé API.");
    } finally {
      setEmailDraftLoading(false);
    }
  };

  const handleSaveProspect = (savedProspect: Prospect) => {
    setProspects((prev) => {
      const exists = prev.find((p) => p.id === savedProspect.id);
      if (exists) {
        return prev.map((p) => (p.id === savedProspect.id ? savedProspect : p));
      }
      return [savedProspect, ...prev];
    });
    if (selectedProspect?.id === savedProspect.id) {
      setSelectedProspect(savedProspect);
    }
  };

  const statusTransitions: Record<ProspectStatus, ProspectStatus[]> = {
    prospect_brut: ['premier_contact', 'perdu'],
    premier_contact: ['rdv_fixe', 'perdu'],
    rdv_fixe: ['devis_envoye', 'perdu'],
    devis_envoye: ['client_actif', 'perdu'],
    client_actif: ['perdu'],
    perdu: [],
  };

  const statusLabels: Record<string, string> = {
    premier_contact: 'Premier contact',
    rdv_fixe: 'Fixer RDV',
    devis_envoye: 'Envoyer devis',
    client_actif: 'Convertir en client',
    perdu: 'Marquer perdu',
  };

  return (
    <div className="crm-page">
      {/* Top toolbar */}
      <div className="crm-toolbar">
        <div className="status-filters">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`filter-btn ${statusFilter === filter.value ? 'filter-btn-active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter prospect
        </button>
      </div>

      <div className="crm-layout">
        {/* Prospects table */}
        <div className={`crm-table-section ${selectedProspect ? 'crm-table-narrow' : ''}`}>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Localité</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Dernière interaction</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prospects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      Aucun prospect trouvé
                    </td>
                  </tr>
                ) : (
                  prospects.map((prospect) => (
                    <tr
                      key={prospect.id}
                      className={`table-row ${selectedProspect?.id === prospect.id ? 'table-row-selected' : ''}`}
                      onClick={() => handleSelectProspect(prospect)}
                    >
                      <td>
                        <div>
                          <p className="table-company-name">{prospect.company_name}</p>
                          {prospect.contact_name && (
                            <p className="table-contact-name">{prospect.contact_name}</p>
                          )}
                        </div>
                      </td>
                      <td>{prospect.locality || '—'}</td>
                      <td>
                        {prospect.type ? (
                          <span className="type-tag">{prospect.type}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <StatusBadge status={prospect.status} size="sm" />
                      </td>
                      <td>
                        {prospect.last_interaction_date ? (
                          <span className="date-text">
                            {interactionTypeIcons[prospect.last_interaction_type || ''] || '•'}{' '}
                            {format(new Date(prospect.last_interaction_date), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        ) : (
                          <span className="no-data">Aucune</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingProspect(prospect);
                            setShowEditModal(true);
                          }}
                          className="action-btn"
                          title="Modifier"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selectedProspect && (
          <div className="crm-detail-panel">
            <div className="detail-header">
              <div>
                <h2 className="detail-company">{selectedProspect.company_name}</h2>
                {selectedProspect.contact_name && (
                  <p className="detail-contact">{selectedProspect.contact_name}</p>
                )}
              </div>
              <button onClick={() => setSelectedProspect(null)} className="close-panel-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status */}
            <div className="detail-section">
              <StatusBadge status={selectedProspect.status} />
            </div>

            {/* Info grid */}
            <div className="detail-info-grid">
              {selectedProspect.email && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Email</span>
                  <a href={`mailto:${selectedProspect.email}`} className="detail-info-value detail-link">
                    {selectedProspect.email}
                  </a>
                </div>
              )}
              {selectedProspect.phone && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Téléphone</span>
                  <a href={`tel:${selectedProspect.phone}`} className="detail-info-value detail-link">
                    {selectedProspect.phone}
                  </a>
                </div>
              )}
              {selectedProspect.locality && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Localité</span>
                  <span className="detail-info-value">{selectedProspect.locality}</span>
                </div>
              )}
              {selectedProspect.type && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Type</span>
                  <span className="detail-info-value type-tag">{selectedProspect.type}</span>
                </div>
              )}
              {selectedProspect.siren && (
                <div className="detail-info-item">
                  <span className="detail-info-label">SIREN</span>
                  <span className="detail-info-value">{selectedProspect.siren}</span>
                </div>
              )}
              {selectedProspect.linkedin_url && (
                <div className="detail-info-item">
                  <span className="detail-info-label">LinkedIn</span>
                  <a
                    href={selectedProspect.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-info-value detail-link"
                  >
                    Voir profil
                  </a>
                </div>
              )}
            </div>

            {selectedProspect.notes && (
              <div className="detail-notes">
                <p className="detail-notes-label">Notes</p>
                <p className="detail-notes-text">{selectedProspect.notes}</p>
              </div>
            )}

            {/* Status transitions */}
            <div className="detail-section">
              <p className="detail-section-title">Faire avancer le dossier</p>
              <div className="status-transition-btns">
                {(statusTransitions[selectedProspect.status] || []).map((nextStatus) => (
                  <button
                    key={nextStatus}
                    onClick={() => handleStatusChange(selectedProspect, nextStatus)}
                    className={`transition-btn ${nextStatus === 'perdu' ? 'transition-btn-danger' : 'transition-btn-success'}`}
                  >
                    {statusLabels[nextStatus] || nextStatus}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Email */}
            <div className="detail-section">
              <button
                onClick={handleGenerateEmail}
                className="btn btn-secondary btn-sm btn-full"
                disabled={emailDraftLoading}
              >
                {emailDraftLoading ? 'Génération...' : '✉️ Générer un email IA'}
              </button>

              {emailDraft && (
                <div className="email-draft">
                  <div className="email-draft-header">
                    <p className="email-draft-title">Email généré par IA</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(emailDraft);
                        toast.success('Email copié dans le presse-papier');
                      }}
                      className="copy-btn"
                    >
                      Copier
                    </button>
                  </div>
                  <pre className="email-draft-content">{emailDraft}</pre>
                </div>
              )}
            </div>

            {/* Interactions timeline */}
            <div className="detail-section">
              <div className="detail-section-header">
                <p className="detail-section-title">Historique ({interactions.length})</p>
                <button
                  onClick={() => setShowInteractionForm(!showInteractionForm)}
                  className="btn btn-primary btn-xs"
                >
                  + Ajouter
                </button>
              </div>

              {showInteractionForm && (
                <InteractionForm
                  prospectId={selectedProspect.id}
                  onSuccess={handleInteractionAdded}
                  onCancel={() => setShowInteractionForm(false)}
                />
              )}

              {interactionsLoading ? (
                <div className="loading-mini">Chargement...</div>
              ) : (
                <div className="interactions-timeline">
                  {interactions.length === 0 ? (
                    <p className="no-interactions">Aucune interaction enregistrée</p>
                  ) : (
                    interactions.map((interaction) => (
                      <div key={interaction.id} className="interaction-item">
                        <div className="interaction-dot">
                          {interactionTypeIcons[interaction.type] || '•'}
                        </div>
                        <div className="interaction-content">
                          <div className="interaction-meta">
                            <span className="interaction-type">{interaction.type}</span>
                            <span className="interaction-date">
                              {format(new Date(interaction.date_interaction), 'dd MMM yyyy', { locale: fr })}
                            </span>
                            {interaction.user_name && (
                              <span className="interaction-user">par {interaction.user_name}</span>
                            )}
                          </div>
                          <p className="interaction-cr">{interaction.compte_rendu}</p>
                          {interaction.next_action && (
                            <p className="interaction-next">
                              <strong>Prochaine action:</strong> {interaction.next_action}
                              {interaction.next_action_date && (
                                <span>
                                  {' '}
                                  (
                                  {format(new Date(interaction.next_action_date), 'dd MMM yyyy', {
                                    locale: fr,
                                  })}
                                  )
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Prospect Modal */}
      <ProspectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveProspect}
      />

      {/* Edit Prospect Modal */}
      <ProspectModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProspect(null);
        }}
        onSave={handleSaveProspect}
        prospect={editingProspect}
      />
    </div>
  );
}
