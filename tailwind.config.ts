import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FAFAFA',
          foreground: '#18181B'
        },
        primaryAccent: '#18181B',
        brand: '#FF4017',
        background: {
          DEFAULT: '#111113',
          secondary: '#27272A'
        },
        secondary: {
          DEFAULT: '#f5f5f5',
          foreground: '#18181B'
        },
        border: 'rgba(var(--color-border-default))',
        accent: {
          DEFAULT: '#27272A',
          foreground: '#FAFAFA'
        },
        muted: {
          DEFAULT: '#A1A1AA',
          foreground: '#71717A'
        },
        destructive: {
          DEFAULT: '#E53935',
          foreground: '#FAFAFA'
        },
        positive: '#22C55E',
        ring: '#A1A1AA',
        input: '#27272A'
      },
      fontFamily: {
        geist: 'var(--font-geist-sans)',
        dmmono: 'var(--font-dm-mono)'
      },
      borderRadius: {
        xl: '10px'
      }
    }
  },
  plugins: [tailwindcssAnimate]
} satisfies Config
