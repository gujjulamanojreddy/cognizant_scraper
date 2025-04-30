const puppeteer = require('puppeteer');
const scrapeJobs = require('../src/scraper/scraper');
const Job = require('../src/models/job');

describe('Job Scraper', () => {
    let browser;
    let page;

    jest.setTimeout(120000); // Increase timeout to 2 minutes

    beforeAll(async () => {
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            page = await browser.newPage();
        } catch (error) {
            console.error('Error setting up browser:', error);
            throw error;
        }
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('should scrape job listings from Cognizant career page', async () => {
        await page.goto('https://careers.cognizant.com');

        const jobs = await scrapeJobs(page);

        expect(jobs).toBeInstanceOf(Array);
        expect(jobs.length).toBeGreaterThan(0);

        jobs.forEach(job => {
            expect(job).toHaveProperty('title');
            expect(job).toHaveProperty('location');
            expect(job).toHaveProperty('description');
        });
    });

    test('should handle no job listings scenario', async () => {
        await page.goto('https://careers.cognizant.com/no-jobs');

        const jobs = await scrapeJobs(page);

        expect(jobs).toEqual([]);
    });

    test('Job model validates required fields', () => {
        expect(() => new Job()).toThrow('Job title is required');
        
        const validJob = new Job('Software Engineer', 'New York', 'Description');
        expect(validJob.title).toBe('Software Engineer');
        expect(validJob.location).toBe('New York');
        expect(validJob.description).toBe('Description');
        expect(validJob.source).toBe('Cognizant Careers');
    });

    test('scrapeJobs returns array of Job objects', async () => {
        try {
            const jobs = await scrapeJobs();
            expect(Array.isArray(jobs)).toBe(true);
            
            if (jobs.length > 0) {
                const firstJob = jobs[0];
                expect(firstJob).toBeInstanceOf(Job);
                expect(firstJob.title).toBeTruthy();
                expect(firstJob.location).toBeTruthy();
                expect(firstJob.dateScraped).toBeTruthy();
            }
        } catch (error) {
            console.error('Test error:', error);
            throw error;
        }
    });
});