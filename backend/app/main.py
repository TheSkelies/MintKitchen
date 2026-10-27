from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import create_tables
from app.routers import auth_router, products_router, recipes_router, favorites_router, system_router
from app.services.matcher import match_product_with_ingredient

app = FastAPI(
    title="SPO Products API",
    version="0.4.0",
    description="Recipe management and user pantry backend with modular architecture and RBAC",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:5001",
        "http://localhost:5002",
        "http://localhost:5003",
        "http://localhost:5004",
        "http://localhost:5005",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5001",
        "http://127.0.0.1:5002",
        "http://127.0.0.1:5003",
        "http://127.0.0.1:5004",
        "http://127.0.0.1:5005",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    try:
        create_tables()
    except Exception as exc:
        import logging

        logging.getLogger("uvicorn.error").error(
            f"Failed to connect to database or create tables ({exc}). "
            "Please ensure PostgreSQL is running and check DATABASE_URL in your .env file."
        )
        raise


app.include_router(system_router)
app.include_router(auth_router)
app.include_router(recipes_router)
app.include_router(products_router)
app.include_router(favorites_router)

__all__ = ["app", "match_product_with_ingredient"]
