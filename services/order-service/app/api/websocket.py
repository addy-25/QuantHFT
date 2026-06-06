import asyncio
import json
import grpc
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from kafka import KafkaConsumer
from app.core.config import settings
from app import matching_pb2
from app import matching_pb2_grpc

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    tracks all active WebSocket connections grouped by symbol
    when AAPL order book updates, only AAPL watchers get notified
    """

    def __init__(self):
        # dict mapping symbol → set of connected websockets
        # e.g. {"AAPL": {ws1, ws2}, "TSLA": {ws3}}
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, symbol: str):
        # accept the connection — without this the browser
        # gets rejected immediately
        await websocket.accept()

        # add to the symbol group
        if symbol not in self.connections:
            self.connections[symbol] = set()
        self.connections[symbol].add(websocket)

        logger.info(f"client connected to {symbol} "
                   f"total={len(self.connections[symbol])}")

    def disconnect(self, websocket: WebSocket, symbol: str):
        if symbol in self.connections:
            self.connections[symbol].discard(websocket)
            # clean up empty groups
            if not self.connections[symbol]:
                del self.connections[symbol]

        logger.info(f"client disconnected from {symbol}")

    async def send_to_symbol(self, symbol: str, data: dict):
        """
        send a message to ALL browsers watching this symbol
        if a connection is broken, remove it silently
        """
        if symbol not in self.connections:
            return

        # copy the set — we might modify it during iteration
        # if a disconnected client is found
        dead_connections = set()

        for websocket in self.connections[symbol].copy():
            try:
                await websocket.send_json(data)
            except Exception:
                # connection is broken — mark for removal
                dead_connections.add(websocket)

        # remove broken connections
        for ws in dead_connections:
            self.disconnect(ws, symbol)


# one manager instance shared across all routes
manager = ConnectionManager()


def get_engine_stub():
    channel = grpc.insecure_channel(settings.matching_engine_url)
    return matching_pb2_grpc.MatchingServiceStub(channel)


async def push_orderbook(websocket: WebSocket, symbol: str):
    """
    background task — polls Go engine every 100ms
    and pushes the order book snapshot to one client
    runs until the client disconnects
    """
    stub = get_engine_stub()

    while True:
        try:
            # call Go engine for the current order book
            response = stub.GetOrderBook(
                matching_pb2.OrderBookRequest(symbol=symbol)
            )

            # convert proto response to plain dict for JSON
            orderbook_data = {
                "type":   "orderbook",
                "symbol": symbol,
                "bids": [
                    {"price": level.price, "quantity": level.quantity}
                    for level in response.bids
                ],
                "asks": [
                    {"price": level.price, "quantity": level.quantity}
                    for level in response.asks
                ],
            }

            await websocket.send_json(orderbook_data)

        except Exception as e:
            # client disconnected or engine is down
            # either way stop the loop
            logger.error(f"orderbook push failed: {e}")
            break

        # wait 100ms before next update
        # asyncio.sleep yields control so other
        # coroutines can run during the wait
        await asyncio.sleep(0.1)


@router.websocket("/ws/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    """
    WebSocket endpoint — browser connects here
    URL: ws://localhost:8001/ws/AAPL

    this function:
    1. accepts the connection
    2. starts pushing order book updates every 100ms
    3. keeps running until the browser disconnects
    """
    symbol = symbol.upper()
    await manager.connect(websocket, symbol)

    try:
        # start pushing order book in background
        # create_task runs push_orderbook concurrently
        # while we wait for messages from the client below
        orderbook_task = asyncio.create_task(
            push_orderbook(websocket, symbol)
        )

        # keep the connection alive
        # also listen for any messages from the client
        # (e.g. client could send {"action": "subscribe", "symbol": "TSLA"})
        while True:
            try:
                # wait for a message from the client
                # if client disconnects this raises WebSocketDisconnect
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0  # ping every 30s to detect dead connections
                )
                logger.info(f"received from client: {data}")

            except asyncio.TimeoutError:
                # no message in 30 seconds — send a ping
                # to check if the connection is still alive
                await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        logger.info(f"browser disconnected from {symbol}")

    finally:
        # always clean up when the connection ends
        orderbook_task.cancel()
        manager.disconnect(websocket, symbol)


async def start_trade_consumer():
    """
    background task that runs when FastAPI starts
    consumes trades.executed from Kafka
    pushes trade events to relevant browsers instantly
    """
    logger.info("starting Kafka trade consumer...")

    # KafkaConsumer in a thread because kafka-python is not async
    # we run it in FastAPI's thread pool executor
    loop = asyncio.get_event_loop()

    def consume():
        consumer = KafkaConsumer(
            'trades.executed',
            bootstrap_servers=settings.kafka_bootstrap_servers,
            group_id='websocket-manager',
            value_deserializer=lambda v: json.loads(v.decode('utf-8')),
            auto_offset_reset='latest',  # only new trades, not historical
            enable_auto_commit=True,
        )

        logger.info("Kafka consumer connected — waiting for trades...")

        for message in consumer:
            trade = message.value
            symbol = trade.get('symbol', '')

            # build the event to push to the browser
            trade_event = {
                "type":         "trade",
                "trade_id":     trade.get('trade_id'),
                "symbol":       symbol,
                "price":        trade.get('price'),
                "quantity":     trade.get('quantity'),
                "executed_at":  trade.get('executed_at'),
            }

            # schedule the async send on the event loop
            # because this runs in a thread, not async context
            asyncio.run_coroutine_threadsafe(
                manager.send_to_symbol(symbol, trade_event),
                loop
            )

    # run the blocking Kafka consumer in a thread pool
    # so it doesn't block FastAPI's async event loop
    await loop.run_in_executor(None, consume)