import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import { Prospect, ProspectStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import ProspectModal from '../components/ProspectModal';
import toast from 'react-hot-toast';

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'prospect_brut', label: 'Prospect brut' },
  { value: 'premier_contact', label: 'Premier contact' },
  { value: 'rdv_fixe', label: 'RDV fixé' },
  { value: 'devis_envoye', label: 'Devis envoyé' },
  { value: 'client_actif', label: 'Client actif' },
  { value: 'perdu', label: 'Perdu' },
];

const typeOptions: { value: string; label: string }[] = [
  { value: '', label: 'Tous les types' },
  { value: 'padel', label: 'Padel' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'spa', label: 'Spa' },
  { value: 'tennis', label: 'Tennis' },
];

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await api.get<{ data: Prospect[] }>('/prospects', { params });
      let data = response.data.data;

      // Client-side type filter
      if (typeFilter) {
        data = data.filter((p) => p.type === typeFilter);
      }

      setProspects(data);
    } catch {
      toast.error('Erreur lors du chargement des prospects');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchProspects, 300);
    return () => clearTimeout(debounce);
  }, [fetchProspects]);

  const handleEnrich = async (prospect: Prospect) => {
    setEnrichingId(prospect.id);
    try {
      const response = await api.post<{ data: { prospect: Prospect; enriched_fields: Record<string, unknown> } }>(
        `/prospects/${prospect.id}/enrich`
      );
      const updatedProspect = response.data.data.prospect;
      setProspects((prev) => prev.map((p) => (p.id === prospect.id ? updatedProspect : p)));
      toast.success(`${prospect.company_name} enrichi avec succès !`);
    } catch {
      toast.error("Erreur lors de l'enrichissement");
    } finally {
      setEnrichingId(null);
    }
  };

  const handleDelete = async (prospect: Prospect) => {
    if (!confirm(`Supprimer ${prospect.company_name} ? Cette action est irréversible.`)) return;

    setDeletingId(prospect.id);
    try {
      await api.delete(`/prospects/${prospect.id}`);
      setProspects((prev) => prev.filter((p) => p.id !== prospect.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(prospect.id);
        return next;
      });
      toast.success('Prospect supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
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
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(prospects.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExportSelected = () => {
    const toExport =
      selectedIds.size > 0 ? prospects.filter((p) => selectedIds.has(p.id)) : prospects;

    const headers = [
      'Société', 'Contact', 'Email', 'Téléphone', 'Localité', 'Type',
      'Statut', 'SIREN', 'LinkedIn', 'Notes', 'Créé le', 'Modifié le',
    ];

    const rows = toExport.map((p: Prospect) => [
      p.company_name,
      p.contact_name || '',
      p.email || '',
      p.phone || '',
      p.locality || '',
      p.type || '',
      p.status,
      p.siren || '',
      p.linkedin_url || '',
      p.notes || '',
      format(new Date(p.created_at), 'dd/MM/yyyy'),
      format(new Date(p.updated_at), 'dd/MM/yyyy'),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prospects-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${toExport.length} prospects exportés`);
  };

  const handleStatusChange = async (prospect: Prospect, newStatus: ProspectStatus) => {
    try {
      const response = await api.put<{ data: Prospect }>(`/prospects/${prospect.id}`, {
        status: newStatus,
      });
      setProspects((prev) => prev.map((p) => (p.id === prospect.id ? response.data.data : p)));
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="prospects-page">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <div className="search-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select filter-select"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-select filter-select"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-actions">
          {selectedIds.size > 0 && (
            <span className="selected-count">{selectedIds.size} sélectionné(s)</span>
          )}
          <button onClick={handleExportSelected} className="btn btn-secondary btn-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exporter{selectedIds.size > 0 ? ` (${selectedIds.size})` : ' tout'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouveau prospect
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="results-count">
        {loading ? 'Chargement...' : `${prospects.length} prospect${prospects.length !== 1 ? 's' : ''}`}
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.size === prospects.length && prospects.length > 0}
                    className="checkbox"
                  />
                </th>
                <th>Société</th>
                <th>Contact</th>
                <th>Localité</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Enrichi</th>
                <th>Dernière MAJ</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prospects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row">
                    Aucun prospect trouvé
                  </td>
                </tr>
              ) : (
                prospects.map((prospect) => (
                  <tr key={prospect.id} className={selectedIds.has(prospect.id) ? 'row-selected' : ''}>
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(prospect.id)}
                        onChange={() => handleSelectOne(prospect.id)}
                        className="checkbox"
                      />
                    </td>
                    <td>
                      <p className="table-company-name">{prospect.company_name}</p>
                      {prospect.email && (
                        <p className="table-contact-name">{prospect.email}</p>
                      )}
                    </td>
                    <td>
                      {prospect.contact_name ? (
                        <div>
                          <p className="contact-name">{prospect.contact_name}</p>
                          {prospect.phone && (
                            <p className="table-contact-name">{prospect.phone}</p>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td>{prospect.locality || '—'}</td>
                    <td>
                      {prospect.type ? (
                        <span className="type-tag">{prospect.type}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <select
                        value={prospect.status}
                        onChange={(e) =>
                          handleStatusChange(prospect, e.target.value as ProspectStatus)
                        }
                        className="status-select"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {statusOptions
                          .filter((o) => o.value)
                          .map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      {prospect.enriched_at ? (
                        <span className="enriched-badge" title={format(new Date(prospect.enriched_at), 'dd/MM/yyyy HH:mm')}>
                          ✓ Enrichi
                        </span>
                      ) : (
                        <span className="not-enriched">—</span>
                      )}
                    </td>
                    <td>
                      <span className="date-text">
                        {format(new Date(prospect.updated_at), 'dd/MM/yy', { locale: fr })}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          onClick={() => handleEnrich(prospect)}
                          className="action-btn action-btn-enrich"
                          disabled={enrichingId === prospect.id}
                          title="Enrichir avec Clay"
                        >
                          {enrichingId === prospect.id ? '...' : '⚡'}
                        </button>
                        <button
                          onClick={() => setEditingProspect(prospect)}
                          className="action-btn"
                          title="Modifier"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(prospect)}
                          className="action-btn action-btn-danger"
                          disabled={deletingId === prospect.id}
                          title="Supprimer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      <ProspectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveProspect}
      />

      {/* Edit Modal */}
      {editingProspect && (
        <ProspectModal
          isOpen={!!editingProspect}
          onClose={() => setEditingProspect(null)}
          onSave={handleSaveProspect}
          prospect={editingProspect}
        />
      )}
    </div>
  );
}
