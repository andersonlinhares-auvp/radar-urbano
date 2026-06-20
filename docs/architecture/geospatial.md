# Arquitetura geoespacial

## Decisões de design

### Biblioteca de mapas: MapLibre GL JS

O Radar Urbano usa **MapLibre GL JS** em vez de Leaflet (StreetSignal original) ou Google Maps. Razões:

- **Renderização WebGL**: suavidade e performance em mobile, sem degradação em zoom alto.
- **Tiles vetoriais**: estilo dinâmico do lado do cliente (cores, espessura, filtros) sem recarregar o servidor.
- **Licença open-source** (BSD-3): sem custo de API key, sem rastreamento de terceiros.
- **Estilos intercambiáveis**: qualquer endpoint de estilo MapLibre/Mapbox é aceito via variável de ambiente.

O componente de mapa fica em `apps/web/src/components/Map.tsx` e é renderizado na rota `/mapa`.

### Tiles: OpenStreetMap (sem Google)

A URL de estilo padrão é configurada via:

```bash
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

Em produção, substitua por um endpoint de tiles OSM auto-hospedado (ex.: Protomaps, MapTiler OSM) ou um estilo customizado. A atribuição exigida pelo OSM é `© OpenStreetMap contributors`. Dados do município do Rio de Janeiro (quando usados) exigem atribuição `© PCRJ`.

---

## PostGIS: tipos e SRID

Todas as colunas geoespaciais usam **SRID 4326** (WGS84 — coordenadas em graus decimais, longitude/latitude).

| Tipo                          | Tabelas                                            | Uso                                 |
| ----------------------------- | -------------------------------------------------- | ----------------------------------- |
| `geography(Point,4326)`       | `incidents.location`, `alert_subscriptions.center` | Ponto geográfico preciso (lng, lat) |
| `geometry(MultiPolygon,4326)` | `regions.geom`, `neighborhoods.geom`               | Polígonos de regiões e bairros      |

#### Diferença geography vs. geometry no PostGIS

- **`geography`**: opera em coordenadas esféricas; funções como `ST_DWithin` calculam distâncias em metros diretamente. Ideal para pontos de incidentes e centros de alerta.
- **`geometry`**: opera em plano cartesiano (mais rápido); usado para polígonos de bairros/regiões, onde a precisão esférica é menos crítica para o caso de uso.

#### Customização via Drizzle

O `drizzle-kit` não reconhece `geography` como tipo nativo e o cotaria incorretamente. Por isso ambos os tipos são declarados via `customType`:

```ts
const geographyPoint = customType<{ data: string }>({
  dataType: () => 'geography(Point,4326)',
});
const geometryMultiPolygon = customType<{ data: string }>({
  dataType: () => 'geometry(MultiPolygon,4326)',
});
```

Ver `packages/db/src/schema.ts` e a nota de migrações em `docs/architecture/database.md`.

---

## Índices GiST

Todo coluna de tipo espacial possui um índice **GiST** criado automaticamente pelo schema:

| Índice                   | Tabela                | Coluna     |
| ------------------------ | --------------------- | ---------- |
| `regions_geom_idx`       | `regions`             | `geom`     |
| `neighborhoods_geom_idx` | `neighborhoods`       | `geom`     |
| `incidents_location_idx` | `incidents`           | `location` |
| `alert_center_idx`       | `alert_subscriptions` | `center`   |

Os índices GiST habilitam operadores espaciais eficientes (`&&`, `<->`) e funções PostGIS como `ST_DWithin`, `ST_Within`, `ST_Intersects` sem full table scan.

---

## Consultas espaciais comuns

### Buscar incidentes em bounding box (API `/api/incidents?bbox=`)

```sql
SELECT * FROM incidents
WHERE ST_Within(
  location::geometry,
  ST_MakeEnvelope(:west, :south, :east, :north, 4326)
);
```

### Buscar incidentes próximos a um ponto (alerta de área)

```sql
SELECT * FROM incidents
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
  :radius_meters
);
```

### Determinar bairro de um incidente

```sql
SELECT n.id
FROM neighborhoods n
WHERE ST_Within(
  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
  n.geom
)
LIMIT 1;
```

---

## Estilos de mapa (planejados)

O produto prevê quatro estilos selecionáveis pelo usuário:

| Estilo   | Descrição                                  |
| -------- | ------------------------------------------ |
| Claro    | Fundo papel `#ECE8DF`, linhas cinza-claro  |
| Escuro   | Fundo tinta `#11181F`, linhas ardósia      |
| Híbrido  | Satélite com sobreposição vetorial de ruas |
| Satélite | Imagens aéreas sem vetores                 |

Cada estilo corresponde a uma URL de estilo MapLibre separada. A implementação atual usa o estilo padrão via `NEXT_PUBLIC_MAP_STYLE_URL`.

---

## Heatmap de risco

Cores do heatmap definidas em `global-constraints.md` e nos design tokens:

```
#3FB6A8 (baixo) → #A9CF7E → #E0A93B (médio) → #D2702F (alto) → #A8332F (crítico)
```

A sobreposição de heatmap é alimentada pelos scores da tabela `risk_scores`, consultados via `DISTINCT ON (ref_id) ORDER BY computed_at DESC`.
