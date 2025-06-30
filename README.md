# Phishing Detection Extension (WIP)

## Description

This is a chrome extension made to detect possible phishing links on a webpage. It is useful to avoid clicking suspicious links.

## Features

- Search site for suspicious link.
- Check towards Google's Safe Browsing API.
- Highlights positive flags.

## Installation

1. Clone the repository
2. Open `chrome://extensions/` in Chrome
3. Enable Developer Mode
4. Click "Load unpacked"
5. Select the extension directory

## Usage

- Visit websites and it will automatically detect and mark possible hits.

## How It Works

- The frontend javascript scrapes the visited sites for urls.
- The scraped urls are then sent as a POST to my custom API endpoint.
- The API endpoint processes the url(s), and passes them to Google Safe Browsing API.
- If the url(s) exist in the Google Safe Browsing API, the links on the page you visit will be highlighted.

## Privacy Policy

- The application currently does not save any data, but we plan to cache url(s) to reduce API requests.

## Development

- The tech stack consists of HTML/JS/CSS, Python with FastAPI in the backend and Redis for caching.
