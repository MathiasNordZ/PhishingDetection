# domain_heuristic.py

import re

class DomainHeuristic:
    """
    Heuristically classifies potential malicious URLs based on:
    - Containing IP address
    - Having too many subdomains
    - Matching known suspicious domains
    """
    def __init__(self, url: str, domains: list[str], score: int = 0):
        self.url = url
        self.domains = domains
        self.score = score

    def is_ip_address(self) -> bool:
        """Returns True if the URL contains an IPv4 address."""
        pattern = r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"
        return bool(re.search(pattern, self.url))

    def is_too_many_subdomains(self) -> bool:
        """Returns True if the URL has more than 3 dots (i.e. subdomains)."""
        return self.url.count('.') >= 3

    def url_check(self) -> bool:
        """Checks heuristics and returns True if score >= 2, else False."""
        if any(domain in self.url for domain in self.domains):
            self.score += 1
        if self.is_ip_address():
            self.score += 1
        if self.is_too_many_subdomains():
            self.score += 1
        return self.score >= 2

