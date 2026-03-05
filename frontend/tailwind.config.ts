import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slatebg: '#f4f7fb',
        panel: '#ffffff',
        brand: '#0f766e',
        brandDark: '#115e59',
        accent: '#f59e0b',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
      backgroundImage: {
        glow: 'radial-gradient(circle at 20% 20%, rgba(15,118,110,0.14), transparent 30%), radial-gradient(circle at 80% 0%, rgba(245,158,11,0.12), transparent 35%)',
      },
    },
  },
  plugins: [],
}

export default config
