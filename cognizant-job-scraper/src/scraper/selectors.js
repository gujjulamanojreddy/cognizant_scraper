module.exports = {
    // Main content selectors
    mainContent: '.jobs-list, .search-results-list',
    jobListing: '.job-card, .search-result-item',
    jobTitle: '.job-title, .posting-title',
    jobLocation: '.job-location, .posting-location',
    jobDescription: '.job-description, .posting-description',
    applyButton: 'a[href*="apply"], .apply-button',
    
    // Navigation elements
    loadMoreButton: 'button[data-automation="load-more"], .load-more-button',
    searchInput: 'input[data-ph-at-id="keyword-search"]',
    filterButton: 'button[data-ph-at-id="filter-button"]',
    
    // Job details
    jobIdAttribute: 'data-job-id',
    jobUrlSelector: 'a[data-ph-at-id="job-title-link"]',
    
    // Loading states
    loadingIndicator: '[data-ph-at-id="loading-indicator"]',
    
    // Fallback selectors for dynamic content
    fallback: {
        jobListing: '.careers-job-tile, div[class*="job-card"]',
        jobTitle: 'a[class*="job-title"], .position-title',
        jobLocation: '.location-text, div[class*="location"]',
        jobDescription: '.description-text, div[class*="description"]',
        applyButton: 'a[href*="apply"], .apply-now',
        loadMoreButton: 'button:contains("Show More"), button:contains("Load More")'
    }
};