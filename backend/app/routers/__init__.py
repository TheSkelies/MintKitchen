from app.routers.auth import router as auth_router
from app.routers.products import router as products_router
from app.routers.recipes import router as recipes_router
from app.routers.favorites import router as favorites_router
from app.routers.system import router as system_router

__all__ = [
    "auth_router",
    "products_router",
    "recipes_router",
    "favorites_router",
    "system_router",
]