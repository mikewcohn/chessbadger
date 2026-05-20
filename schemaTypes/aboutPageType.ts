import { defineField, defineType } from 'sanity'

export const aboutPageType = defineType({
	name: 'aboutPage',
	title: 'About Page',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),

		defineField({
			name: 'description',
			title: 'SEO Description',
			type: 'text',
			rows: 3,
			description: 'Short description used for search engines and browser metadata.',
		}),

		defineField({
			name: 'body',
			title: 'Body',
			type: 'array',
			of: [
				{
					type: 'block',
					styles: [
						{ title: 'Normal', value: 'normal' },
						{ title: 'Heading 2', value: 'h2' },
						{ title: 'Heading 3', value: 'h3' },
						{ title: 'Quote', value: 'blockquote' },
					],
					lists: [
						{ title: 'Bullet', value: 'bullet' },
						{ title: 'Numbered', value: 'number' },
					],
					marks: {
						decorators: [
							{ title: 'Strong', value: 'strong' },
							{ title: 'Emphasis', value: 'em' },
						],
						annotations: [
							{
								name: 'link',
								title: 'Link',
								type: 'object',
								fields: [
									defineField({
										name: 'href',
										title: 'URL',
										type: 'url',
									}),
								],
							},
						],
					},
				},
			],
			validation: (Rule) => Rule.required(),
		}),
	],
})