module.exports = {
    scraper: {
        baseUrl: 'https://careers.cognizant.com/global/en/search-results',
        timeout: 180000, // Increased to 180 seconds
        maxPages: 5,
        retryAttempts: 3,
        retryDelay: 5000,
        waitBetweenPages: 3000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    output: {
        dataDir: './src/data',
        filename: 'jobs.json',
        backupDir: './src/data/backups',
        keepBackups: 5
    },
    browser: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials',
            '--disable-features=BlockInsecurePrivateNetworkRequests'
        ],
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    },
    server: {
        port: 3000,
        host: 'localhost'
    }
};