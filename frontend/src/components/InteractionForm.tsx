import React, { useState } from 'react';
import { InteractionType } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface InteractionFormProps {
  prospectId: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

const typeOptions: { value: InteractionType; label: string; icon: string }[] = [
  { value: 'appel', label: 'Appel téléphonique', icon: '📞' },
  { value: 'rdv', label: 'Rendez-vous', icon: '📅' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'note', label: 'Note interne', icon: '📝' },
];

export default function InteractionForm({ prospectId, onSuccess, onCancel }: InteractionFormProps) {
  const [formData, setFormData] = useState({
    type: 'appel' as InteractionType,
    date_interaction: new Date().toISOString().slice(0, 16),
    compte_rendu: '',
    next_action: '',
    next_action_date: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.compte_rendu.trim()) {
      toast.error('Le compte rendu est requis');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/prospects/${prospectId}/interactions`, formData);
      toast.success('Interaction ajoutée avec succès');
      setFormData({
        type: 'appel',
        date_interaction: new Date().toISOString().slice(0, 16),
        compte_rendu: '',
        next_action: '',
        next_action_date: '',
      });
      onSuccess();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Erreur lors de l\'ajout de l\'interaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="interaction-form">
      <h4 className="interaction-form-title">Ajouter un suivi</h4>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Type d'interaction</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="form-select"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date et heure</label>
          <input
            type="datetime-local"
            name="date_interaction"
            value={formData.date_interaction}
            onChange={handleChange}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Compte rendu *</label>
        <textarea
          name="compte_rendu"
          value={formData.compte_rendu}
          onChange={handleChange}
          className="form-textarea"
          placeholder="Décrivez le déroulement de l'interaction..."
          rows={3}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Prochaine action</label>
          <input
            type="text"
            name="next_action"
            value={formData.next_action}
            onChange={handleChange}
            className="form-input"
            placeholder="Ex: Envoyer devis"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Date prochaine action</label>
          <input
            type="date"
            name="next_action_date"
            value={formData.next_action_date}
            onChange={handleChange}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
            Annuler
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Enregistrement...' : 'Ajouter le suivi'}
        </button>
      </div>
    </form>
  );
}
