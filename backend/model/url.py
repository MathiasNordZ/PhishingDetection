from pydantic import BaseModel

class UrlRequest(BaseModel):
    urls: list[str]
    
class UrlResponse(BaseModel):
    url: str