# Cognizant Job Scraper

A Node.js application that scrapes job listings from Cognizant's career page using Puppeteer.

## Features

- Scrapes job listings from Cognizant's career page
- Handles pagination automatically
- Saves results to JSON file
- Error handling and retry mechanism
- Configurable scraping parameters

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Usage

Run the scraper:
```bash
npm start
```

The scraped jobs will be saved in `src/data/jobs.json`.

## Configuration

You can modify the scraping behavior in `config/config.js`:

- `baseUrl`: Cognizant careers page URL
- `timeout`: Page load timeout
- `retryAttempts`: Number of retry attempts for failed operations
- `retryDelay`: Delay between retries
- `waitBetweenPages`: Delay between pagination

## Development

Run tests:
```bash
npm test
```

Format code:
```bash
npm run format
```

Lint code:
```bash
npm run lint
```