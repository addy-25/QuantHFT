import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.position import Position, Trade

router = APIRouter()


@router.get("/portfolio/{user_id}")
def get_portfolio(user_id: str, db: Session = Depends(get_db)):
    """
    returns all open positions for a user
    called by the frontend to display the positions table
    """
    positions = db.query(Position).filter(
        Position.user_id == user_id,
        Position.quantity > 0  # only show positions with shares
    ).all()

    if not positions:
        return {"user_id": user_id, "positions": [], "total_realised_pnl": 0.0}

    total_realised = sum(p.realised_pnl for p in positions)

    return {
        "user_id": user_id,
        "positions": [
            {
                "symbol":        p.symbol,
                "quantity":      p.quantity,
                "avg_price":     round(p.avg_price, 2),
                "realised_pnl":  round(p.realised_pnl, 2),
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
    most recent trades first
    """
    trades = db.query(Trade).filter(
        Trade.user_id == user_id
    ).order_by(
        Trade.created_at.desc()
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