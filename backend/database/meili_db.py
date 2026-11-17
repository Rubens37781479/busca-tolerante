import os
from pathlib import Path

import meilisearch
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def livro_index(*, admin: bool = False):
    key_name = "MEILI_ADMIN_KEY" if admin else "MEILI_SEARCH_KEY"
    client = meilisearch.Client(
        os.getenv("MEILI_URL", "http://127.0.0.1:7700"),
        os.getenv(key_name) or None,
        timeout=30 if admin else 3,
    )
    return client.index(os.getenv("MEILI_INDEX", "livros"))
