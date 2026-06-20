import type { CategorySlug, SourceKind } from '@radar-urbano/core';

export interface NormalizedIncident {
  externalId: string;
  categorySlug: CategorySlug;
  title: string;
  description?: string;
  lng: number;
  lat: number;
  occurredAt: Date;
}

export interface RawRecord {
  [key: string]: unknown;
}

export interface SourceAdapter {
  id: string;
  sourceKind: SourceKind;
  fetch(params?: Record<string, unknown>): Promise<RawRecord[]>;
  normalize(raw: RawRecord): NormalizedIncident;
}
