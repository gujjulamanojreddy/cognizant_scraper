const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const scrapeJobs = require('../scraper/scraper');
const logger = require('./logger');
const config = require('../../config/config');

async function ensureDirectoriesExist() {
    const dataDir = path.join(__dirname, '..', 'data');
    const backupsDir = path.join(dataDir, 'backups');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(backupsDir, { recursive: true });

    // Ensure jobs.json exists
    const jobsPath = path.join(dataDir, 'jobs.json');
    try {
        await fs.access(jobsPath);
    } catch {
        await fs.writeFile(jobsPath, '[]', 'utf8');
    }
}

async function startServer() {
    try {
        await ensureDirectoriesExist();

        const app = express();

        // Enable CORS and JSON parsing
        app.use(cors());
        app.use(express.json());

        // Error handling middleware
        app.use((err, req, res, next) => {
            logger.error('Unhandled error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // Serve static files from the public directory
        app.use(express.static(path.join(__dirname, '..', 'public')));

        // API endpoint to get all jobs
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

        // API endpoint to trigger job scraping
        app.post('/api/scrape', async (req, res) => {
            try {
                logger.info('Starting job scraping...');
                const jobs = await scrapeJobs();
                
                // Save jobs to JSON file
                const jobsPath = path.join(__dirname, '..', 'data', 'jobs.json');
                await fs.writeFile(jobsPath, JSON.stringify(jobs, null, 2));
                
                res.json({ success: true, jobCount: jobs.length });
            } catch (error) {
                logger.error('Error during scraping:', error);
                res.status(500).json({ error: 'Failed to scrape jobs' });
            }
        });

        // Serve the frontend
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
        });

        // Handle 404
        app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
        });

        const PORT = config.server.port || 3000;
        const server = app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });

        // Handle server errors
        server.on('error', (error) => {
            logger.error('Server error:', error);
            process.exit(1);
        });

        // Handle process termination
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received. Shutting down gracefully...');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();