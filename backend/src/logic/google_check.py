# check_google_api.py

import os
import json
import requests
from datetime import timedelta
from typing import List, Dict, Optional

def check_google_api(urls: List[str], redis_client: Optional[object] = None) -> Dict[str, dict]:
    api_key = os.getenv("API_KEY")
    if not api_key:
        print("API key not found.")
        return {}

    results = {}
    urls_to_check = []

    # Use Redis cache if available
    if redis_client:
        for url in urls:
            cache_key = f"url_analysis:{url}"
            cached = redis_client.get(cache_key)

            if cached:
                try:
                    results[url] = json.loads(cached)
                    print(f"Cache hit for: {url}")
                except json.JSONDecodeError:
                    urls_to_check.append(url)
            else:
                urls_to_check.append(url)
    else:
        urls_to_check = urls

    if not urls_to_check:
        return results

    api_url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
    payload = {
        "client": {
            "clientId": "PhishingDetection",
            "clientVersion": "1.5.2"
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE", "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url} for url in urls_to_check]
        }
    }

    try:
        response = requests.post(
            api_url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )
        print("Status Code:", response.status_code)

        data = response.json()
        print("Response JSON:", json.dumps(data, indent=2))

        for url in urls_to_check:
            url_result = {"url": url, "safe": True}

            for match in data.get("matches", []):
                if match.get("threat", {}).get("url") == url:
                    url_result["safe"] = False
                    url_result["threat"] = match
                    print(f"THREAT FOUND: {url}")
                    break

            if redis_client:
                redis_client.setex(
                    f"url_analysis:{url}",
                    timedelta(hours=1),
                    json.dumps(url_result)
                )

            results[url] = url_result

    except (ValueError, json.JSONDecodeError) as e:
        print("Invalid JSON returned:", e)
        return {}

    return results