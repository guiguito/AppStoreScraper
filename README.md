# AppStore Scraper

A Firebase Functions-based API for scraping App Store data.

## Local Development

When running the functions locally using Firebase Emulator, use the following URL format:

```
http://127.0.0.1:5001/appstorescraper-372b7/us-central1/api/<route>
```

Example URLs:
- Search apps: `http://127.0.0.1:5001/appstorescraper-372b7/us-central1/api/search?term=wer&lang=en&country=FR`
- Top free apps: `http://127.0.0.1:5001/appstorescraper-372b7/us-central1/api/collection/topfreeapplications?country=US`

### URL Structure
- `127.0.0.1:5001`: Local emulator host and port
- `appstorescraper-372b7`: Your Firebase project ID
- `us-central1`: Firebase Functions region
- `api`: The name of your exported function
- `<route>`: The specific endpoint you want to access (e.g., `/search`, `/collection/topfreeapplications`)

### Available Routes
- `/search`: Search for apps with parameters:
  - `term`: Search term
  - `lang`: Language code (e.g., 'en', 'fr')
  - `country`: Country code (e.g., 'US', 'FR', 'GB')
- `/collection/topfreeapplications`: Get top free applications with parameters:
  - `country`: Country code (e.g., 'US', 'FR', 'GB')

## Running Locally

1. Install dependencies:
```bash
cd functions
npm install
```

2. Start the Firebase emulator:
```bash
npm run serve
```
