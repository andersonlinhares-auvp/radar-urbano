export * from './types.js';
export * from './registry.js';

import { registerAdapter } from './registry.js';
import { ispRjAdapter } from './adapters/isp-rj.js';
import { csvAdapter } from './adapters/csv.js';
import { geoJsonAdapter } from './adapters/geojson.js';
import { publicApiAdapter } from './adapters/public-api.js';
import { dataRioAdapter } from './adapters/data-rio.js';
import { ibgeAdapter } from './adapters/ibge.js';
import { osmAdapter } from './adapters/osm.js';

export {
  ispRjAdapter,
  csvAdapter,
  geoJsonAdapter,
  publicApiAdapter,
  dataRioAdapter,
  ibgeAdapter,
  osmAdapter,
};

registerAdapter(ispRjAdapter);
registerAdapter(csvAdapter);
registerAdapter(geoJsonAdapter);
registerAdapter(publicApiAdapter);
registerAdapter(dataRioAdapter);
registerAdapter(ibgeAdapter);
registerAdapter(osmAdapter);
