def calculate_new_position(
    current_qty: int,
    current_avg: float,
    trade_qty: int,
    trade_price: float,
    side: str,
) -> tuple[int, float, float]:
    """
    calculates the new position after a trade executes

    returns: (new_quantity, new_avg_price, realised_pnl)

    example — buying:
        current: 10 shares @ $150 avg
        trade:   buy 5 @ $160
        result:  15 shares @ $153.33 avg, $0 realised pnl

    example — selling:
        current: 10 shares @ $150 avg
        trade:   sell 4 @ $170
        result:  6 shares @ $150 avg, $80 realised pnl
    """
    realised_pnl = 0.0

    if side == "buy":
        # weighted average calculation
        # (old_qty × old_avg + trade_qty × trade_price) / new_qty
        total_cost   = (current_qty * current_avg) + (trade_qty * trade_price)
        new_quantity = current_qty + trade_qty
        new_avg      = total_cost / new_quantity if new_quantity > 0 else 0.0

    else:  # sell
        # selling locks in profit or loss
        # realised = qty_sold × (sell_price - avg_cost)
        realised_pnl = trade_qty * (trade_price - current_avg)
        new_quantity = current_qty - trade_qty

        # avg price doesn't change when selling
        # you're just reducing the position size
        new_avg = current_avg if new_quantity > 0 else 0.0

    return new_quantity, new_avg, realised_pnl


def calculate_unrealised_pnl(
    quantity: int,
    avg_price: float,
    current_price: float,
) -> float:
    """
    unrealised P&L = how much you'd make if you sold right now
    positive = profitable position
    negative = losing position
    """
    return quantity * (current_price - avg_price)