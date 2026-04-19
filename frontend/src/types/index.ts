export interface User {
  id: number;
  email: string;
  name: string;
  role: 'directeur' | 'commercial';
  created_at?: string;
}

export type ProspectStatus =
  | 'prospect_brut'
  | 'premier_contact'
  | 'rdv_fixe'
  | 'devis_envoye'
  | 'client_actif'
  | 'perdu';

export interface Prospect {
  id: number;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  locality: string | null;
  type: string | null;
  status: ProspectStatus;
  notes: string | null;
  assigned_to: number | null;
  assigned_user_name?: string | null;
  linkedin_url: string | null;
  siren: string | null;
  address: string | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
  last_interaction_date?: string | null;
  last_interaction_type?: string | null;
  interactions?: Interaction[];
}

export type ClientStatus = 'actif' | 'inactif' | 'renouvellement';

export interface Client {
  id: number;
  prospect_id: number | null;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  contract_value: number | null;
  contract_start: string | null;
  contract_end: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  locality?: string | null;
  prospect_type?: string | null;
}

export type InteractionType = 'appel' | 'rdv' | 'email' | 'note';

export interface Interaction {
  id: number;
  prospect_id: number;
  user_id: number;
  user_name?: string;
  type: InteractionType;
  date_interaction: string;
  compte_rendu: string;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_prospects: number;
  total_clients: number;
  prospects_by_status: Record<string, number>;
  revenue_forecast: number;
  conversion_rate: number;
  monthly_new_prospects: number;
  interactions_this_week: number;
  pipeline: Prospect[];
}

export interface AIRecommendation {
  prospect_id: number;
  company_name: string;
  priority_score: number;
  reasoning: string;
  suggested_action: string;
}

export interface AIAnalysis {
  recommendations: AIRecommendation[];
  analysis_summary: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}

export interface ApiError {
  error: string;
  message: string;
}
