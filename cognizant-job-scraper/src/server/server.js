const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const cors = require('cors');
const scrapeJobs = require('../scraper/scraper');
const logger = require('../utils/logger');

const app = express();
const initialPort = 3000;
let currentPort = initialPort;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

app.post('/api/scrape', async (req, res) => {
    try {
        logger.info('Starting job scrape...');
        const jobs = await scrapeJobs();
        logger.info(`Scraped ${jobs.length} jobs`);
        
        const dataDir = path.join(__dirname, '..', 'data');
        await fs.mkdir(dataDir, { recursive: true });
        
        const jobsPath = path.join(dataDir, 'jobs.json');
        await fs.writeFile(jobsPath, JSON.stringify(jobs, null, 2));
        
        res.json({ success: true, count: jobs.length, jobs });
    } catch (error) {
        logger.error('Scraping error:', error);
        res.status(500).json({ error: 'Failed to scrape jobs', details: error.message });
    }
});

app.get('/api/jobs', async (req, res) => {
    try {
        const jobsPath = path.join(__dirname, '..', 'data', 'jobs.json');
        const data = await fs.readFile(jobsPath, 'utf8');
        const jobs = JSON.parse(data);
        res.json(jobs);
    } catch (error) {
        logger.error('Error reading jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

function startServer(port) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port)
            .on('listening', () => {
                console.log(`Server running successfully on port ${port}`);
                resolve(server);
            })
            .on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is busy, trying ${port + 1}...`);
                    server.close();
                    resolve(startServer(port + 1));
                } else {
                    reject(err);
                }
            });
    });
}

// Start server with automatic port selection
startServer(currentPort).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
