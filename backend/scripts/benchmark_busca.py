import argparse
import json
from time import perf_counter
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen


TERMOS = (
    "harry poter",
    "machado de asis",
    "dom casmuro",
    "quincas borbaa",
    "memorial de airesz",
    "camara secretta",
    "prisioneiro de azkabanx",
    "ordem da fenixx",
    "memorias postumas de bras cubass",
    "reliquias da mortez",
)


def consultar(base_url, motor, termo):
    url = f"{base_url}/api/busca/{motor}?{urlencode({'termo': termo})}"
    inicio = perf_counter()
    with urlopen(url, timeout=10) as response:
        data = json.load(response)
    return (perf_counter() - inicio) * 1000, data["resultados"]


def medir(base_url, motor, termo):
    try:
        tempo, livros = consultar(base_url, motor, termo)
    except (URLError, TimeoutError, ValueError, KeyError):
        return "—", "API indisponível"
    titulos = ", ".join(livro["titulo"] for livro in livros[:3]) or "nenhum"
    titulos = titulos.replace("|", "&#124;")
    return f"{tempo:.2f}", f"{len(livros)} retornados ({titulos})"


def main():
    parser = argparse.ArgumentParser(description="Compara as duas rotas HTTP com 10 consultas.")
    parser.add_argument("--url", default="http://localhost:8000")
    args = parser.parse_args()
    base_url = args.url.rstrip("/")

    # Uma consulta exata confirma que o MySQL está ligado ao mesmo acervo.
    try:
        _, mysql_probe = consultar(base_url, "mysql", "Dom Casmurro")
    except (URLError, TimeoutError, ValueError, KeyError):
        mysql_probe = []

    print("| Consulta | Meilisearch (ms) | Resultados Meilisearch | MySQL (ms) | Resultados MySQL |")
    print("| --- | ---: | --- | ---: | --- |")
    for termo in TERMOS:
        meili_ms, meili_hits = medir(base_url, "meili", termo)
        mysql_ms, mysql_hits = medir(base_url, "mysql", termo) if mysql_probe else (
            "—", "Pendente: consulta de controle sem resultado"
        )
        print(f"| {termo} | {meili_ms} | {meili_hits} | {mysql_ms} | {mysql_hits} |")


if __name__ == "__main__":
    main()
