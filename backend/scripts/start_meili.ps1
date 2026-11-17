$ErrorActionPreference = 'Stop'
$localDir = Join-Path $PSScriptRoot '../.meili'
$executable = Join-Path $localDir 'meilisearch.exe'
$masterFile = Join-Path $localDir 'master.key'

if (!(Test-Path -LiteralPath $executable) -or !(Test-Path -LiteralPath $masterFile)) {
    throw 'Coloque meilisearch.exe e master.key em backend/.meili para iniciar a instância local.'
}

$env:MEILI_MASTER_KEY = (Get-Content -LiteralPath $masterFile -Raw).Trim()
& $executable --http-addr 127.0.0.1:7700 --db-path (Join-Path $localDir 'data.ms') --no-analytics
exit $LASTEXITCODE
