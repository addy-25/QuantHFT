import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import orders
from app.api.websocket import router as ws_router, start_trade_consumer
from app.core.database import engine, Base

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    runs on startup and shutdown
    starts the Kafka consumer as a background task
    """
    # start Kafka consumer in background when server starts
    task = asyncio.create_task(start_trade_consumer())
    yield
    # cancel it cleanly when server shuts down
    task.cancel()


app = FastAPI(
    title="QuantFlow Order Service",
    description="Handles order placement, cancellation, and status",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router, prefix="/api/v1", tags=["orders"])
app.include_router(ws_router, tags=["websocket"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "order-service"}