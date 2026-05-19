import { defineField, defineType } from 'sanity'

export const gameType = defineType({
  name: 'game',
  title: 'Chess Game',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'white',
      title: 'White',
      type: 'string',
    }),

    defineField({
      name: 'black',
      title: 'Black',
      type: 'string',
    }),

    defineField({
      name: 'playedOn',
      title: 'Date Played',
      type: 'date',
    }),

    defineField({
      name: 'event',
      title: 'Event',
      type: 'string',
    }),

    defineField({
      name: 'result',
      title: 'Result',
      type: 'string',
      options: {
        list: [
          { title: '1-0', value: '1-0' },
          { title: '0-1', value: '0-1' },
          { title: '1/2-1/2', value: '1/2-1/2' },
          { title: '*', value: '*' },
        ],
      },
    }),

    defineField({
      name: 'pgn',
      title: 'PGN',
      type: 'text',
      rows: 20,    
    }),
  ],
})