package main

import (
	"log"
	matchinggrpc "quantflow/matching-engine/internal/grpc"
)

func main() {
	log.Println("Starting QuantFlow matching engine...")
	if err := matchinggrpc.StartGRPCServer(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}