from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.errors import CompilerBaseException
from app.persistence.database import engine, Base, SessionLocal
from app.demo.scenarios import seed_demo_scenario

from app.api.v1.scenarios import router as scenarios_router
from app.api.v1.events import router as events_router
from app.api.v1.graph import router as graph_router
from app.api.v1.paths import router as paths_router
from app.api.v1.simulations import router as simulations_router
from app.api.v1.interventions import router as interventions_router
from app.api.v1.websocket import router as websocket_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Initializing database schemas...")
    # Initialize all SQLAlchemy database tables
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed initial demo scenario for immediate evaluator experience
    with SessionLocal() as db:
        seed_demo_scenario(db)
    logger.info("Startup sequence complete: Seed scenario 'scenario_demo' ready.")
    yield
    logger.info("Shutting down Attack Path Compiler service.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="The Attack Path Compiler: Authoritative Security Digital Twin, Bayesian Risk & Optimization Engine.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handling
@app.exception_handler(CompilerBaseException)
async def compiler_exception_handler(request: Request, exc: CompilerBaseException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.__class__.__name__, "detail": exc.detail}
    )

# Service Health Endpoint
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected",
        "graph_engine": "NetworkX",
        "bayesian_engine": "online",
        "simulator": "Monte Carlo active"
    }

# Register API v1 routes
app.include_router(scenarios_router, prefix=settings.API_V1_STR, tags=["Scenarios"])
app.include_router(events_router, prefix=settings.API_V1_STR, tags=["Events"])
app.include_router(graph_router, prefix=settings.API_V1_STR, tags=["Graph & Digital Twin"])
app.include_router(paths_router, prefix=settings.API_V1_STR, tags=["Attack Paths"])
app.include_router(simulations_router, prefix=settings.API_V1_STR, tags=["Simulations"])
app.include_router(interventions_router, prefix=settings.API_V1_STR, tags=["Interventions"])
app.include_router(websocket_router, prefix=settings.API_V1_STR, tags=["Live Updates"])
