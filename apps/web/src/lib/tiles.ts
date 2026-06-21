const TILE_SIZE = 256;

function lonOfTileX(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180;
}

function latOfTileY(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function tileToBBox(z: number, x: number, y: number) {
  return {
    west: lonOfTileX(x, z),
    east: lonOfTileX(x + 1, z),
    north: latOfTileY(y, z),
    south: latOfTileY(y + 1, z),
  };
}

/** Converte lng/lat para pixel (0..256) dentro do tile z/x/y. */
export function lngLatToTilePixel(lng: number, lat: number, z: number, x: number, y: number) {
  const n = 2 ** z;
  const px = ((lng + 180) / 360) * n - x;
  const latRad = (lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n - y;
  return { px: px * TILE_SIZE, py: py * TILE_SIZE };
}

export const TILE_SIZE_PX = TILE_SIZE;
