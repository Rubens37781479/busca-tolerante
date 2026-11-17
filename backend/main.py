from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from MySQL.routers import busca
from routers import meili

app = FastAPI( 
    title="API de Busca de Acervo",
    description="Comparativo de performance: MySQL (LIKE) vs Meilisearch",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(busca.router, prefix="/api")
app.include_router(meili.router, prefix="/api")

@app.get("/")
def health_check():
    return {
        "status": "online", 
        "mensagem": "Servidor rodando."
    }
