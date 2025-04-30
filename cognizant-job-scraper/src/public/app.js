document.addEventListener('DOMContentLoaded', () => {
    const jobList = document.getElementById('jobList');
    const searchInput = document.getElementById('searchInput');
    const locationFilter = document.getElementById('locationFilter');
    const scrapeButton = document.getElementById('scrapeButton');
    const loadingElement = document.getElementById('loading');

    let jobs = [];
    let locations = new Set();

    // Load jobs when page loads
    loadJobs();

    // Event listeners
    searchInput.addEventListener('input', filterJobs);
    locationFilter.addEventListener('change', filterJobs);
    scrapeButton.addEventListener('click', triggerScrape);

    async function loadJobs() {
        try {
            showLoading();
            const response = await fetch('/api/jobs');
            if (!response.ok) throw new Error('Failed to fetch jobs');
            
            jobs = await response.json();
            updateLocationFilter();
            displayJobs(jobs);
        } catch (error) {
            console.error('Error loading jobs:', error);
            jobList.innerHTML = '<p class="error">Failed to load jobs. Please try again later.</p>';
        } finally {
            hideLoading();
        }
    }

    async function triggerScrape() {
        try {
            showLoading();
            scrapeButton.disabled = true;
            
            const response = await fetch('/api/scrape', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to scrape jobs');
            
            const result = await response.json();
            if (result.success) {
                await loadJobs();
            }
        } catch (error) {
            console.error('Error scraping jobs:', error);
            alert('Failed to scrape jobs. Please try again later.');
        } finally {
            hideLoading();
            scrapeButton.disabled = false;
        }
    }

    function updateLocationFilter() {
        // Clear existing options except the default
        locationFilter.innerHTML = '<option value="">All Locations</option>';
        
        // Get unique locations
        locations = new Set(jobs.map(job => job.location));
        
        // Add location options
        [...locations].sort().forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationFilter.appendChild(option);
        });
    }

    function filterJobs() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedLocation = locationFilter.value;

        const filteredJobs = jobs.filter(job => {
            const matchesSearch = 
                job.title.toLowerCase().includes(searchTerm) ||
                job.description.toLowerCase().includes(searchTerm) ||
                job.company.toLowerCase().includes(searchTerm);
            const matchesLocation = !selectedLocation || job.location === selectedLocation;
            return matchesSearch && matchesLocation;
        });

        displayJobs(filteredJobs);
    }

    function displayJobs(jobsToDisplay) {
        if (!jobsToDisplay.length) {
            jobList.innerHTML = '<p class="no-results">No jobs found matching your criteria.</p>';
            return;
        }

        jobList.innerHTML = jobsToDisplay.map(job => `
            <div class="job-card">
                <p class="company-name">${escapeHtml(job.company)}</p>
                <h2 class="job-title">${escapeHtml(job.title)}</h2>
                <p class="job-location">${escapeHtml(job.location)}</p>
                ${job.description ? `<p class="job-description">${escapeHtml(job.description.substring(0, 200))}...</p>` : ''}
                ${job.applyLink ? `
                    <a href="${escapeHtml(job.applyLink)}" 
                       class="apply-button" 
                       target="_blank" 
                       rel="noopener noreferrer">
                        Apply Now
                    </a>
                ` : ''}
            </div>
        `).join('');
    }

    function showLoading() {
        loadingElement.classList.remove('hidden');
    }

    function hideLoading() {
        loadingElement.classList.add('hidden');
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});