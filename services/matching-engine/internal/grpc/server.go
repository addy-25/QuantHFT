package grpc

import (
	"context"
	"fmt"
	"log"
	"net"
	"sync"

	"google.golang.org/grpc"
	"quantflow/matching-engine/internal/engine"
	pb "quantflow/matching-engine/proto"
)

// MatchingServer is the gRPC server
// it holds all order books and handles calls from FastAPI
type MatchingServer struct {
	pb.UnimplementedMatchingServiceServer
	books map[string]*engine.OrderBook
	mu    sync.RWMutex
}

func NewMatchingServer() *MatchingServer {
	return &MatchingServer{
		books: make(map[string]*engine.OrderBook),
	}
}

// getOrCreateBook returns the order book for a symbol
// creates one if it doesn't exist yet
func (s *MatchingServer) getOrCreateBook(symbol string) *engine.OrderBook {
	s.mu.RLock()
	book, exists := s.books[symbol]
	s.mu.RUnlock()

	if exists {
		return book
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if book, exists = s.books[symbol]; exists {
		return book
	}

	book = engine.NewOrderBook(symbol)
	s.books[symbol] = book
	log.Printf("Created order book for symbol: %s", symbol)
	return book
}

// SubmitOrder is called by FastAPI when a trader places an order
func (s *MatchingServer) SubmitOrder(
	ctx context.Context,
	req *pb.SubmitOrderRequest,
) (*pb.SubmitOrderResponse, error) {

	log.Printf("Order received: %s %s %d@%.2f",
		req.Side, req.Symbol, req.Quantity, req.Price)

	// convert proto request into internal Order type
	order := &engine.Order{
		ID:       req.OrderId,
		UserID:   req.UserId,
		Symbol:   req.Symbol,
		Side:     engine.Side(req.Side),
		Type:     engine.OrderType(req.Type),
		Price:    req.Price,
		Quantity: req.Quantity,
	}

	book := s.getOrCreateBook(req.Symbol)
	trades, updatedOrder := book.Submit(order)

	// convert trades into proto format to send back to FastAPI
	protoTrades := make([]*pb.TradeResult, len(trades))
	for i, t := range trades {
		protoTrades[i] = &pb.TradeResult{
			TradeId:     t.ID,
			Symbol:      t.Symbol,
			BuyOrderId:  t.BuyOrderID,
			SellOrderId: t.SellOrderID,
			BuyerId:     t.BuyerID,
			SellerId:    t.SellerID,
			Price:       t.Price,
			Quantity:    t.Quantity,
			ExecutedAt:  t.ExecutedAt.Format("2006-01-02T15:04:05Z"),
		}
	}

	return &pb.SubmitOrderResponse{
		OrderId:   updatedOrder.ID,
		Status:    string(updatedOrder.Status),
		Filled:    updatedOrder.Filled,
		Remaining: updatedOrder.Remaining(),
		Trades:    protoTrades,
	}, nil
}

// CancelOrder is called by FastAPI when a trader cancels a pending order
func (s *MatchingServer) CancelOrder(
	ctx context.Context,
	req *pb.CancelOrderRequest,
) (*pb.CancelOrderResponse, error) {

	s.mu.RLock()
	book, exists := s.books[req.Symbol]
	s.mu.RUnlock()

	if !exists {
		return &pb.CancelOrderResponse{
			Success: false,
			Message: fmt.Sprintf("no order book for symbol %s", req.Symbol),
		}, nil
	}

	cancelled := book.Cancel(req.OrderId)
	if cancelled {
		log.Printf("Cancelled order %s in %s", req.OrderId, req.Symbol)
		return &pb.CancelOrderResponse{
			Success: true,
			Message: "order cancelled",
		}, nil
	}

	return &pb.CancelOrderResponse{
		Success: false,
		Message: "order not found or already filled",
	}, nil
}

// GetOrderBook is called by FastAPI to get a snapshot of the current book
// FastAPI then pushes this to the frontend via WebSocket
func (s *MatchingServer) GetOrderBook(
	ctx context.Context,
	req *pb.OrderBookRequest,
) (*pb.OrderBookResponse, error) {

	s.mu.RLock()
	book, exists := s.books[req.Symbol]
	s.mu.RUnlock()

	if !exists {
		return &pb.OrderBookResponse{
			Symbol: req.Symbol,
			Bids:   []*pb.PriceLevel{},
			Asks:   []*pb.PriceLevel{},
		}, nil
	}

	snap := book.Snapshot()

	protoBids := make([]*pb.PriceLevel, len(snap.Bids))
	for i, b := range snap.Bids {
		protoBids[i] = &pb.PriceLevel{
			Price:    b.Price,
			Quantity: b.Quantity,
		}
	}

	protoAsks := make([]*pb.PriceLevel, len(snap.Asks))
	for i, a := range snap.Asks {
		protoAsks[i] = &pb.PriceLevel{
			Price:    a.Price,
			Quantity: a.Quantity,
		}
	}

	return &pb.OrderBookResponse{
		Symbol: req.Symbol,
		Bids:   protoBids,
		Asks:   protoAsks,
	}, nil
}

// StartGRPCServer opens port 50051 and listens for calls from FastAPI
func StartGRPCServer() error {
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		return fmt.Errorf("failed to listen on port 50051: %w", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterMatchingServiceServer(grpcServer, NewMatchingServer())

	log.Println("Matching engine gRPC server listening on :50051")
	return grpcServer.Serve(listener)
}