/** @type {import('tailwindcss').Config} */
export const radarUrbanoPreset = {
  theme: {
    extend: {
      colors: {
        petroleo: {
          100: '#e6f2ef',
          200: '#b8e0d9',
          400: '#3fb6a8',
          500: '#11787f',
          600: '#0e5c63',
          900: '#072e32',
        },
        tinta: '#11181f',
        grafite: '#2b343d',
        ardosia: '#5a6470',
        nevoa: '#9aa4ae',
        linha: '#dad5c9',
        papel: '#ece8df',
        superficie: '#fbfaf6',
        risco: { baixo: '#3e8e7e', medio: '#e0a93b', alto: '#d2702f', critico: '#a8332f' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        serif: ['"IBM Plex Serif"', 'serif'],
      },
      borderRadius: { DEFAULT: '8px' },
    },
  },
};
export default radarUrbanoPreset;
