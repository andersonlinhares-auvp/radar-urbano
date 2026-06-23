export * from './types.js';
export * from './registry.js';
export * from './text-utils.js';
export * from './classifier.js';
export * from './neighborhood-matcher.js';
export * from './http.js';

import { registerAdapter } from './registry.js';
import { ispRjAdapter } from './adapters/isp-rj.js';
import { csvAdapter } from './adapters/csv.js';
import { geoJsonAdapter } from './adapters/geojson.js';
import { publicApiAdapter } from './adapters/public-api.js';
import { dataRioAdapter } from './adapters/data-rio.js';
import { ibgeAdapter } from './adapters/ibge.js';
import { osmAdapter } from './adapters/osm.js';
import { fogoCruzadoAdapter } from './adapters/fogo-cruzado.js';
import { g1RioAdapter, oDiaAdapter, extraAdapter } from './adapters/news.js';
import { ottFacebookAdapter, rioDeNojeiraAdapter } from './adapters/facebook.js';

export {
  ispRjAdapter,
  csvAdapter,
  geoJsonAdapter,
  publicApiAdapter,
  dataRioAdapter,
  ibgeAdapter,
  osmAdapter,
  fogoCruzadoAdapter,
  g1RioAdapter,
  oDiaAdapter,
  extraAdapter,
  ottFacebookAdapter,
  rioDeNojeiraAdapter,
};

registerAdapter(ispRjAdapter);
registerAdapter(csvAdapter);
registerAdapter(geoJsonAdapter);
registerAdapter(publicApiAdapter);
registerAdapter(dataRioAdapter);
registerAdapter(ibgeAdapter);
registerAdapter(osmAdapter);
registerAdapter(fogoCruzadoAdapter);
registerAdapter(g1RioAdapter);
registerAdapter(oDiaAdapter);
registerAdapter(extraAdapter);
registerAdapter(ottFacebookAdapter);
registerAdapter(rioDeNojeiraAdapter);
