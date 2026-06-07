def calculate_new_position(
    current_qty: int,
    current_avg: float,
    trade_qty: int,
    trade_price: float,
    side: str,
) -> tuple[int, float, float]:
    """
    calculates updated position after a trade

    returns: (new_quantity, new_avg_price, realised_pnl_from_this_trade)

    BUY example:
        before:  10 shares @ avg $150
        trade:   buy 5 @ $160
        after:   15 shares @ avg $153.33
        formula: (10×150 + 5×160) / 15 = $153.33
        realised pnl: $0 (buying doesn't lock in profit)

    SELL example:
        before:  10 shares @ avg $150
        trade:   sell 4 @ $170
        after:   6 shares @ avg $150 (unchanged)
        realised pnl: 4 × ($170 - $150) = $80
    """
    realised_pnl = 0.0

    if side == "buy":
        # weighted average price calculation
        total_cost   = (current_qty * current_avg) + (trade_qty * trade_price)
        new_quantity = current_qty + trade_qty
        new_avg      = total_cost / new_quantity if new_quantity > 0 else 0.0

    else:  # sell
        # selling realises profit or loss
        realised_pnl = trade_qty * (trade_price - current_avg)
        new_quantity = current_qty - trade_qty
        # avg price stays the same when you sell
        # you're just reducing the size of the position
        new_avg = current_avg if new_quantity > 0 else 0.0

    return new_quantity, new_avg, realised_pnl


def calculate_unrealised_pnl(
    quantity: int,
    avg_price: float,
    current_price: float,
) -> float:
    """
    how much you'd make if you sold your entire position right now
    positive = profit, negative = loss
    """
    return quantity * (current_price - avg_price)