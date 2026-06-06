from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import orders
from app.core.database import engine, Base

# create all tables in postgres on startup
# in production you'd use alembic migrations instead
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="QuantFlow Order Service",
    description="Handles order placement, cancellation, and status",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# register the orders router
# all routes in orders.py will be prefixed with /api/v1
app.include_router(orders.router, prefix="/api/v1", tags=["orders"])

@app.get("/health")
def health_check():
    """simple endpoint to verify the service is running"""
    return {"status": "ok", "service": "order-service"}