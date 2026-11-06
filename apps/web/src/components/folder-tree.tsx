import Link from 'next/link';
import type { FolderTreeNode } from '@/server/folders';

function Branch({ nodes, currentId }: { nodes: FolderTreeNode[]; currentId: string | null }) {
  return (
    <ul className="tree-list">
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/dossiers/${node.id}`}
            className="tree-link"
            aria-current={node.id === currentId ? 'page' : undefined}
          >
            <span className="tree-name">{node.name}</span>
            {node.noteCount > 0 ? <span className="tree-count">{node.noteCount}</span> : null}
          </Link>
          {node.children.length > 0 ? <Branch nodes={node.children} currentId={currentId} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function FolderTree({
  roots,
  currentId,
}: {
  roots: FolderTreeNode[];
  currentId: string | null;
}) {
  return (
    <nav className="tree" aria-label="Dossiers">
      <Branch nodes={roots} currentId={currentId} />
    </nav>
  );
}
