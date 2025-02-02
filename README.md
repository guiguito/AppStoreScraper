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

#### Search
- `/search`: Search for apps with parameters:
  - `term`: Search term
  - `lang`: Language code (e.g., 'en', 'fr')
  - `country`: Country code (e.g., 'US', 'FR', 'GB')

#### Collections
All collection endpoints use the format `/collection/<type>` and accept these parameters:
- `lang`: Language code (e.g., 'en', 'fr')
- `country`: Country code (e.g., 'US', 'FR', 'GB')

Available collection types:

**iOS Apps**
- `topfreeapplications`: Top free iOS apps
- `topgrossingapplications`: Top grossing iOS apps
- `toppaidapplications`: Top paid iOS apps
- `newapplications`: New iOS apps
- `newfreeapplications`: New free iOS apps
- `newpaidapplications`: New paid iOS apps

**iPad Apps**
- `topfreeipadapplications`: Top free iPad apps
- `topgrossingipadapplications`: Top grossing iPad apps
- `toppaidipadapplications`: Top paid iPad apps

**Mac Apps**
- `topmacapplications`: Top Mac apps
- `topfreemacapplications`: Top free Mac apps
- `topgrossingmacapplications`: Top grossing Mac apps
- `toppaidmacapplications`: Top paid Mac apps

#### Developer Apps
- `/developer-apps/:devId`: Get all apps by a developer
  - `devId`: Developer ID (e.g., '6480469576')
  - `lang`: Language code (e.g., 'en', 'fr')
  - `country`: Country code (e.g., 'US', 'FR', 'GB')

#### Similar Apps
- `/similar/:id`: Get similar apps for a given app
  - `id`: App ID (e.g., '6480469576')
  - `lang`: Language code (e.g., 'en', 'fr')
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
