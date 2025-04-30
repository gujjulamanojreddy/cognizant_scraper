const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function scrapeJobs() {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-features=site-per-process',
            '--disable-dev-shm-usage'
        ],
        defaultViewport: null
    });

    const page = await browser.newPage();
    
    try {
        // Disable request interception for better stability
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(30000);

        // Update URL to correct Cognizant careers page
        console.log('Navigating to Cognizant careers...');
        await page.goto('https://careers.cognizant.com/global/en/jobs', {
            waitUntil: 'networkidle0',
            timeout: 90000
        });

        // Wait for initial load and search results
        await page.waitForTimeout(5000);

        // Click on search/filter if needed
        try {
            const searchButton = await page.waitForSelector('button[data-ph-at-id="jobs-search-button"]');
            if (searchButton) {
                await searchButton.click();
                await page.waitForTimeout(3000);
            }
        } catch (e) {
            console.log('Search button not found, continuing...');
        }

        // Wait for job listings with correct selectors
        console.log('Waiting for job listings...');
        const jobListSelectors = [
            'div[data-ph-at-id="jobs-list"]',
            'div[data-ph-id="ph-page-element-page11-rpQ3Ju"]',
            'div.jobs-list-container'
        ];

        let foundSelector = null;
        for (const selector of jobListSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 10000 });
                foundSelector = selector;
                console.log(`Found job list with selector: ${selector}`);
                break;
            } catch (e) {
                continue;
            }
        }

        if (!foundSelector) {
            throw new Error('Could not find job listings container');
        }

        // Scroll to load all jobs
        await autoScroll(page);
        await page.waitForTimeout(3000);

        // Debug - log page structure
        const pageStructure = await page.evaluate(() => {
            return {
                hasJobBoard: !!document.querySelector('.js-template-jobBoard'),
                jobCardsCount: document.querySelectorAll('.job-card').length,
                pageTitle: document.title
            };
        });
        console.log('Page structure:', pageStructure);

        // Extract jobs with more specific selectors
        console.log('Extracting jobs...');
        const jobs = await page.evaluate(() => {
            const jobs = [];
            const jobCards = document.querySelectorAll([
                '[data-ph-at-id="job-tile"]',
                '[data-ph-at-data-attribute="job-item"]',
                '.job-item'
            ].join(','));

            jobCards.forEach((card, index) => {
                try {
                    const titleEl = card.querySelector([
                        '[data-ph-id="ph-job-title"]',
                        '[data-ph-at-id="job-title"]',
                        '.job-title'
                    ].join(','));

                    const locationEl = card.querySelector([
                        '[data-ph-id="ph-location"]',
                        '[data-ph-at-id="job-location"]',
                        '.job-location'
                    ].join(','));

                    const link = card.querySelector('a[data-ph-id="ph-job-title"]') || 
                               card.querySelector('a[href*="/job/"]');

                    if (titleEl && link) {
                        jobs.push({
                            id: card.getAttribute('data-job-id') || `COG-${Date.now()}-${index}`,
                            title: titleEl.textContent.trim(),
                            location: locationEl ? locationEl.textContent.trim() : 'Location not specified',
                            url: link.href,
                            dateScraped: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.error(`Error processing job card ${index}:`, e);
                }
            });

            return jobs;
        });

        // Debug log
        console.log(`Found ${jobs.length} jobs`);

        if (jobs.length === 0) {
            console.log('No jobs found. Saving page content for debugging...');
            await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
            await fs.writeFile('debug-page.html', await page.content());
        } else {
            console.log(`Successfully found ${jobs.length} jobs`);
            // Save jobs to file
            const dataDir = path.join(__dirname, '..', 'data');
            await fs.mkdir(dataDir, { recursive: true });
            await fs.writeFile(
                path.join(dataDir, 'jobs.json'),
                JSON.stringify(jobs, null, 2)
            );
        }

        return jobs;

    } catch (error) {
        console.error('Scraping error:', error);
        await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
        throw error;
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
    await page.waitForTimeout(2000);
}

module.exports = { scrapeJobs };
