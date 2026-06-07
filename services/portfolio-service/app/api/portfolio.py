from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.position import Position, TradeHistory

router = APIRouter()


@router.get("/portfolio/{user_id}")
def get_portfolio(user_id: str, db: Session = Depends(get_db)):
    """
    returns all open positions for a user
    called by the frontend to show the positions table
    """
    positions = db.query(Position).filter(
        Position.user_id == user_id,
        Position.quantity > 0
    ).all()

    total_realised = sum(p.realised_pnl for p in positions)

    return {
        "user_id":  user_id,
        "positions": [
            {
                "symbol":       p.symbol,
                "quantity":     p.quantity,
                "avg_price":    round(p.avg_price, 2),
                "realised_pnl": round(p.realised_pnl, 2),
            }
            for p in positions
        ],
        "total_realised_pnl": round(total_realised, 2),
    }


@router.get("/portfolio/{user_id}/trades")
def get_trade_history(
    user_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    returns recent trade history for a user
    most recent first
    """
    trades = db.query(TradeHistory).filter(
        TradeHistory.user_id == user_id
    ).order_by(
        TradeHistory.created_at.desc()
    ).limit(limit).all()

    return {
        "user_id": user_id,
        "trades": [
            {
                "id":           t.id,
                "symbol":       t.symbol,
                "side":         t.side,
                "price":        round(t.price, 2),
                "quantity":     t.quantity,
                "realised_pnl": round(t.realised_pnl, 2),
                "executed_at":  t.executed_at,
            }
            for t in trades
        ]
    }


@router.get("/portfolio/{user_id}/summary")
def get_summary(user_id: str, db: Session = Depends(get_db)):
    """
    high level summary — total positions, total realised P&L
    used for the dashboard header stats
    """
    positions = db.query(Position).filter(
        Position.user_id == user_id,
        Position.quantity > 0
    ).all()

    trade_count = db.query(TradeHistory).filter(
        TradeHistory.user_id == user_id
    ).count()

    total_realised = sum(p.realised_pnl for p in positions)
    total_position_value = sum(
        p.quantity * p.avg_price for p in positions
    )

    return {
        "user_id":             user_id,
        "open_positions":      len(positions),
        "total_position_value": round(total_position_value, 2),
        "total_realised_pnl":  round(total_realised, 2),
        "total_trades":        trade_count,
    }