package main

import (
	"fmt"
	"log"
	"sync"

	"quantflow/matching-engine/internal/engine"
)

type Engine struct {
	books map[string]*engine.OrderBook
	mu    sync.RWMutex
}

func NewEngine() *Engine {
	return &Engine{
		books: make(map[string]*engine.OrderBook),
	}
}

func (e *Engine) GetOrCreateBook(symbol string) *engine.OrderBook {
	e.mu.RLock()
	book, exists := e.books[symbol]
	e.mu.RUnlock()

	if exists {
		return book
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	if book, exists = e.books[symbol]; exists {
		return book
	}

	book = engine.NewOrderBook(symbol)
	e.books[symbol] = book
	log.Printf("Created order book for %s", symbol)
	return book
}

func main() {
	eng := NewEngine()
	book := eng.GetOrCreateBook("AAPL")

	sellOrder := &engine.Order{
		ID:       "ord_001",
		UserID:   "user_seller",
		Symbol:   "AAPL",
		Side:     engine.SideSell,
		Type:     engine.OrderTypeLimit,
		Price:    150.00,
		Quantity: 10,
	}

	buyOrder := &engine.Order{
		ID:       "ord_002",
		UserID:   "user_buyer",
		Symbol:   "AAPL",
		Side:     engine.SideBuy,
		Type:     engine.OrderTypeLimit,
		Price:    150.00,
		Quantity: 7,
	}

	trades, updatedSell := book.Submit(sellOrder)
	fmt.Printf("Sell order status: %s, filled: %d/%d\n",
		updatedSell.Status, updatedSell.Filled, updatedSell.Quantity)
	fmt.Printf("Trades from sell: %d\n", len(trades))

	trades, updatedBuy := book.Submit(buyOrder)
	fmt.Printf("Buy order status: %s, filled: %d/%d\n",
		updatedBuy.Status, updatedBuy.Filled, updatedBuy.Quantity)
	fmt.Printf("Trades produced: %d\n", len(trades))

	for _, t := range trades {
		fmt.Printf("  Trade %s: %d shares @ $%.2f\n", t.ID, t.Quantity, t.Price)
	}

	snap := book.Snapshot()
	fmt.Printf("Order book after matching — bids: %d levels, asks: %d levels\n",
		len(snap.Bids), len(snap.Asks))
}