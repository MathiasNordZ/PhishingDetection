from fastapi import FastAPI
from dotenv import load_dotenv
from src.model.url import UrlRequest
from fastapi.middleware.cors import CORSMiddleware
from backend.src.logic.google_check import checkGoogleApi
import redis

load_dotenv()
app = FastAPI()
redisClient = redis.Redis(host="localhost", port=6379, db=0)

@app.post("/analyze")
async def analyzeData(data: UrlRequest):
    try:
        if not data.urls:
            return {"matches": []}
        return checkGoogleApi(data.urls, redisClient=redisClient)
    except Exception as e:
        print(f"Analyze failed: {e}")
        return {"matches": [], "error": str(e)}
  
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
      
"""
  urlList = [
  "https://mass-gov-zooi.icu/",
  "http://ledgerr-nanoxious.webflow.io/",
  "http://sso-ndax--io-cdn--auth.webflow.io/",
  "http://xplornetemail.weebly.com/",
  "https://a.onetapp.biz.id/x/danakaget=ids6j7sxzeg&r=iVIQUs",
  "http://ledgre-com--start-sso.webflow.io/",
  "http://robinhood-login-help-sso.github.io/en-us",
  "http://wnj8q.icu/"
]

checkGoogleApi(urlList)
"""