import json
from time import perf_counter
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from meilisearch.errors import MeilisearchApiError, MeilisearchError
from requests.exceptions import RequestException

from database.meili_db import livro_index


router = APIRouter(prefix="/busca", tags=["Busca"])


@router.get("/meili")
def busca_meili(
    termo: Annotated[str, Query(max_length=300)] = "",
    genero: Annotated[str | None, Query(max_length=100)] = None,
    ano: int | None = None,
):
    filtros = []
    if genero:
        filtros.append(f"genero = {json.dumps(genero, ensure_ascii=False)}")
    if ano is not None:
        filtros.append(f"ano = {ano}")

    inicio = perf_counter()
    try:
        busca = livro_index().search(termo.strip(), {
            "filter": filtros,
            "facets": ["genero", "ano"],
            "attributesToHighlight": ["titulo", "autor", "sinopse"],
            "attributesToCrop": ["sinopse:32"],
            "highlightPreTag": "<mark>",
            "highlightPostTag": "</mark>",
            "matchingStrategy": "all",
            "limit": 30,
        })
    except MeilisearchApiError as erro:
        if erro.status_code in (401, 403):
            detail = "A chave MEILI_SEARCH_KEY não tem acesso ao índice configurado."
        elif erro.code == "index_not_found":
            detail = "Índice Meilisearch ausente. Execute python -m scripts.seed_data no backend."
        else:
            detail = "O Meilisearch rejeitou a consulta. Verifique as configurações do índice."
        raise HTTPException(status_code=503, detail=detail) from erro
    except (MeilisearchError, RequestException) as erro:
        raise HTTPException(
            status_code=503,
            detail="Sem conexão com o Meilisearch. Inicie o serviço e verifique MEILI_URL.",
        ) from erro

    return {
        "motor": "Meilisearch",
        "termo_buscado": termo.strip(),
        "resultados": busca["hits"],
        "facetas": busca.get("facetDistribution", {}),
        "tempo_ms": round((perf_counter() - inicio) * 1000, 2),
        "tempo_motor_ms": busca["processingTimeMs"],
    }
