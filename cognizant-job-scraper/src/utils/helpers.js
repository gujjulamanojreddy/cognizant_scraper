const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

function formatJobData(jobData) {
    return {
        title: jobData.title || 'N/A',
        location: jobData.location || 'N/A',
        description: jobData.description || 'No description available',
    };
}

function handleError(error) {
    logger.error('An error occurred:', error);
}

/**
 * Retry an async operation with exponential backoff
 */
async function retryWithBackoff(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            const delay = initialDelay * Math.pow(2, attempt);
            logger.debug(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

async function retry(fn, retries = 3, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            logger.error(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Save jobs data to JSON file
 */
async function saveJobsToFile(jobs, filePath) {
    try {
        const directory = path.dirname(filePath);
        await fs.mkdir(directory, { recursive: true });
        
        await fs.writeFile(
            filePath,
            JSON.stringify(jobs, null, 2),
            'utf8'
        );
        
        logger.info(`Successfully saved ${jobs.length} jobs to ${filePath}`);
    } catch (error) {
        logger.error('Error saving jobs to file:', error);
        throw error;
    }
}

function sanitizeText(text) {
    return text?.trim().replace(/\s+/g, ' ') || '';
}

/**
 * Clean and normalize job data
 */
function normalizeJobData(job) {
    return {
        ...job,
        title: job.title?.trim(),
        location: job.location?.trim() || 'Not specified',
        description: job.description?.trim(),
        dateScraped: job.dateScraped || new Date().toISOString()
    };
}

function removeDuplicateJobs(jobs) {
    const seen = new Set();
    return jobs.filter(job => {
        const key = `${job.title}-${job.location}-${job.jobId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

module.exports = {
    formatJobData,
    handleError,
    retryWithBackoff,
    saveJobsToFile,
    sanitizeText,
    normalizeJobData,
    removeDuplicateJobs
};