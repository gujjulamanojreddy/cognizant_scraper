class Job {
    constructor(title, location, description, jobId, applyLink) {
        if (!title) throw new Error('Job title is required');
        
        this.company = 'Cognizant';
        this.title = title;
        this.location = location || 'Not specified';
        this.description = description || '';
        this.jobId = jobId || `COG-${Date.now()}`;
        this.applyLink = applyLink || '';
        this.dateScraped = new Date().toISOString();
        this.source = 'Cognizant Careers';
        this.scrapedAt = new Date();
    }

    toJSON() {
        return {
            company: this.company,
            title: this.title,
            location: this.location,
            description: this.description,
            jobId: this.jobId,
            applyLink: this.applyLink,
            dateScraped: this.dateScraped,
            source: this.source
        };
    }
}

module.exports = Job;