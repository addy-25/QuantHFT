import asyncio
import json
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaConsumer
from sqlalchemy.orm import Session
from app.api.portfolio import router as portfolio_router
from app.core.database import engine, Base, SessionLocal
from app.core.config import settings
from app.models.position import Position, TradeHistory
from app.services.calculator import calculate_new_position

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# create tables on startup
Base.metadata.create_all(bind=engine)


def get_or_create_position(
    db: Session,
    user_id: str,
    symbol: str,
) -> Position:
    """
    finds existing position or creates a new empty one
    always returns a Position object — never None
    """
    position = db.query(Position).filter(
        Position.user_id == user_id,
        Position.symbol  == symbol,
    ).first()

    if not position:
        position = Position(
            id           = str(uuid.uuid4()),
            user_id      = user_id,
            symbol       = symbol,
            quantity     = 0,
            avg_price    = 0.0,
            realised_pnl = 0.0,
        )
        db.add(position)
        db.flush()  # assign the ID without committing yet

    return position


def update_position_for_trade(
    db: Session,
    user_id: str,
    symbol: str,
    quantity: int,
    price: float,
    side: str,
) -> float:
    """
    updates one user's position for one side of a trade
    returns the realised P&L from this update
    """
    position = get_or_create_position(db, user_id, symbol)

    new_qty, new_avg, realised = calculate_new_position(
        current_qty  = position.quantity,
        current_avg  = position.avg_price,
        trade_qty    = quantity,
        trade_price  = price,
        side         = side,
    )

    position.quantity     = new_qty
    position.avg_price    = new_avg
    position.realised_pnl += realised

    return realised


def record_trade_history(
    db: Session,
    user_id: str,
    symbol: str,
    side: str,
    price: float,
    quantity: int,
    realised_pnl: float,
    executed_at: str,
):
    """writes one row to trade_history — never updated"""
    trade = TradeHistory(
        id           = str(uuid.uuid4()),
        user_id      = user_id,
        symbol       = symbol,
        side         = side,
        price        = price,
        quantity     = quantity,
        realised_pnl = realised_pnl,
        executed_at  = executed_at,
    )
    db.add(trade)


def process_trade_event(trade: dict):
    """
    the core function — called every time a trades.executed
    event arrives from Kafka

    one trade affects two users:
    - buyer's position increases
    - seller's position decreases

    everything happens in one database transaction
    either both updates succeed or neither does
    """
    db = SessionLocal()

    try:
        symbol      = trade['symbol']
        price       = float(trade['price'])
        quantity    = int(trade['quantity'])
        buyer_id    = trade['buyer_id']
        seller_id   = trade['seller_id']
        executed_at = trade.get('executed_at', '')

        logger.info(
            f"processing trade: {quantity} {symbol} @ ${price} "
            f"buyer={buyer_id[:8]}... seller={seller_id[:8]}..."
        )

        # update buyer — they acquired shares
        update_position_for_trade(
            db, buyer_id, symbol, quantity, price, "buy"
        )

        # record in buyer's trade history
        record_trade_history(
            db, buyer_id, symbol, "buy",
            price, quantity, 0.0, executed_at
        )

        # update seller — they sold shares
        # skip if buyer and seller are the same user
        # (happens in testing when we trade against ourselves)
        if buyer_id != seller_id:
            seller_realised = update_position_for_trade(
                db, seller_id, symbol, quantity, price, "sell"
            )
            record_trade_history(
                db, seller_id, symbol, "sell",
                price, quantity, seller_realised, executed_at
            )

        # commit everything atomically
        # if anything above failed, this won't run
        # and the rollback in except will undo all changes
        db.commit()

        logger.info(
            f"position updated — "
            f"buyer {buyer_id[:8]} now holds more {symbol}, "
            f"seller {seller_id[:8]} holds less"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"failed to process trade event: {e}")

    finally:
        db.close()


def start_kafka_consumer():
    """
    blocking function — runs forever in a background thread
    subscribes to trades.executed and processes each event
    """
    logger.info("portfolio service: connecting to Kafka...")

    consumer = KafkaConsumer(
        'trades.executed',
        bootstrap_servers = settings.kafka_bootstrap_servers,
        group_id          = 'portfolio-service',
        value_deserializer= lambda v: json.loads(v.decode('utf-8')),
        # earliest — process all trades including ones from
        # before this service started
        # important: means existing trades get picked up on first run
        auto_offset_reset = 'earliest',
        enable_auto_commit= True,
    )

    logger.info("portfolio service: Kafka consumer ready")

    for message in consumer:
        trade = message.value
        process_trade_event(trade)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # run Kafka consumer in thread pool on startup
    # it's a blocking loop so it needs its own thread
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, start_kafka_consumer)
    yield


app = FastAPI(
    title="QuantFlow Portfolio Service",
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

app.include_router(portfolio_router, prefix="/api/v1", tags=["portfolio"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "portfolio-service"}