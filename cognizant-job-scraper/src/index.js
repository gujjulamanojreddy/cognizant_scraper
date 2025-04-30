const path = require('path');
const fs = require('fs').promises;
const scrapeJobs = require('./scraper/scraper');
const logger = require('./utils/logger');
const config = require('../config/config');
const { saveJobsToFile } = require('./utils/helpers');

async function createBackup(currentData) {
    const backupDir = path.resolve(config.output.backupDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `jobs-${timestamp}.json`);

    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(currentData, null, 2));

    // Cleanup old backups
    const files = await fs.readdir(backupDir);
    const backupFiles = files
        .filter(f => f.startsWith('jobs-'))
        .sort()
        .reverse();

    if (backupFiles.length > config.output.keepBackups) {
        const filesToDelete = backupFiles.slice(config.output.keepBackups);
        await Promise.all(
            filesToDelete.map(file => 
                fs.unlink(path.join(backupDir, file))
                    .catch(err => logger.error(`Failed to delete backup ${file}:`, err))
            )
        );
    }
}

async function main() {
    try {
        console.log('Starting job scraper...');
        const jobs = await scrapeJobs();
        
        await fs.writeFile(
            path.join(__dirname, 'data', 'jobs.json'),
            JSON.stringify(jobs, null, 2)
        );
        
        console.log(`Successfully scraped ${jobs.length} jobs`);
    } catch (error) {
        console.error('Error running scraper:', error);
        process.exit(1);
    }
}

main();