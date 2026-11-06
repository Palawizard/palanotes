import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from '../src/components/markdown';

function render(source: string): string {
  return renderToStaticMarkup(createElement(Markdown, null, source));
}

describe('Markdown code blocks', () => {
  it('colours a fence tagged with its language', () => {
    const html = render('```csharp\nforeach (int element in liste) { return true; }\n```');
    expect(html).toContain('language-csharp');
    expect(html).toContain('<span class="hljs-keyword">foreach</span>');
  });

  it('guesses the language of an untagged fence', () => {
    const html = render(
      '```\nint compteur = 0;\nforeach (int element in liste)\n{\n    if (element >= 5)\n        compteur++;\n}\nreturn compteur;\n```',
    );
    expect(html).toContain('hljs-keyword');
  });

  it('leaves text fences and inline code alone', () => {
    const html = render('```text\nif x then y\n```\n\nUse `return true` here.');
    expect(html).not.toContain('hljs-keyword');
    expect(html).toContain('<code>return true</code>');
  });

  it('does not fail on an unknown language', () => {
    const html = render('```klingon\nqapla\n```');
    expect(html).toContain('qapla');
  });
});
