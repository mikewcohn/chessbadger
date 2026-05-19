import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: '5759b7nb',
  dataset: 'production',
  apiVersion: '2025-01-01',
  useCdn: false,
})