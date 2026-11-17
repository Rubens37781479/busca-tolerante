import argparse
import json
from pathlib import Path

from database.meili_db import livro_index


DEFAULT_ACERVO = Path(__file__).resolve().parents[1] / "acervo" / "acervo.json"


def wait_for_success(index, task):
    result = index.wait_for_task(task.task_uid, timeout_in_ms=600_000)
    if result.status != "succeeded":
        raise SystemExit(f"Tarefa {task.task_uid}: {result.status} — {result.error}")


def main():
    parser = argparse.ArgumentParser(description="Importa o acervo para o Meilisearch.")
    parser.add_argument("acervo", type=Path, nargs="?", default=DEFAULT_ACERVO)
    args = parser.parse_args()
    livros = json.loads(args.acervo.read_text(encoding="utf-8-sig"))
    if not isinstance(livros, list) or not livros:
        raise SystemExit("O acervo deve conter uma lista de livros.")

    index = livro_index(admin=True)
    wait_for_success(index, index.update_settings({
        "searchableAttributes": ["titulo", "autor", "sinopse"],
        "filterableAttributes": ["genero", "ano"],
        "faceting": {"maxValuesPerFacet": 1000},
        "typoTolerance": {
            "enabled": True,
            "minWordSizeForTypos": {"oneTypo": 4, "twoTypos": 9},
        },
    }))
    for offset in range(0, len(livros), 1000):
        wait_for_success(index, index.add_documents(livros[offset:offset + 1000], primary_key="id"))

    print(f"{len(livros)} livros enviados ao Meilisearch.")


if __name__ == "__main__":
    main()
