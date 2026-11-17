# Busca tolerante a erros de digitação

O frontend React/Vite consulta o FastAPI enquanto você digita. A API delega a busca ao Meilisearch e retorna livros, facetas de gênero e ano, trechos destacados e tempo de consulta. O catálogo em `backend/acervo/acervo.json` veio do anexo e contém 20.000 livros.

## Executar no Windows

1. Inicie o Meilisearch. Baixe o executável da [página oficial de releases](https://github.com/meilisearch/meilisearch/releases), renomeie para `meilisearch.exe` e execute em um terminal PowerShell. Guarde a chave mestra para administrar sua instância local.

   ```powershell
   $env:MEILI_MASTER_KEY = Read-Host "Chave mestra local de pelo menos 16 caracteres"
   .\meilisearch.exe --http-addr 127.0.0.1:7700
   ```

2. Em outro terminal, entre no backend e copie o arquivo de exemplo. Use um Python instalado e compatível com as dependências, como o 3.12. Se o ambiente virtual antigo apontar para um Python removido, use um ambiente novo.

   ```powershell
   cd backend
   Copy-Item .env_example .env
   python -m pip install -r requirements.txt
   ```

3. Consulte `GET http://127.0.0.1:7700/keys` com a chave mestra como Bearer token. Preencha `MEILI_ADMIN_KEY` com a **Default Admin API Key** e `MEILI_SEARCH_KEY` com a **Default Search API Key**. Se usar uma instância remota, ajuste `MEILI_URL`. O arquivo `.env` é local e as chaves ficam no backend. Em uma instância de desenvolvimento iniciada sem chave mestra, os dois campos podem ficar vazios.

4. Importe o acervo e suba a API.

   ```powershell
   python -m scripts.seed_data
   python -m uvicorn main:app --reload
   ```

5. Em outro terminal aberto na raiz, suba o frontend e abra `http://localhost:5173`.

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

## Reiniciar o Meilisearch local

Para reiniciar a instância local já configurada em `backend/.meili`, execute este comando na raiz e mantenha o terminal aberto. O índice fica em disco em `backend/.meili/data.ms`.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File backend/scripts/start_meili.ps1
```

Se alterar as chaves em `backend/.env`, reinicie também o FastAPI. A URL `http://127.0.0.1:7700/health` verifica se o Meilisearch está ativo.

## Como a busca funciona

- **Busca instantânea.** O frontend espera 200 ms após a última alteração e cancela a consulta anterior quando você continua digitando. Consulta `GET /api/busca/meili` com `termo`, `genero` e `ano`. Cada busca exibe até 30 livros. As contagens das facetas refletem a consulta com os filtros ativos.
- **Destaque.** O Meilisearch devolve título, autor e trechos da sinopse em `_formatted`. O React converte as marcações em elementos `<mark>` e renderiza o restante como texto.
- **Índice invertido.** É uma estrutura que associa termos aos documentos onde aparecem. Ao buscar, o motor consulta essas associações e aplica regras de relevância. [Como funciona a busca de texto completo](https://www.meilisearch.com/blog/how-full-text-search-engines-work)
- **Relevância.** A ordem dos campos é título, autor e sinopse. Essa ordem vale na etapa de ranking por atributo. As regras anteriores, como quantidade de erros e proximidade entre palavras, também influenciam a classificação. A consulta exige correspondência para todos os termos e a configuração permite um erro a partir de quatro letras e dois a partir de nove. Gênero e ano são facetas.
- **MySQL e acentos.** `LIKE '%termo%'` procura um padrão contíguo e não calcula distância de edição. A comparação de acentos depende da collation. Uma collation como `utf8mb4_0900_ai_ci` pode equiparar letras com e sem acento. [Comparações de texto no MySQL](https://dev.mysql.com/doc/refman/8.4/en/string-comparison-functions.html) · [Convenções de collation](https://dev.mysql.com/doc/refman/26.7/en/charset-collation-names.html)
- **Sincronização.** A implementação atual importa o JSON por ID. Reimportar o mesmo ID substitui o documento, e remover uma entrada do JSON exige excluir o ID no índice. Quando o MySQL tiver operações de escrita, a estratégia é registrar um evento de inclusão, edição ou exclusão na mesma transação da alteração do livro. Um worker lê os eventos, envia a atualização ou exclusão ao Meilisearch e confirma o evento após o sucesso da tarefa. O ID estável permite retentativas, e o índice passa a refletir as mudanças de forma assíncrona.

## Demonstração

Com a API rodando, execute `python -m scripts.benchmark_busca` a partir de `backend`. A tabela mede do envio da requisição HTTP até a leitura da resposta e lista até três títulos por consulta. Uma busca de controle por `Dom Casmurro` verifica se o endpoint MySQL consegue acessar o acervo antes da comparação.

Medição local com 20.000 livros indexados. A coluna MySQL fica pendente enquanto o endpoint retorna uma lista vazia fixa.

| Consulta | Meilisearch (ms) | Resultados Meilisearch | MySQL (ms / resultados) |
| --- | ---: | --- | --- |
| `harry poter` | 21,38 | 7 retornados, primeiro Harry Potter e a Câmara Secreta | Pendente |
| `machado de asis` | 18,52 | 30 retornados, primeiro Memorial de Aires | Pendente |
| `dom casmuro` | 7,39 | Dom Casmurro | Pendente |
| `quincas borbaa` | 17,28 | Quincas Borba | Pendente |
| `memorial de airesz` | 6,16 | Memorial de Aires | Pendente |
| `camara secretta` | 4,70 | Harry Potter e a Câmara Secreta | Pendente |
| `prisioneiro de azkabanx` | 5,73 | Harry Potter e o Prisioneiro de Azkaban | Pendente |
| `ordem da fenixx` | 5,63 | Harry Potter e a Ordem da Fênix | Pendente |
| `memorias postumas de bras cubass` | 14,86 | Memórias Póstumas de Brás Cubas | Pendente |
| `reliquias da mortez` | 4,66 | Harry Potter e as Relíquias da Morte | Pendente |
