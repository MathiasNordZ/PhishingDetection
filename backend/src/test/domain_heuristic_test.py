# test_domain_heuristic.py

import unittest
from backend.logic.customHeuristics.domain_heuristic import DomainHeuristic

class TestDomainHeuristic(unittest.TestCase):

    def test_ip_address_detected(self):
        url = "http://192.168.1.1/path"
        domains = []
        dh = DomainHeuristic(url, domains)
        self.assertTrue(dh.is_ip_address())

    def test_no_ip_address(self):
        url = "http://example.com"
        domains = []
        dh = DomainHeuristic(url, domains)
        self.assertFalse(dh.is_ip_address())

    def test_subdomain_count(self):
        url = "http://a.b.c.d.com"
        domains = []
        dh = DomainHeuristic(url, domains)
        self.assertTrue(dh.is_too_many_subdomains())

    def test_not_too_many_subdomains(self):
        url = "http://a.b.com"
        domains = []
        dh = DomainHeuristic(url, domains)
        self.assertFalse(dh.is_too_many_subdomains())

    def test_url_check_with_domains(self):
        url = "http://phishing.site.com"
        domains = ["phishing"]
        dh = DomainHeuristic(url, domains)
        self.assertTrue(dh.url_check())  # should be True because domain match + subdomain

    def test_url_check_with_ip_and_subdomains(self):
        url = "http://192.168.0.1.bad.domain.com"
        domains = []
        dh = DomainHeuristic(url, domains)
        self.assertTrue(dh.url_check())  # should be True because IP + subdomain

    def test_url_check_low_score(self):
        url = "http://safe.domain.com"
        domains = ["malicious"]
        dh = DomainHeuristic(url, domains)
        self.assertFalse(dh.url_check())  # should be False due to low score

if __name__ == '__main__':
    unittest.main()
