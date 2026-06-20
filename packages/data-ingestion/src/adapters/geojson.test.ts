import { describe, it, expect } from 'vitest';
import { geoJsonAdapter } from './geojson.js';

describe('geoJsonAdapter.normalize', () => {
  it('maps a GeoJSON feature to a NormalizedIncident', () => {
    const result = geoJsonAdapter.normalize({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-43.17, -22.9] },
      properties: {
        externalId: 'x1',
        category: 'outro',
        title: 'Teste',
        occurredAt: '2026-06-01T12:00:00Z',
      },
    });
    expect(result.lng).toBe(-43.17);
    expect(result.lat).toBe(-22.9);
    expect(result.categorySlug).toBe('outro');
    expect(result.occurredAt).toBeInstanceOf(Date);
  });
});
