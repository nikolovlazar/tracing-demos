from typing import List
from fastapi import FastAPI
import asyncio
import httpx
from pydantic import BaseModel
import sentry_sdk

sentry_sdk.init(
    dsn="https://ad72c7c3b096f8a5018a266c6ac0ec55@o4506044970565632.ingest.us.sentry.io/4509033753870336",
    # Add data like request headers and IP for users,
    # see https://docs.sentry.io/platforms/python/data-management/data-collected/ for more info
    send_default_pii=True,

    traces_sample_rate=1.0,
)

app = FastAPI()

# Simulated stock data with all details
STOCKS = [
    {
        "id": "TECH",
        "name": "TechCorp Industries",
        "price": 175.50,
        "volume": 75000000,
        "market_cap": "2.8T",
        "pe_ratio": 28.5
    },
    {
        "id": "CLOUD",
        "name": "CloudNine Systems",
        "price": 375.25,
        "volume": 45000000,
        "market_cap": "2.9T",
        "pe_ratio": 35.2
    },
    {
        "id": "AI",
        "name": "Artificial Intelligence Co",
        "price": 142.75,
        "volume": 25000000,
        "market_cap": "1.8T",
        "pe_ratio": 27.8
    },
    {
        "id": "DATA",
        "name": "DataFlow Technologies",
        "price": 178.90,
        "volume": 35000000,
        "market_cap": "1.9T",
        "pe_ratio": 62.3
    },
    {
        "id": "VR",
        "name": "Virtual Reality Labs",
        "price": 485.30,
        "volume": 15000000,
        "market_cap": "1.2T",
        "pe_ratio": 33.1
    }
]

class Stock(BaseModel):
    id: str
    name: str
    price: float

class StockDetail(Stock):
    volume: int
    market_cap: str
    pe_ratio: float
    sentiment_score: float
    analyst_rating: str

@app.get("/stocks", response_model=List[Stock])
async def get_stocks():
    # Simulate a small delay for the list endpoint
    await asyncio.sleep(0.1)
    return [{"id": stock["id"], "name": stock["name"], "price": stock["price"]} for stock in STOCKS]

@app.get("/stocks/{stock_id}", response_model=StockDetail)
async def get_stock_detail(stock_id: str):
    stock = next((stock for stock in STOCKS if stock["id"] == stock_id), None)
    if not stock:
        return {"error": "Stock not found"}

    async with httpx.AsyncClient(verify=False) as client:
        try:
            response = await client.get(f"http://external-api.com:3002/stock-analysis/{stock_id}")
            if response.status_code == 200:
                external_data = response.json()
                # Merge the data
                return {
                    **stock,
                    "sentiment_score": external_data["sentiment_score"],
                    "analyst_rating": external_data["analyst_rating"]
                }
            else:
                # If the external service fails, return just the basic data
                return {**stock, "sentiment_score": 0.0, "analyst_rating": "N/A"}
        except httpx.RequestError as e:
            # If the external service is unreachable, return just the basic data
            return {**stock, "sentiment_score": 0.0, "analyst_rating": "N/A"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)