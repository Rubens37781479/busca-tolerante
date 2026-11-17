import { Fragment, useMemo } from 'react';
import type { SearchEngine } from '../types/book';
import { findHighlightRanges } from '../utils/textMatch';

export interface HighlightTextProps {
  text: string;
  query: string;
  engine: SearchEngine;
  className?: string;
  formatted?: string;
}

/**
 * Renderiza texto destacando os trechos correspondentes à busca com efeito text-glow.
 */
export function HighlightText({
  text,
  query,
  engine,
  className,
  formatted,
}: HighlightTextProps) {
  const segments = useMemo(() => {
    if (formatted !== undefined) {
      return formatted.split(/<mark>([\s\S]*?)<\/mark>/g).map((text, index) => ({
        text,
        highlighted: index % 2 === 1,
      }));
    }
    if (engine === 'meili') return [{ text, highlighted: false }];

    const ranges = findHighlightRanges(text, query, engine);
    if (ranges.length === 0) {
      return [{ text, highlighted: false }];
    }

    const parts: Array<{ text: string; highlighted: boolean }> = [];
    let cursor = 0;

    for (const range of ranges) {
      if (range.start > cursor) {
        parts.push({
          text: text.slice(cursor, range.start),
          highlighted: false,
        });
      }
      parts.push({
        text: text.slice(range.start, range.end),
        highlighted: true,
      });
      cursor = range.end;
    }

    if (cursor < text.length) {
      parts.push({
        text: text.slice(cursor),
        highlighted: false,
      });
    }

    return parts;
  }, [text, query, engine, formatted]);

  const highlightStyle =
    engine === 'meili' ? 'search-highlight-cyber' : 'search-highlight-mono';

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={`${index}-${segment.text}`}
            className={`${highlightStyle} inline-block rounded-[6px] px-1 py-[0.5px] font-medium transition-colors duration-200`}
          >
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        )
      )}
    </span>
  );
}

export default HighlightText;
