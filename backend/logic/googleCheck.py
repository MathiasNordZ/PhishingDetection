import os
import requests as req
import json
from datetime import timedelta

def checkGoogleApi(urls: list[str], redisClient = None):
    apiKey = os.getenv("API_KEY")
    if not apiKey:
        print("API key not found.")
        return {}
    
    results = {}
    urlsToCheck = []
    
    # Handle caching if Redis is available
    if redisClient:
        for url in urls:
            cacheKey = f"urlAnalysis:{url}"
            cachedResult = redisClient.get(cacheKey)
            
            if cachedResult:
                try:
                    results[url] = json.loads(cachedResult)
                    print(f"Cache hit for: {url}")
                except json.JSONDecodeError:
                    urlsToCheck.append(url)
            else:
                urlsToCheck.append(url)
    else:
        urlsToCheck = urls
        
    if not urlsToCheck:
        return results

    # Make API request
    apiUrl = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={apiKey}"
    requestBody = {
        "client": {
            "clientId": "PhishingDetection",
            "clientVersion": "1.5.2"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url} for url in urlsToCheck]
        }
    }

    res = req.post(apiUrl, headers={"Content-Type": "application/json"}, data=json.dumps(requestBody))
    
    print("Status Code:", res.status_code)
    
    try:
        data = res.json()
        print("Response JSON:", json.dumps(data, indent=2))
        
        # Process each URL
        for url in urlsToCheck:
            urlResult = {"url": url, "safe": True}
            
            # Check if this URL has threats
            if "matches" in data:
                for match in data["matches"]:
                    if match["threat"]["url"] == url:
                        urlResult["safe"] = False
                        urlResult["threat"] = match
                        print(f"THREAT FOUND: {url}")
                        break
            
            # Cache result if Redis available
            if redisClient:
                cacheKey = f"urlAnalysis:{url}"
                redisClient.setex(
                    cacheKey,
                    timedelta(hours=1),
                    json.dumps(urlResult)
                )
            
            results[url] = urlResult
            
    except ValueError:
        print("Invalid JSON returned:", res.text)
        return {}

    return results