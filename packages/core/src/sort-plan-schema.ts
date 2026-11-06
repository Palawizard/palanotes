// JSON Schema given to the model. It uses only the keywords structured outputs accept
// (no length or count limits); parseSortPlan applies the full rules afterwards.
const tags = {
  type: 'array',
  items: { type: 'string' },
  description: 'One to five short lowercase keywords, in the language of the note.',
} as const;

const summary = {
  type: 'string',
  description: 'One or two sentences saying what the note contains, for search and the index.',
} as const;

export const SORT_PLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['actions', 'explanation'],
  properties: {
    explanation: {
      type: 'string',
      description: 'One short sentence for the user explaining where the note goes and why.',
    },
    actions: {
      type: 'array',
      description: 'Usually one action. Several only when the text clearly holds unrelated topics.',
      items: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'folderPath', 'title', 'content', 'summary', 'tags'],
            properties: {
              type: { type: 'string', const: 'create' },
              folderPath: {
                type: 'string',
                description: 'Folder path with " / " between levels, at most three levels.',
              },
              title: { type: 'string' },
              content: { type: 'string', description: 'The formatted note in Markdown.' },
              summary,
              tags,
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'noteId', 'sectionTitle', 'content', 'summary', 'tags'],
            properties: {
              type: { type: 'string', const: 'append' },
              noteId: { type: 'string', format: 'uuid', description: 'Id of an existing note.' },
              sectionTitle: { type: 'string' },
              content: {
                type: 'string',
                description: 'The new section body in Markdown, without its title.',
              },
              summary: { ...summary, description: 'Updated summary of the whole note.' },
              tags: { ...tags, description: 'Updated tags of the whole note.' },
            },
          },
        ],
      },
    },
  },
} as const;
