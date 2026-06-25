"""
Alpaca paper-trading client — the "Live" venue.

This is separate from the internal Go matching engine. A normal order still
flows to the matching engine; a "live" order is routed here, to Alpaca's paper
brokerage, where it fills at real US market prices with fake money.

The client is built lazily (only on first use) so the service still boots fine
when no keys are configured yet.
"""

from alpaca.trading.client import TradingClient
from alpaca.trading.requests import MarketOrderRequest, LimitOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

from app.core.config import settings

_client: TradingClient | None = None


def get_alpaca() -> TradingClient:
    global _client
    if _client is None:
        if not settings.alpaca_api_key or not settings.alpaca_secret_key:
            raise RuntimeError(
                "Alpaca API keys are not configured — "
                "set ALPACA_API_KEY and ALPACA_SECRET_KEY in the root .env"
            )
        _client = TradingClient(
            settings.alpaca_api_key,
            settings.alpaca_secret_key,
            paper=settings.alpaca_paper,
        )
    return _client


def _enum_value(v):
    return v.value if hasattr(v, "value") else str(v)


def submit_to_alpaca(symbol: str, side: str, qty: int, order_type: str, price=None):
    """Route one order to Alpaca's paper account and return the broker order."""
    client = get_alpaca()
    alpaca_side = OrderSide.BUY if side == "buy" else OrderSide.SELL

    if order_type == "limit":
        if price is None:
            raise ValueError("a limit order requires a price")
        req = LimitOrderRequest(
            symbol=symbol, qty=qty, side=alpaca_side,
            time_in_force=TimeInForce.DAY, limit_price=price,
        )
    else:
        req = MarketOrderRequest(
            symbol=symbol, qty=qty, side=alpaca_side,
            time_in_force=TimeInForce.DAY,
        )

    return client.submit_order(req)


def get_account_summary() -> dict:
    """Quick connectivity + balance check for the configured paper account."""
    acct = get_alpaca().get_account()
    return {
        "account_number":  acct.account_number,
        "status":          _enum_value(acct.status),
        "currency":        acct.currency,
        "cash":            acct.cash,
        "buying_power":    acct.buying_power,
        "portfolio_value": acct.portfolio_value,
    }
