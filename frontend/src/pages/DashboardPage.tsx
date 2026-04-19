import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import { DashboardStats, Prospect, AIAnalysis } from '../types';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

const statusOrder = ['prospect_brut', 'premier_contact', 'rdv_fixe', 'devis_envoye', 'client_actif', 'perdu'];
const statusLabels: Record<string, string> = {
  prospect_brut: 'Prospect brut',
  premier_contact: 'Premier contact',
  rdv_fixe: 'RDV fixé',
  devis_envoye: 'Devis envoyé',
  client_actif: 'Client actif',
  perdu: 'Perdu',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get<{ data: DashboardStats }>('/dashboard/stats');
      setStats(response.data.data);
    } catch {
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAiLoading(true);
    try {
      const response = await api.post<{ data: AIAnalysis }>('/agents/analyze');
      setAiAnalysis(response.data.data);
      toast.success('Analyse IA terminée !');
    } catch {
      toast.error("Erreur lors de l'analyse IA. Vérifiez votre clé API Anthropic.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!stats?.pipeline) return;

    const headers = ['Société', 'Contact', 'Localité', 'Type', 'Statut', 'Dernière interaction', 'Assigné à'];
    const rows = stats.pipeline.map((p: Prospect) => [
      p.company_name,
      p.contact_name || '',
      p.locality || '',
      p.type || '',
      p.status,
      p.last_interaction_date ? format(new Date(p.last_interaction_date), 'dd/MM/yyyy') : '',
      p.assigned_user_name || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prospects-pariseclat-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export CSV téléchargé');
  };

  const groupByStatus = (prospects: Prospect[]) => {
    const grouped: Record<string, Prospect[]> = {};
    statusOrder.forEach((status) => {
      grouped[status] = [];
    });
    prospects.forEach((p) => {
      if (grouped[p.status]) {
        grouped[p.status].push(p);
      }
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement du dashboard...</p>
      </div>
    );
  }

  const groupedProspects = stats?.pipeline ? groupByStatus(stats.pipeline) : {};

  return (
    <div className="dashboard">
      {/* Stats row */}
      <div className="stats-grid">
        <StatsCard
          title="Total Prospects"
          value={stats?.total_prospects || 0}
          subtitle="Dans le pipeline"
          color="blue"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatsCard
          title="Clients Actifs"
          value={stats?.total_clients || 0}
          subtitle="Contrats en cours"
          color="green"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <StatsCard
          title="Taux de Conversion"
          value={`${stats?.conversion_rate || 0}%`}
          subtitle="Prospects → Clients"
          color="orange"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          }
        />
        <StatsCard
          title="Revenue Forecast"
          value={`${(stats?.revenue_forecast || 0).toLocaleString('fr-FR')} €`}
          subtitle="Contrats actifs"
          color="purple"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      {/* Secondary stats */}
      <div className="secondary-stats">
        <div className="secondary-stat-card">
          <span className="secondary-stat-label">Nouveaux prospects (30j)</span>
          <span className="secondary-stat-value">{stats?.monthly_new_prospects || 0}</span>
        </div>
        <div className="secondary-stat-card">
          <span className="secondary-stat-label">Interactions cette semaine</span>
          <span className="secondary-stat-value">{stats?.interactions_this_week || 0}</span>
        </div>
      </div>

      {/* Pipeline and AI section */}
      <div className="dashboard-main">
        {/* Pipeline kanban */}
        <section className="pipeline-section">
          <div className="section-header">
            <h2 className="section-title">Pipeline Commercial</h2>
            <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>

          <div className="pipeline-board">
            {statusOrder.map((status) => {
              const prospects = groupedProspects[status] || [];
              return (
                <div key={status} className="pipeline-column">
                  <div className="pipeline-column-header">
                    <StatusBadge status={status} size="sm" />
                    <span className="pipeline-count">{prospects.length}</span>
                  </div>
                  <div className="pipeline-cards">
                    {prospects.map((prospect: Prospect) => (
                      <div key={prospect.id} className="pipeline-card">
                        <p className="pipeline-card-company">{prospect.company_name}</p>
                        {prospect.locality && (
                          <p className="pipeline-card-locality">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {prospect.locality}
                          </p>
                        )}
                        {prospect.last_interaction_date && (
                          <p className="pipeline-card-date">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {format(new Date(prospect.last_interaction_date), 'dd MMM', { locale: fr })}
                          </p>
                        )}
                      </div>
                    ))}
                    {prospects.length === 0 && (
                      <div className="pipeline-empty">Aucun prospect</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Agent section */}
        <section className="ai-section">
          <div className="section-header">
            <h2 className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z" />
                <path d="M12 6v6l4 2" />
              </svg>
              Agent IA - Priorités
            </h2>
          </div>

          <div className="ai-card">
            <p className="ai-description">
              L'agent IA analyse votre pipeline et recommande les 5 prospects à prioriser pour maximiser vos conversions.
            </p>
            <button
              onClick={handleAnalyze}
              className="btn btn-primary"
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <span className="btn-spinner"></span>
                  Analyse en cours...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Analyser les prospects
                </>
              )}
            </button>

            {aiAnalysis && (
              <div className="ai-results">
                {aiAnalysis.analysis_summary && (
                  <div className="ai-summary">
                    <p className="ai-summary-text">{aiAnalysis.analysis_summary}</p>
                  </div>
                )}
                <div className="ai-recommendations">
                  {aiAnalysis.recommendations.map((rec, index) => (
                    <div key={rec.prospect_id} className="ai-recommendation">
                      <div className="ai-rec-header">
                        <span className="ai-rec-rank">#{index + 1}</span>
                        <span className="ai-rec-company">{rec.company_name}</span>
                        <span className="ai-rec-score">Score: {rec.priority_score}/10</span>
                      </div>
                      <p className="ai-rec-reasoning">{rec.reasoning}</p>
                      <p className="ai-rec-action">
                        <strong>Action suggérée:</strong> {rec.suggested_action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status distribution */}
          <div className="status-distribution">
            <h3 className="distribution-title">Répartition par statut</h3>
            {statusOrder.map((status) => {
              const count = stats?.prospects_by_status?.[status] || 0;
              const total = stats?.total_prospects || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={status} className="distribution-row">
                  <span className="distribution-label">{statusLabels[status]}</span>
                  <div className="distribution-bar-container">
                    <div
                      className="distribution-bar"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="distribution-count">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
