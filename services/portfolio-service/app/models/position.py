from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Position(Base):
    """
    one row per user per symbol
    e.g. user_001 holding AAPL is one row
         user_001 holding TSLA is another row

    this gets updated every time a trade executes
    """
    __tablename__ = "positions"

    id         = Column(String(36), primary_key=True)
    user_id    = Column(String(36), nullable=False, index=True)
    symbol     = Column(String(10), nullable=False, index=True)

    # how many shares currently held
    # negative means short position (sold shares you don't own)
    quantity   = Column(Integer, nullable=False, default=0)

    # weighted average price paid for current shares
    # used to calculate unrealised P&L
    avg_price  = Column(Float, nullable=False, default=0.0)

    # total profit locked in from closed trades
    realised_pnl = Column(Float, nullable=False, default=0.0)

    updated_at = Column(DateTime, server_default=func.now(),
                       onupdate=func.now())


class Trade(Base):
    """
    permanent record of every trade
    stored here for P&L history and reporting
    separate from the orders table in order-service
    """
    __tablename__ = "trade_history"

    id           = Column(String(36), primary_key=True)
    user_id      = Column(String(36), nullable=False, index=True)
    symbol       = Column(String(10), nullable=False, index=True)
    side         = Column(String(10), nullable=False)  # buy or sell
    price        = Column(Float,      nullable=False)
    quantity     = Column(Integer,    nullable=False)
    realised_pnl = Column(Float,      nullable=False, default=0.0)
    executed_at  = Column(String(30), nullable=False)
    created_at   = Column(DateTime,   server_default=func.now())