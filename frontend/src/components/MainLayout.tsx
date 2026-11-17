import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { searchBooks } from '../services/searchService';
import type { Book, SearchEngine, SearchFacets } from '../types/book';
import { BookCard } from './BookCard';
import { Background } from './Background';
import { PixelWave } from './PixelWave';
import { SearchBar } from './SearchBar';
import { Wordmark } from './Wordmark';
import {
  initAudioOnFirstGesture,
  playSfx,
  toggleMuted,
  useMuted,
} from '../utils/sounds';

// Tempo mínimo do loading para a onda de pixels não "piscar" em buscas locais
const MIN_LOADING_MS = 450;

/**
 * Tela minimalista: só a lupa no centro. Ao abrir e digitar,
 * a barra sobe e os resultados aparecem abaixo.
 */
export function MainLayout() {
  const [query, setQuery] = useState('');
  const [engine, setEngine] = useState<SearchEngine>('meili');
  const [results, setResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [facets, setFacets] = useState<SearchFacets>({});
  const [genero, setGenero] = useState('');
  const [ano, setAno] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const muted = useMuted();

  useEffect(() => initAudioOnFirstGesture(), []);

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setLatencyMs(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      const startedAt = performance.now();
      try {
        const response = await searchBooks(trimmed, engine, controller.signal, { genero, ano });
        const remaining = MIN_LOADING_MS - (performance.now() - startedAt);
        if (engine === 'mysql' && remaining > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remaining));
        }
        if (controller.signal.aborted) return;
        playSfx(response.resultados.length > 0 ? 'found' : 'empty');
        setResults(response.resultados);
        setLatencyMs(response.tempo_ms);
        setFacets(response.facetas ?? {});
        setSearchError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearchError(error instanceof TypeError
          ? 'Não foi possível conectar à API de busca.'
          : error instanceof Error ? error.message : 'Busca Meilisearch indisponível.');
        setLatencyMs(null);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, engine, genero, ano]);

  const facetControls = [
    { label: 'Gênero', values: facets.genero, value: genero, setValue: setGenero },
    { label: 'Ano', values: facets.ano, value: ano, setValue: setAno },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white">
      <Background energy={isLoading ? 2 : hasQuery ? 1 : 0} />

      <motion.button
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 1.6 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.88 }}
        type="button"
        onClick={toggleMuted}
        aria-label={muted ? 'Ativar som' : 'Silenciar som'}
        aria-pressed={muted}
        className="fixed top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-steel/15 bg-navy/40 text-steel/80 backdrop-blur-md transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </motion.button>

      <AnimatePresence>
        {!hasQuery && (
          <motion.div
            key="wordmark"
            exit={{ opacity: 0, y: -40, scale: 0.94, transition: { duration: 0.35 } }}
            className="pointer-events-none fixed inset-x-0 top-[7vh] z-10 flex justify-center px-4"
          >
            <Wordmark delay={1} />
          </motion.div>
        )}
      </AnimatePresence>

      <main
        className={`pointer-events-none relative z-10 flex min-h-screen w-full flex-col items-center px-4 ${
          hasQuery ? 'justify-start pt-14 pb-16' : 'justify-center'
        }`}
      >
        {/* layout="position": a barra desliza (spring) do centro para o topo */}
        <motion.div
          layout="position"
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="pointer-events-auto"
        >
          {/* Entrada ao recarregar: o botão emerge do glow com mola */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4, y: 40, filter: 'blur(14px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 14,
              delay: 1.15,
              filter: { duration: 0.6, delay: 1.15 },
            }}
          >
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            engine={engine}
            onEngineChange={setEngine}
            isLoading={isLoading}
          />
          </motion.div>
        </motion.div>

        {hasQuery && engine === 'meili' && (
          <div className="pointer-events-auto mt-5 flex flex-wrap gap-4">
            {facetControls.map(({ label, values, value, setValue }) => {
              const options = Object.keys(values ?? {});
              if (value && !options.includes(value)) options.push(value);
              options.sort((a, b) => label === 'Ano' ? Number(b) - Number(a) : a.localeCompare(b, 'pt-BR'));
              return (
                <label key={label} className="flex items-center gap-2 text-sm">
                  {label}
                  <select
                    className="rounded-lg border border-steel/20 bg-black px-2 py-1"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                  >
                    <option value="">Todos</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option} ({values?.[option] ?? 0})
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {hasQuery && isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="pointer-events-auto mt-16"
            >
              <PixelWave pixelSize={14} gap={2} />
            </motion.div>
          )}

          {hasQuery && !isLoading && (
            <motion.section
              key={`results-${engine}-${trimmed}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto mt-8 w-full max-w-3xl"
              aria-live="polite"
            >
              {searchError && engine === 'meili' ? (
                <p role="alert">{searchError}</p>
              ) : (
                <>

                  <div className="mb-3 flex items-center justify-between px-1 font-mono text-[11px] text-steel/60">
                    <span className="tabular-nums">
                      {results.length}{' '}
                      {engine === 'meili'
                        ? (results.length === 1 ? 'obra exibida' : 'obras exibidas')
                        : (results.length === 1 ? 'obra encontrada' : 'obras encontradas')}
                    </span>
                    <span className="tracking-wider uppercase">
                      {engine === 'mysql' ? 'strict_like' : 'fuzzy_typo'}
                      {latencyMs !== null && ` · ${latencyMs.toFixed(1)} ms`}
                    </span>
                  </div>

                  {results.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {results.map((book, index) => (
                        <BookCard
                          key={book.id}
                          book={book}
                          query={query}
                          engine={engine}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="squircle-card border border-dashed border-steel/10 bg-steel/[0.015] px-6 py-12 text-center">
                      <p className="font-display text-base font-black tracking-[-0.03em] text-white">
                        Nenhum registro para &ldquo;{trimmed}&rdquo;
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/60">
                        {engine === 'mysql'
                          ? 'O SQL LIKE exige correspondência exata e falha com erros de digitação ou acentos.'
                          : 'Nenhum livro atingiu o limiar de similaridade para este termo.'}
                      </p>
                      {engine === 'mysql' && (
                        <button
                          type="button"
                          onClick={() => setEngine('meili')}
                          className="mt-5 rounded-full bg-steel px-4 py-2 text-xs font-medium text-navy transition-colors hover:bg-steel"
                        >
                          Testar com Meilisearch
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default MainLayout;
