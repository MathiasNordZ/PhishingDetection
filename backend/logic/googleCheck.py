import os
import requests as req
import json

def checkGoogleApi(urls: list[str]):
    apiKey = os.getenv("API_KEY")
    if not apiKey:
        print("API key not found.")
        return

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
            "threatEntries": [{"url": url} for url in urls]
        }
    }

    res = req.post(apiUrl, headers={"Content-Type": "application/json"}, data=json.dumps(requestBody))
    
    print("Status Code:", res.status_code)
    try:
        data = res.json()
        print("Response JSON:", json.dumps(data, indent=2))
    except ValueError:
        print("Invalid JSON returned:", res.text)

    return res.json()