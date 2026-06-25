import uuid
import grpc
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.auth import get_current_user
from app.core.kafka import publish
from app.models.order import Order
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse
from app.services.risk import check_order_risk, RiskException
from app import matching_pb2
from app import matching_pb2_grpc

router = APIRouter()


def get_engine_stub():
    channel = grpc.insecure_channel(settings.matching_engine_url)
    return matching_pb2_grpc.MatchingServiceStub(channel)


@router.post("/orders", response_model=OrderResponse)
async def place_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id

    try:
        check_order_risk(order_data, user_id) # type: ignore
    except RiskException as e:
        raise HTTPException(status_code=400, detail=str(e))

    order_id = str(uuid.uuid4())
    db_order = Order(
        id        = order_id,
        user_id   = user_id,
        symbol    = order_data.symbol,
        side      = order_data.side.value,
        type      = order_data.type.value,
        price     = order_data.price,
        quantity  = order_data.quantity,
        filled    = 0,
        remaining = order_data.quantity,
        status    = "new",
    )
    db.add(db_order)
    db.commit()

    publish(
        topic = "orders.placed",
        key   = order_data.symbol,
        data  = {
            "order_id": order_id,
            "user_id":  user_id,
            "symbol":   order_data.symbol,
            "side":     order_data.side.value,
            "type":     order_data.type.value,
            "price":    order_data.price,
            "quantity": order_data.quantity,
            "status":   "new",
        }
    )

    try:
        stub = get_engine_stub()
        response = stub.SubmitOrder(matching_pb2.SubmitOrderRequest( # type: ignore
            order_id = order_id,
            user_id  = user_id,
            symbol   = order_data.symbol,
            side     = order_data.side.value,
            type     = order_data.type.value,
            price    = order_data.price or 0.0,
            quantity = order_data.quantity,
        ))
    except grpc.RpcError as e:
        db_order.status = "cancelled"
        db.commit()
        raise HTTPException(
            status_code=503,
            detail=f"matching engine unavailable: {e.details()}"
        )

    db_order.status    = response.status
    db_order.filled    = response.filled
    db_order.remaining = response.remaining
    db.commit()
    db.refresh(db_order)

    for trade in response.trades:
        publish(
            topic = "trades.executed",
            key   = trade.symbol,
            data  = {
                "trade_id":      trade.trade_id,
                "symbol":        trade.symbol,
                "buy_order_id":  trade.buy_order_id,
                "sell_order_id": trade.sell_order_id,
                "buyer_id":      trade.buyer_id,
                "seller_id":     trade.seller_id,
                "price":         trade.price,
                "quantity":      trade.quantity,
                "executed_at":   trade.executed_at,
            }
        )

    return db_order


@router.get("/alpaca/account")
async def alpaca_account(current_user: User = Depends(get_current_user)):
    """Verify the Alpaca paper connection and show the balance."""
    if not settings.alpaca_enabled:
        raise HTTPException(status_code=400, detail="Alpaca live trading is disabled")

    from app.core.alpaca import get_account_summary
    try:
        return get_account_summary()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Alpaca connection failed: {e}")


@router.post("/orders/live")
async def place_live_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Route an order to Alpaca's paper account instead of the internal engine.
    This is the "buy real shares" path — real prices, fake money.
    """
    if not settings.alpaca_enabled:
        raise HTTPException(status_code=400, detail="Alpaca live trading is disabled")

    from app.core.alpaca import submit_to_alpaca
    try:
        o = submit_to_alpaca(
            symbol     = order_data.symbol,
            side       = order_data.side.value,
            qty        = order_data.quantity,
            order_type = order_data.type.value,
            price      = order_data.price,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Alpaca rejected order: {e}")

    val = lambda v: v.value if hasattr(v, "value") else str(v)
    return {
        "venue":           "alpaca-paper",
        "alpaca_order_id": str(o.id),
        "symbol":          o.symbol,
        "side":            val(o.side),
        "qty":             str(o.qty),
        "type":            val(o.order_type),
        "status":          val(o.status),
        "submitted_at":    str(o.submitted_at),
    }


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id  # users can only see their own orders
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="order not found")
    return order


@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="order not found")

    if order.status in ("filled", "cancelled"):
        raise HTTPException(
            status_code=400,
            detail=f"cannot cancel order with status: {order.status}"
        )

    try:
        stub = get_engine_stub()
        stub.CancelOrder(matching_pb2.CancelOrderRequest( # type: ignore
            order_id = order_id,
            symbol   = order.symbol,
        ))
    except grpc.RpcError:
        pass

    order.status = "cancelled"
    db.commit()

    publish(
        topic = "orders.cancelled",
        key   = order.symbol,
        data  = {
            "order_id": order_id,
            "user_id":  current_user.id,
            "symbol":   order.symbol,
        }
    )

    return {"message": "order cancelled", "order_id": order_id}


@router.get("/orders", response_model=list[OrderResponse])
async def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """fetch all orders for the current user"""
    orders = db.query(Order).filter(
        Order.user_id == current_user.id
    ).order_by(Order.created_at.desc()).limit(100).all()
    return orders