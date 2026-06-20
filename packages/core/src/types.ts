export type SourceKind = 'OFFICIAL' | 'COMMUNITY' | 'NEWS' | 'PARTNER';

export type IncidentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'RESOLVED';

export type CategoryGroup = 'pessoa' | 'patrimonio' | 'violencia_armada' | 'mobilidade' | 'outros';

export type CategorySlug =
  | 'roubo-celular'
  | 'furto-celular'
  | 'assalto-mao-armada'
  | 'tentativa-assalto'
  | 'arrastao'
  | 'roubo-veiculo'
  | 'furto-veiculo'
  | 'roubo-carga'
  | 'golpe'
  | 'disparo-arma'
  | 'tiroteio'
  | 'confronto-policial'
  | 'sequestro-relampago'
  | 'violencia-contra-mulher'
  | 'assedio'
  | 'vandalismo'
  | 'area-alagada'
  | 'via-interditada'
  | 'outro';

export interface IncidentCategory {
  slug: CategorySlug;
  label: string;
  group: CategoryGroup;
  icon: string; // nome de ícone (lucide)
  color: string; // hex
  riskWeight: number; // 0..1
  description: string;
}

export type RiskBand = 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface TrustInput {
  sourceKind: SourceKind;
  confirms: number;
  disputes: number;
  authorReputation: number; // 0..REP_MAX
  hasPhoto: boolean;
  hasVideo: boolean;
  recurrenceCount: number; // similares no raio/janela
}

export interface RiskInput {
  categoryWeight: number; // 0..1
  trustScore: number; // 0..100
  ageDays: number;
}
