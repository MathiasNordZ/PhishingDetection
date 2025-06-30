from fastapi import FastAPI
from dotenv import load_dotenv
from model.url import UrlRequest
from fastapi.middleware.cors import CORSMiddleware
from logic.googleCheck import checkGoogleApi

load_dotenv()
app = FastAPI()

@app.post("/analyze")
async def analyzeData(data: UrlRequest):
    return checkGoogleApi(data.urls)
  
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