import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const plugins = [remarkGfm];

// Raw HTML in notes is shown as text, never rendered.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-note">
      <ReactMarkdown remarkPlugins={plugins} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
