from pydantic import BaseModel

class UrlRequest(BaseModel):
    url: list[str]
    
class UrlResponse(BaseModel):
    url: str