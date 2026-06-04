from app.schemas.order import OrderCreate

# these would come from the database in production
# hardcoded here for simplicity to start
MAX_ORDER_SIZE    = 10_000   # max shares per order
MAX_NOTIONAL      = 500_000  # max dollar value per order
MAX_ORDERS_PER_MIN = 60      # rate limit

class RiskException(Exception):
    """raised when an order fails a risk check"""
    pass

def check_order_risk(order: OrderCreate, user_id: str):
    """
    runs all pre-trade checks
    raises RiskException if any check fails
    FastAPI will catch this and return a 400 error
    """

    # check 1 — order size
    if order.quantity > MAX_ORDER_SIZE:
        raise RiskException(
            f"order size {order.quantity} exceeds maximum {MAX_ORDER_SIZE}"
        )

    # check 2 — notional value (only for limit orders where we know the price)
    if order.price is not None:
        notional = order.price * order.quantity
        if notional > MAX_NOTIONAL:
            raise RiskException(
                f"notional value ${notional:,.2f} exceeds maximum ${MAX_NOTIONAL:,.2f}"
            )

    # check 3 — market orders have no price (intentional)
    if order.type == "limit" and order.price is None:
        raise RiskException("limit orders must specify a price")

    # all checks passed — order is safe to send to matching engine
    return True