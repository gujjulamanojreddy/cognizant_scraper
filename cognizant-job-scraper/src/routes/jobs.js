const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

router.get('/', async (req, res) => {
    try {
        const jobsPath = path.join(__dirname, '..', 'data', 'jobs.json');
        const jobsData = await fs.readFile(jobsPath, 'utf8');
        const jobs = JSON.parse(jobsData);
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

module.exports = router;
