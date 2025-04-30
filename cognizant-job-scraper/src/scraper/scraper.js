const puppeteer = require('puppeteer');
const path = require('path');
const Job = require('../models/job');
const logger = require('../utils/logger');
const config = require('../../config/config');
const fs = require('fs').promises;
const { retryWithBackoff } = require('../utils/helpers');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeJobs() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false, // Use headed mode to bypass Cloudflare
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1920,1080',
                '--disable-features=site-per-process',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-blink-features=AutomationControlled'
            ],
            defaultViewport: { width: 1920, height: 1080 }
        });

        // Add retry logic for navigation
        const maxRetries = 3;
        let retryCount = 0;
        let success = false;

        while (!success && retryCount < maxRetries) {
            try {
                const page = await browser.newPage();
                
                // Configure page settings
                await Promise.all([
                    page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'),
                    page.setExtraHTTPHeaders({
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    }),
                    page.setJavaScriptEnabled(true)
                ]);

                // Mask automation
                await page.evaluateOnNewDocument(() => {
                    delete navigator.__proto__.webdriver;
                    window.navigator.chrome = { runtime: {} };
                    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                });

                logger.info(`Navigation attempt ${retryCount + 1}/${maxRetries}`);
                
                // Navigate with timeout
                const response = await page.goto('https://careers.cognizant.com/global/en/c/technology-jobs', {
                    waitUntil: ['networkidle0', 'domcontentloaded'],
                    timeout: 60000
                });

                if (!response || !response.ok()) {
                    throw new Error(`Navigation failed with status: ${response?.status()}`);
                }

                // Wait for initial page load
                await delay(5000);

                // Check if we hit Cloudflare
                const pageTitle = await page.title();
                if (pageTitle.includes('Attention Required') || pageTitle.includes('Cloudflare')) {
                    logger.info('Detected Cloudflare challenge page, waiting for verification...');
                    await delay(30000);
                }

                // Verify we can access the content
                const content = await page.content();
                if (content.includes('job-listing') || content.includes('card-job')) {
                    success = true;
                    logger.info('Successfully loaded the jobs page');
                    
                    // Continue with job extraction...
                    // Rest of the existing job extraction code

                    // Add debug logging
                    logger.info('Page loaded, checking content...');
                    
                    // Wait for any dynamic content to load
                    await delay(10000);

                    // Log the page title for debugging
                    const pageTitle = await page.title();
                    logger.info(`Page title: ${pageTitle}`);

                    // Try to find any visible content first
                    const bodyContent = await page.evaluate(() => document.body.innerText);
                    logger.info(`Page has content: ${bodyContent.length > 0}`);

                    // Wait for any element that indicates the job listings section
                    const jobSelectors = [
                        'div.card.card-job',
                        'div[class*="job-listing"]',
                        'div[class*="search-results"]',
                        '[data-ph-at-id="jobs-list"]'
                    ];

                    let foundSelector = null;
                    for (const selector of jobSelectors) {
                        try {
                            logger.info(`Trying selector: ${selector}`);
                            await page.waitForSelector(selector, { timeout: 30000 });
                            foundSelector = selector;
                            logger.info(`Found matching element with selector: ${selector}`);
                            break;
                        } catch (e) {
                            logger.info(`Selector ${selector} not found`);
                            continue;
                        }
                    }

                    if (!foundSelector) {
                        logger.error('No job elements found on the page');
                        throw new Error('Could not find job listings');
                    }

                    // Take a screenshot for debugging
                    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
                    
                    // Extract jobs with the successful selector
                    const jobs = await page.evaluate((selector) => {
                        const jobList = [];
                        const jobElements = document.querySelectorAll(selector);
                        console.log(`Found ${jobElements.length} job elements`);
                        
                        jobElements.forEach((element, index) => {
                            try {
                                // Try multiple possible selectors for job information
                                const title = element.querySelector('h2')?.textContent || 
                                            element.querySelector('[class*="title"]')?.textContent ||
                                            element.querySelector('a')?.textContent;
                                            
                                const link = element.querySelector('a')?.href;
                                const id = element.getAttribute('data-id') || 
                                        element.getAttribute('data-job-id') ||
                                        `COG-${Date.now()}-${index}`;
                                        
                                if (title && link) {
                                    jobList.push({
                                        title: title.trim(),
                                        location: element.querySelector('[class*="location"]')?.textContent?.trim() || 'Not specified',
                                        jobId: id,
                                        applyLink: link,
                                        company: 'Cognizant',
                                        dateScraped: new Date().toISOString(),
                                        status: 'active'
                                    });
                                }
                            } catch (e) {
                                console.error(`Error processing job element ${index}:`, e);
                            }
                        });
                        
                        return jobList;
                    }, foundSelector);

                    // Log the results
                    logger.info(`Extracted ${jobs.length} jobs`);

                    // Validate and clean job data
                    const validJobs = jobs.filter(job => 
                        job.title && 
                        job.applyLink && 
                        job.applyLink.includes('cognizant.com')
                    );

                    logger.info(`Found ${validJobs.length} valid jobs out of ${jobs.length} total jobs`);

                    // Ensure data directory exists and save jobs
                    const dataDir = path.join(__dirname, '..', 'data');
                    await fs.mkdir(dataDir, { recursive: true });
                    
                    const jobsPath = path.join(dataDir, 'jobs.json');
                    await fs.writeFile(jobsPath, JSON.stringify(validJobs, null, 2));
                    
                    logger.info(`Jobs saved to ${jobsPath}`);
                    return validJobs;

                } else {
                    throw new Error('Page loaded but no job content found');
                }

            } catch (error) {
                retryCount++;
                logger.error(`Navigation attempt ${retryCount} failed:`, error.message);
                if (retryCount === maxRetries) {
                    throw new Error(`Failed to load page after ${maxRetries} attempts`);
                }
                await delay(10000 * retryCount); // Exponential backoff
            }
        }

    } catch (error) {
        logger.error('Error during scraping:', error);
        // Save error screenshot and page content for debugging
        if (browser) {
            const page = (await browser.pages())[0];
            if (page) {
                const errorScreenshotPath = path.join(__dirname, '..', '..', 'error-screenshot.png');
                const errorHtmlPath = path.join(__dirname, '..', '..', 'error-page.html');
                await page.screenshot({ path: errorScreenshotPath, fullPage: true });
                await fs.writeFile(errorHtmlPath, await page.content());
                logger.info('Debug files saved: error-screenshot.png and error-page.html');
            }
        }
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
    await delay(3000); // Wait for possible lazy-loaded content
}

module.exports = scrapeJobs;