import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight, { type Options as HighlightOptions } from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

const remarkPlugins = [remarkGfm];

// Fences without a language are guessed, so older notes get colours too.
// Guessing only picks among programming languages: config formats such as
// ini win on short C-like snippets and colour them wrongly.
// "text" and "plain" opt a block out of colouring.
const highlight: HighlightOptions = {
  detect: true,
  subset: [
    'bash',
    'c',
    'cpp',
    'csharp',
    'go',
    'java',
    'javascript',
    'json',
    'kotlin',
    'lua',
    'php',
    'python',
    'ruby',
    'rust',
    'sql',
    'swift',
    'typescript',
    'xml',
  ],
  plainText: ['text', 'txt', 'plain'],
};
const rehypePlugins: [[typeof rehypeHighlight, HighlightOptions]] = [[rehypeHighlight, highlight]];

// The boxes of a task list are read-only; they are named after their state so a screen
// reader says more than « case à cocher ».
const components: Components = {
  input(props) {
    const attributes = { ...props };
    delete attributes.node;
    if (attributes.type !== 'checkbox') return <input {...attributes} />;
    return <input {...attributes} aria-label={attributes.checked ? 'Fait' : 'À faire'} />;
  },
};

// Raw HTML in notes is shown as text, never rendered.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-note">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
        skipHtml
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
