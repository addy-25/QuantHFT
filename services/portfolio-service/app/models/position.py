from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Position(Base):
    """
    one row per user per symbol
    tracks how many shares the user holds and at what average price

    example rows:
    user_abc | AAPL | qty=10 | avg=150.0 | realised_pnl=0
    user_abc | TSLA | qty=5  | avg=220.0 | realised_pnl=80.5
    user_xyz | AAPL | qty=20 | avg=148.0 | realised_pnl=200.0
    """
    __tablename__ = "positions"

    id           = Column(String(36), primary_key=True)
    user_id      = Column(String(36), nullable=False, index=True)
    symbol       = Column(String(10), nullable=False, index=True)
    quantity     = Column(Integer, nullable=False, default=0)
    avg_price    = Column(Float,   nullable=False, default=0.0)
    realised_pnl = Column(Float,   nullable=False, default=0.0)
    updated_at   = Column(DateTime, server_default=func.now(),
                         onupdate=func.now())


class TradeHistory(Base):
    """
    immutable record of every trade
    never updated — only inserted
    used for trade history display and P&L reporting
    """
    __tablename__ = "trade_history"

    id           = Column(String(36), primary_key=True)
    user_id      = Column(String(36), nullable=False, index=True)
    symbol       = Column(String(10), nullable=False, index=True)
    side         = Column(String(10), nullable=False)
    price        = Column(Float,      nullable=False)
    quantity     = Column(Integer,    nullable=False)
    realised_pnl = Column(Float,      nullable=False, default=0.0)
    executed_at  = Column(String(30), nullable=False)
    created_at   = Column(DateTime,   server_default=func.now())