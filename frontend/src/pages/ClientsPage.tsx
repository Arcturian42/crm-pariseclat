import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import { Client, ClientStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

interface ClientFormData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  contract_value: string;
  contract_start: string;
  contract_end: string;
  status: ClientStatus;
  notes: string;
}

const defaultFormData: ClientFormData = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  contract_value: '',
  contract_start: '',
  contract_end: '',
  status: 'actif',
  notes: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(defaultFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get<{ data: Client[] }>('/clients');
      setClients(response.data.data);
    } catch {
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      company_name: client.company_name || '',
      contact_name: client.contact_name || '',
      email: client.email || '',
      phone: client.phone || '',
      contract_value: client.contract_value?.toString() || '',
      contract_start: client.contract_start ? client.contract_start.split('T')[0] : '',
      contract_end: client.contract_end ? client.contract_end.split('T')[0] : '',
      status: client.status || 'actif',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      toast.error('Le nom de la société est requis');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        contract_start: formData.contract_start || null,
        contract_end: formData.contract_end || null,
      };

      if (editingClient) {
        const response = await api.put<{ data: Client }>(`/clients/${editingClient.id}`, payload);
        setClients((prev) =>
          prev.map((c) => (c.id === editingClient.id ? response.data.data : c))
        );
        toast.success('Client mis à jour avec succès');
      } else {
        const response = await api.post<{ data: Client }>('/clients', payload);
        setClients((prev) => [response.data.data, ...prev]);
        toast.success('Client créé avec succès');
      }
      setShowModal(false);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setFormLoading(false);
    }
  };

  const totalRevenue = clients.reduce((sum, c) => sum + (c.contract_value || 0), 0);
  const activeClients = clients.filter((c) => c.status === 'actif').length;
  const renewalClients = clients.filter((c) => c.status === 'renouvellement').length;

  return (
    <div className="clients-page">
      {/* Summary cards */}
      <div className="clients-summary">
        <div className="summary-card">
          <p className="summary-label">Total clients</p>
          <p className="summary-value">{clients.length}</p>
        </div>
        <div className="summary-card summary-card-green">
          <p className="summary-label">Clients actifs</p>
          <p className="summary-value">{activeClients}</p>
        </div>
        <div className="summary-card summary-card-orange">
          <p className="summary-label">Renouvellements</p>
          <p className="summary-value">{renewalClients}</p>
        </div>
        <div className="summary-card summary-card-blue">
          <p className="summary-label">Revenue total</p>
          <p className="summary-value">{totalRevenue.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <p className="table-desc">
            {clients.length} client{clients.length !== 1 ? 's' : ''} dans votre base
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Ajouter client
        </button>
      </div>

      {/* Main layout: table + detail */}
      <div className="clients-layout">
        {/* Table */}
        <div className={`table-container ${selectedClient ? 'table-narrow' : ''}`}>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Contact</th>
                  <th>Valeur contrat</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      Aucun client trouvé
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr
                      key={client.id}
                      className={`table-row ${selectedClient?.id === client.id ? 'table-row-selected' : ''}`}
                      onClick={() => setSelectedClient(client.id === selectedClient?.id ? null : client)}
                    >
                      <td>
                        <p className="table-company-name">{client.company_name}</p>
                        {client.email && (
                          <p className="table-contact-name">{client.email}</p>
                        )}
                      </td>
                      <td>
                        {client.contact_name ? (
                          <div>
                            <p className="contact-name">{client.contact_name}</p>
                            {client.phone && (
                              <p className="table-contact-name">{client.phone}</p>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {client.contract_value ? (
                          <span className="contract-value">
                            {client.contract_value.toLocaleString('fr-FR')} €
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {client.contract_start ? (
                          format(new Date(client.contract_start), 'dd/MM/yyyy', { locale: fr })
                        ) : '—'}
                      </td>
                      <td>
                        {client.contract_end ? (
                          <span className={
                            new Date(client.contract_end) < new Date()
                              ? 'date-expired'
                              : new Date(client.contract_end) < new Date(Date.now() + 30 * 24 * 3600 * 1000)
                              ? 'date-expiring'
                              : ''
                          }>
                            {format(new Date(client.contract_end), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <StatusBadge status={client.status} size="sm" />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditModal(client)}
                          className="action-btn"
                          title="Modifier"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

        {/* Client detail */}
        {selectedClient && (
          <div className="client-detail-panel">
            <div className="detail-header">
              <h3 className="detail-company">{selectedClient.company_name}</h3>
              <button onClick={() => setSelectedClient(null)} className="close-panel-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <StatusBadge status={selectedClient.status} />

            <div className="detail-info-grid" style={{ marginTop: '16px' }}>
              {selectedClient.contact_name && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Contact</span>
                  <span className="detail-info-value">{selectedClient.contact_name}</span>
                </div>
              )}
              {selectedClient.email && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Email</span>
                  <a href={`mailto:${selectedClient.email}`} className="detail-info-value detail-link">
                    {selectedClient.email}
                  </a>
                </div>
              )}
              {selectedClient.phone && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Téléphone</span>
                  <a href={`tel:${selectedClient.phone}`} className="detail-info-value detail-link">
                    {selectedClient.phone}
                  </a>
                </div>
              )}
              {selectedClient.contract_value && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Valeur contrat</span>
                  <span className="detail-info-value contract-value">
                    {selectedClient.contract_value.toLocaleString('fr-FR')} €
                  </span>
                </div>
              )}
              {selectedClient.contract_start && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Début contrat</span>
                  <span className="detail-info-value">
                    {format(new Date(selectedClient.contract_start), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
              {selectedClient.contract_end && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Fin contrat</span>
                  <span className={`detail-info-value ${
                    new Date(selectedClient.contract_end) < new Date() ? 'date-expired' : ''
                  }`}>
                    {format(new Date(selectedClient.contract_end), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>

            {selectedClient.notes && (
              <div className="detail-notes" style={{ marginTop: '16px' }}>
                <p className="detail-notes-label">Notes</p>
                <p className="detail-notes-text">{selectedClient.notes}</p>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <button onClick={() => openEditModal(selectedClient)} className="btn btn-primary btn-sm btn-full">
                Modifier ce client
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group form-group-full">
                  <label className="form-label">Société *</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Nom de la société"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact</label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Nom du contact"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="email@exemple.fr"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Valeur contrat (€)</label>
                  <input
                    type="number"
                    name="contract_value"
                    value={formData.contract_value}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="24000"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Statut</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="renouvellement">Renouvellement</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Début contrat</label>
                  <input
                    type="date"
                    name="contract_start"
                    value={formData.contract_start}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fin contrat</label>
                  <input
                    type="date"
                    name="contract_end"
                    value={formData.contract_end}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="Notes sur ce client..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Enregistrement...' : editingClient ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
