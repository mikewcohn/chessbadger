// @ts-check

import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import sanity from '@sanity/astro'
import react from '@astrojs/react'
import {defineConfig, fontProviders} from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://chessbadger.com',

  integrations: [
    mdx(),
    sitemap(),
    sanity({
      projectId: '5759b7nb',
      dataset: 'production',
      apiVersion: '2026-03-01',
      useCdn: false,
      studioBasePath: '/admin',
      studioRouterHistory: 'hash',
    }),
    react(),
  ],

  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Atkinson',
      cssVariable: '--font-atkinson',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/atkinson-regular.woff'],
            weight: 400,
            style: 'normal',
            display: 'swap',
          },
          {
            src: ['./src/assets/fonts/atkinson-bold.woff'],
            weight: 700,
            style: 'normal',
            display: 'swap',
          },
        ],
      },
    },
  ],
})
