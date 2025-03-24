from fastapi import FastAPI
import asyncio
from typing import Dict

app = FastAPI()

# Simulated analysis data
STOCK_ANALYSIS = {
    "TECH": {
        "sentiment_score": 0.85,
        "analyst_rating": "Strong Buy",
        "delay": 2.5  # seconds
    },
    "CLOUD": {
        "sentiment_score": 0.72,
        "analyst_rating": "Buy",
        "delay": 1.8
    },
    "AI": {
        "sentiment_score": 0.95,
        "analyst_rating": "Strong Buy",
        "delay": 1.2
    },
    "DATA": {
        "sentiment_score": 0.68,
        "analyst_rating": "Hold",
        "delay": 2.0
    },
    "VR": {
        "sentiment_score": 0.78,
        "analyst_rating": "Buy",
        "delay": 1.5
    }
}

@app.get("/stock-analysis/{stock_id}")
async def get_stock_analysis(stock_id: str) -> Dict:
    if stock_id not in STOCK_ANALYSIS:
        return {"error": "Stock not found"}

    analysis = STOCK_ANALYSIS[stock_id]

    # Simulate the delay
    await asyncio.sleep(analysis["delay"])

    return {
        "sentiment_score": analysis["sentiment_score"],
        "analyst_rating": analysis["analyst_rating"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)