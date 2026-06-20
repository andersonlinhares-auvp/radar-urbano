import type { Config } from 'tailwindcss';
import { radarUrbanoPreset } from '@radar-urbano/config/tailwind-preset';
const config: Config = {
  presets: [radarUrbanoPreset],
  content: ['./src/**/*.{ts,tsx}'],
};
export default config;
