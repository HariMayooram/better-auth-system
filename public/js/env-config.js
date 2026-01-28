(function(window) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isGithub = window.location.host.indexOf('github.io') > -1;

    let apiBasePath;
    let authApiUrl = window.AUTH_API_URL; // Initialize with global if available
    let teamApiUrl = window.TEAM_API_URL; // Initialize with global if available

    if (isGithub) {
        // Production (GitHub Pages)
        apiBasePath = 'https://harimayooram.github.io/webroot-earth/'; // Example, adjust if needed
        authApiUrl = authApiUrl || 'https://api.model.earth/api'; // Use global or default
        teamApiUrl = teamApiUrl || 'https://your-production-team-api.com/api'; // Use global or default
    } else if (isLocalhost) {
        // Local Development
        apiBasePath = '/';
        // Use window.AUTH_API_URL if set from index.html, otherwise fallback to default localhost backend URL
        authApiUrl = authApiUrl || 'http://localhost:3002/api';
        teamApiUrl = teamApiUrl || 'http://localhost:8081/api'; // From analysis: team runs on 8081
    } else {
        // Fallback or other environments
        apiBasePath = '/';
        // Use window.AUTH_API_URL if set from index.html, otherwise fallback to hardcoded default
        authApiUrl = authApiUrl || 'https://api.model.earth/api'; // Fallback to deployed URL for non-localhost
        teamApiUrl = teamApiUrl || 'https://your-production-team-api.com/api'; // Fallback to deployed API URL
    }

    window.envConfig = {
        isLocalhost,
        isGithub,
        apiBasePath,
        authApiUrl,
        teamApiUrl
    };

    // Also set global variables for backward compatibility
    window.AUTH_API_URL = authApiUrl;
    window.TEAM_API_URL = teamApiUrl;

})(window);
