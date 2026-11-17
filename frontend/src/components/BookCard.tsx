import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Book, SearchEngine } from '../types/book';
import { HighlightText } from './HighlightText';

export interface BookCardProps {
  book: Book;
  query: string;
  engine: SearchEngine;
  index: number;
}

/**
 * Card minimalista estilo macOS / AAA monocromático com detalhes Y2K/Cyberpunk
 * para exibição de livro com highlight dinâmico nos campos.
 */
export function BookCard({ book, query, engine, index }: BookCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.985 }}
      transition={{
        duration: 0.24,
        delay: Math.min(index * 0.028, 0.2),
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -2 }}
      className="squircle-card group relative overflow-hidden border border-steel/[0.08] bg-steel/[0.025] p-4 backdrop-blur-md transition-colors duration-200 hover:border-steel/20 hover:bg-steel/[0.05] sm:p-5"
    >
      {/* Brilho sutil superior estilo vidro macOS no hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-steel/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="flex flex-col gap-3">
        {/* Cabeçalho: Título (Unbounded) + Ano e Gênero */}
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-black tracking-[-0.04em] text-white sm:text-xl">
                <HighlightText text={book.titulo} formatted={book._formatted?.titulo} query={query} engine={engine} />
              </h2>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-steel/50 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/75 group-hover:opacity-100" />
            </div>

            <p className="text-sm font-light text-white/60">
              <span className="text-steel/60">por </span>
              <HighlightText
                text={book.autor}
                formatted={book._formatted?.autor}
                query={query}
                engine={engine}
                className="font-medium text-white/90"
              />
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-[9px] border border-steel/10 bg-steel/[0.04] px-2.5 py-1 font-mono text-[11px] tracking-wide text-white/75 uppercase">
              <HighlightText text={book.genero} query={query} engine={engine} />
            </span>
            <span className="rounded-[9px] border border-steel/10 bg-navy/60 px-2 py-1 font-mono text-[11px] tabular-nums text-white/60">
              <HighlightText
                text={String(book.ano)}
                query={query}
                engine={engine}
              />
            </span>
          </div>
        </div>

        {/* Sinopse */}
        <p className="line-clamp-3 text-sm leading-relaxed text-white/60 transition-colors duration-200 group-hover:text-white/75">
          <HighlightText text={book.sinopse} formatted={book._formatted?.sinopse} query={query} engine={engine} />
        </p>
      </div>
    </motion.article>
  );
}

export default BookCard;
