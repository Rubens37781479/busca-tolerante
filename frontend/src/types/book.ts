export type SearchEngine = 'mysql' | 'meili';
export type SearchFacets = Partial<Record<'genero' | 'ano', Record<string, number>>>;
export type SearchFilters = { genero: string; ano: string };

export interface Book {
  id: number | string;
  titulo: string;
  autor: string;
  genero: string;
  ano: number;
  sinopse: string;
  _formatted?: Partial<Pick<Book, 'titulo' | 'autor' | 'sinopse'>>;
}

export interface SearchResponse {
  motor: SearchEngine;
  termo_buscado: string;
  resultados: Book[];
  tempo_ms: number;
  fonte: 'api' | 'local-engine';
  tokens: string[];
  facetas?: SearchFacets;
}
