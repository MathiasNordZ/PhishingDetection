# analyze_endpoint.py

from fastapi import FastAPI
from dotenv import load_dotenv
from model.url import UrlRequest
from fastapi.middleware.cors import CORSMiddleware
from logic.google_check import check_google_api
import redis

load_dotenv()

app = FastAPI()

redis_client = redis.Redis(host="localhost", port=6379, db=0)

@app.post("/analyze")
async def analyze_data(data: UrlRequest):
    try:
        if not data.urls:
            return {"matches": []}

        return check_google_api(data.urls, redis_client)
    except Exception as exc:
        print(f"Analyze failed: {exc}")
        return {"matches": [], "error": str(exc)}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)