import { MOCK_BOOKS } from '../data/mockBooks';
import type { Book, SearchEngine, SearchFacets, SearchFilters, SearchResponse } from '../types/book';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

/**
 * Motor local fiel ao MySQL LIKE '%termo%':
 * exige substring contígua (case-insensitive) sem tolerância a typos.
 */
function runLocalMysqlLike(books: Book[], query: string): Book[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return books;

  return books.filter((book) => {
    const haystack = [
      book.titulo,
      book.autor,
      book.genero,
      String(book.ano),
      book.sinopse,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
}

interface BackendApiPayload {
  motor?: string;
  termo_buscado?: string;
  resultados?: Array<Partial<Book> & Record<string, unknown>>;
  tempo_ms?: number;
  facetas?: SearchFacets;
}

function normalizeApiBook(raw: Partial<Book> & Record<string, unknown>, idx: number): Book {
  return {
    _formatted: raw._formatted,
    id: raw.id ?? idx + 1,
    titulo: String(raw.titulo ?? raw.title ?? 'Sem título'),
    autor: String(raw.autor ?? raw.author ?? 'Autor desconhecido'),
    genero: String(raw.genero ?? raw.genre ?? 'Acervo'),
    ano: Number(raw.ano ?? raw.year ?? 0),
    sinopse: String(raw.sinopse ?? raw.synopsis ?? ''),
  };
}

export async function searchBooks(
  query: string,
  engine: SearchEngine,
  externalSignal?: AbortSignal,
  filters?: SearchFilters
): Promise<SearchResponse> {
  const startedAt = performance.now();
  const trimmed = query.trim();
  const tokens = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];

  if (engine === 'meili') {
    const params = new URLSearchParams({ termo: trimmed });
    if (filters?.genero) params.set('genero', filters.genero);
    if (filters?.ano) params.set('ano', filters.ano);

    const response = await fetch(`${API_BASE_URL}/api/busca/meili?${params}`, {
      signal: externalSignal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const detail = typeof data?.detail === 'string' ? data.detail : 'Busca Meilisearch indisponível.';
      throw new Error(detail);
    }

    const data = (await response.json()) as BackendApiPayload;
    return {
      motor: engine,
      termo_buscado: trimmed,
      resultados: (data.resultados ?? []).map(normalizeApiBook),
      tempo_ms: data.tempo_ms ?? performance.now() - startedAt,
      fonte: 'api',
      facetas: data.facetas,
      tokens,
    };
  }

  if (!trimmed) {
    return {
      motor: engine,
      termo_buscado: '',
      resultados: MOCK_BOOKS,
      tempo_ms: Number((performance.now() - startedAt).toFixed(2)),
      fonte: 'local-engine',
      tokens: [],
    };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 900);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const endpoint = `${API_BASE_URL}/api/busca/${engine}?termo=${encodeURIComponent(trimmed)}`;
    const response = await fetch(endpoint, { signal: controller.signal });

    if (response.ok) {
      const data = (await response.json()) as BackendApiPayload;
      if (Array.isArray(data.resultados) && data.resultados.length > 0) {
        const elapsed =
          typeof data.tempo_ms === 'number'
            ? data.tempo_ms
            : Number((performance.now() - startedAt).toFixed(2));

        return {
          motor: engine,
          termo_buscado: data.termo_buscado ?? trimmed,
          resultados: data.resultados.map(normalizeApiBook),
          tempo_ms: elapsed,
          fonte: 'api',
          tokens,
        };
      }
    }
  } catch {
    // Fallback silencioso para o motor local se a API estiver indisponível ou abortada
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }

  const localStart = performance.now();
  const resultados = runLocalMysqlLike(MOCK_BOOKS, trimmed);

  return {
    motor: engine,
    termo_buscado: trimmed,
    resultados,
    tempo_ms: Number(Math.max(0.2, performance.now() - localStart).toFixed(2)),
    fonte: 'local-engine',
    tokens,
  };
}
