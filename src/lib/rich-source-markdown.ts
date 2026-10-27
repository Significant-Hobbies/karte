import { createElement, type ReactNode } from 'react';
import sanitizeHtml from 'sanitize-html';
import { reactSourceMarkdown } from './react-source-markdown';

// Parse the stored Novel/Tiptap article source, using the HTML view's sanitizer.
// This never fetches, serializes, or scrapes a rendered page.
export function richSourceMarkdown(source: string) {
  const root: ReactNode[] = [];
  const stack: Array<{
    tag: string;
    props: Record<string, string>;
    children: ReactNode[];
  }> = [];
  const append = (value: ReactNode) =>
    (stack.at(-1)?.children ?? root).push(value);
  const supported = new Set(
    'h1 h2 h3 h4 h5 h6 p div section article aside header blockquote pre code ul ol li dl dt dd strong b em i a br hr table thead tbody tfoot tr th td caption span small sup sub'.split(
      ' ',
    ),
  );
  sanitizeHtml(sanitizeHtml(source), {
    allowedTags: false,
    allowedAttributes: false,
    onOpenTag(tag, props) {
      stack.push({
        tag: supported.has(tag) ? tag : 'span',
        props,
        children: [],
      });
    },
    textFilter(text) {
      append(decode(text));
      return text;
    },
    onCloseTag() {
      const node = stack.pop();
      if (node) append(createElement(node.tag, node.props, ...node.children));
    },
  });
  return reactSourceMarkdown(createElement('main', null, ...root), {
    origin: 'https://karte.cc',
    components: [],
  });
}
function decode(text: string) {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };
  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (!code.startsWith('#')) return named[code.toLowerCase()] ?? entity;
      const value =
        code[1]?.toLowerCase() === 'x'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return value >= 0 && value <= 0x10ffff
        ? String.fromCodePoint(value)
        : entity;
    },
  );
}
