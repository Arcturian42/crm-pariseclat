import React, { useState, useEffect } from 'react';
import { Prospect, ProspectStatus } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface ProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prospect: Prospect) => void;
  prospect?: Prospect | null;
  title?: string;
}

const statusOptions: { value: ProspectStatus; label: string }[] = [
  { value: 'prospect_brut', label: 'Prospect brut' },
  { value: 'premier_contact', label: 'Premier contact' },
  { value: 'rdv_fixe', label: 'RDV fixé' },
  { value: 'devis_envoye', label: 'Devis envoyé' },
  { value: 'client_actif', label: 'Client actif' },
  { value: 'perdu', label: 'Perdu' },
];

const typeOptions = [
  { value: 'padel', label: 'Padel' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'spa', label: 'Spa' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'autre', label: 'Autre' },
];

export default function ProspectModal({ isOpen, onClose, onSave, prospect, title }: ProspectModalProps) {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    locality: '',
    type: '',
    status: 'prospect_brut' as ProspectStatus,
    notes: '',
    linkedin_url: '',
    siren: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prospect) {
      setFormData({
        company_name: prospect.company_name || '',
        contact_name: prospect.contact_name || '',
        email: prospect.email || '',
        phone: prospect.phone || '',
        locality: prospect.locality || '',
        type: prospect.type || '',
        status: prospect.status || 'prospect_brut',
        notes: prospect.notes || '',
        linkedin_url: prospect.linkedin_url || '',
        siren: prospect.siren || '',
        address: prospect.address || '',
      });
    } else {
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        locality: '',
        type: '',
        status: 'prospect_brut',
        notes: '',
        linkedin_url: '',
        siren: '',
        address: '',
      });
    }
  }, [prospect, isOpen]);

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

    setLoading(true);
    try {
      let response;
      if (prospect) {
        response = await api.put<{ data: Prospect }>(`/prospects/${prospect.id}`, formData);
        toast.success('Prospect mis à jour avec succès');
      } else {
        response = await api.post<{ data: Prospect }>('/prospects', formData);
        toast.success('Prospect créé avec succès');
      }
      onSave(response.data.data);
      onClose();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title || (prospect ? 'Modifier le prospect' : 'Nouveau prospect')}</h2>
          <button onClick={onClose} className="modal-close">
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
              <label className="form-label">Localité</label>
              <input
                type="text"
                name="locality"
                value={formData.locality}
                onChange={handleChange}
                className="form-input"
                placeholder="Paris 16ème"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Sélectionner un type</option>
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Statut</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="form-select"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">SIREN</label>
              <input
                type="text"
                name="siren"
                value={formData.siren}
                onChange={handleChange}
                className="form-input"
                placeholder="123456789"
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">LinkedIn</label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleChange}
                className="form-input"
                placeholder="https://www.linkedin.com/company/..."
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Adresse</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="form-input"
                placeholder="12 Rue de la Paix, 75001 Paris"
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Notes sur ce prospect..."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : prospect ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
