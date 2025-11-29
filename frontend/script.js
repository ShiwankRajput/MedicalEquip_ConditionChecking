const API_BASE_URL = '/api'; // This will work when served from the same origin
// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewSection = document.getElementById('previewSection');
const imagePreview = document.getElementById('imagePreview');
const resultSection = document.getElementById('resultSection');
const loading = document.getElementById('loading');
const loadingNote = document.getElementById('loadingNote');
const apiStatus = document.getElementById('apiStatus');

// Event Listeners
imageInput.addEventListener('change', handleImageUpload);

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            uploadArea.style.display = 'none';
            previewSection.style.display = 'block';
            hideResult();
        };
        
        reader.readAsDataURL(file);
    }
}

async function analyzeImage() {
    const file = imageInput.files[0];
    if (!file) {
        alert('Please select an image first');
        return;
    }

    showLoading();
    hideResult();

    const formData = new FormData();
    formData.append('image', file);

    try {
        loadingNote.textContent = 'Analyzing medical equipment... This may take a few seconds.';
        
        const response = await fetch(`${API_BASE_URL}/analyze-equipment`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        displayResults(result);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Analysis failed. Please check if the server is running and try again.');
    } finally {
        hideLoading();
    }
}

function displayResults(data) {
    console.log('Displaying results:', data);
    
    // Update basic information
    document.getElementById('equipmentName').textContent = data.equipment;
    document.getElementById('conditionBadge').textContent = data.condition;
    document.getElementById('conditionBadge').className = `condition-badge ${data.condition}`;
    document.getElementById('conditionDescription').textContent = data.description;
    document.getElementById('confidenceLevel').textContent = data.confidence;
    document.getElementById('estimatedValue').textContent = data.estimatedValue;

    // Update analysis source
    const analysisSource = document.getElementById('analysisSource');
    analysisSource.innerHTML = `
        <span class="source-badge">Analysis Source: ${data.analysisSource}</span>
        ${data.note ? `<p style="margin-top: 8px; color: #666; font-size: 0.9rem;">${data.note}</p>` : ''}
    `;

    // Update API status in demo note
    apiStatus.textContent = data.analysisSource;

    // Update visible issues
    const visibleIssuesSection = document.getElementById('visibleIssuesSection');
    const visibleIssuesList = document.getElementById('visibleIssuesList');
    visibleIssuesList.innerHTML = '';
    
    if (data.visibleIssues && data.visibleIssues.length > 0) {
        data.visibleIssues.forEach(issue => {
            const li = document.createElement('li');
            li.textContent = issue;
            visibleIssuesList.appendChild(li);
        });
        visibleIssuesSection.style.display = 'block';
    } else {
        visibleIssuesSection.style.display = 'none';
    }

    // Update recommendations
    const recommendationsList = document.getElementById('recommendationsList');
    recommendationsList.innerHTML = '';
    if (data.recommendations && data.recommendations.length > 0) {
        data.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationsList.appendChild(li);
        });
    }

    // Update key considerations
    const keyConsiderationsList = document.getElementById('keyConsiderationsList');
    keyConsiderationsList.innerHTML = '';
    if (data.keyConsiderations && data.keyConsiderations.length > 0) {
        data.keyConsiderations.forEach(consideration => {
            const li = document.createElement('li');
            li.textContent = consideration;
            keyConsiderationsList.appendChild(li);
        });
    }

    // Update next steps
    const nextStepsList = document.getElementById('nextStepsList');
    nextStepsList.innerHTML = '';
    if (data.nextSteps && data.nextSteps.length > 0) {
        data.nextSteps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            nextStepsList.appendChild(li);
        });
    }

    // Show result section
    showResult();
    
    // Scroll to results
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

function showLoading() {
    loading.style.display = 'block';
    previewSection.style.display = 'none';
    hideResult();
}

function hideLoading() {
    loading.style.display = 'none';
}

function showResult() {
    resultSection.style.display = 'block';
}

function hideResult() {
    resultSection.style.display = 'none';
}

function resetUpload() {
    imageInput.value = '';
    uploadArea.style.display = 'block';
    previewSection.style.display = 'none';
    hideResult();
}

function resetApp() {
    resetUpload();
    hideResult();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function searchOnline() {
    const equipment = document.getElementById('equipmentName').textContent;
    const condition = document.getElementById('conditionBadge').textContent;
    
    const searchQuery = encodeURIComponent(`used ${equipment} medical equipment ${condition} condition`);
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;
    
    window.open(searchUrl, '_blank');
}

// Initialize app and check server status
async function initializeApp() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const health = await response.json();
        console.log('Server status:', health);
        
        // Update API status display
        const statusElement = document.querySelector('.demo-note strong');
        if (statusElement) {
            apiStatus.textContent = health.apiStatus || 'Google Gemini AI';
        }
    } catch (error) {
        console.error('Could not connect to server:', error);
        apiStatus.textContent = 'Demo Mode (Server Connection Failed)';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);

console.log('Medical Equipment Analyzer Frontend initialized');