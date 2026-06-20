export * from './types.js';
export * from './registry.js';

import { registerAdapter } from './registry.js';
import { ispRjAdapter } from './adapters/isp-rj.js';
import { csvAdapter } from './adapters/csv.js';
import { geoJsonAdapter } from './adapters/geojson.js';
import { publicApiAdapter } from './adapters/public-api.js';

export { ispRjAdapter, csvAdapter, geoJsonAdapter, publicApiAdapter };

registerAdapter(ispRjAdapter);
registerAdapter(csvAdapter);
registerAdapter(geoJsonAdapter);
registerAdapter(publicApiAdapter);
