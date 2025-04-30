const express = require('express');
const path = require('path');
const cors = require('cors');
const jobsRouter = require('./routes/jobs');
const { scrapeJobs } = require('./utils/scraper');

const app = express();
const DEFAULT_PORT = 3000;

function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) return val;
    if (port >= 0) return port;
    return false;
}

function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = require('net').createServer();
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                server.listen(++startPort);
            } else {
                reject(err);
            }
        });

        server.on('listening', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });

        server.listen(startPort);
    });
}

async function startServer() {
    try {
        const port = normalizePort(process.env.PORT || DEFAULT_PORT);
        const availablePort = await findAvailablePort(port);
        
        // Add middleware
        app.use(cors());
        app.use(express.json());
        app.use(express.static(path.join(__dirname, '..', 'public')));

        // Routes
        app.get('/api/jobs', async (req, res) => {
            try {
                console.log('Starting job scraping...');
                const jobs = await scrapeJobs();
                
                if (!jobs || jobs.length === 0) {
                    console.log('No jobs found');
                    return res.status(404).json({ 
                        error: 'No jobs found',
                        message: 'The scraper could not find any jobs at this time'
                    });
                }

                console.log(`Successfully retrieved ${jobs.length} jobs`);
                res.json(jobs);
            } catch (error) {
                console.error('Failed to scrape jobs:', error);
                res.status(500).json({ 
                    error: 'Failed to fetch jobs',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Serve index.html for root route
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
        });

        const server = app.listen(availablePort, () => {
            console.log(`Server running at http://localhost:${availablePort}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            server.close(() => {
                console.log('Server gracefully terminated');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            server.close(() => {
                console.log('Server gracefully terminated');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
