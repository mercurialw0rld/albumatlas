// AlbumAtlas - Y2K Album Recommendation System

class AlbumAtlas {
    constructor() {
        this.form = document.getElementById('recommendationForm');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.errorSection = document.getElementById('errorSection');
        this.recommendationsContainer = document.getElementById('recommendations');

        this.init();
    }

    init() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));

        // Add some Y2K flair with random floating elements
        this.createFloatingParticles();
    }

    async handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(this.form);
        const data = {
            mood: formData.get('mood'),
            artist: formData.get('artist'),
            album: formData.get('album'),
            additional: formData.get('additional')
        };

        // Validate input
        if (!data.mood && !data.artist && !data.album) {
            this.showError('Please provide at least a mood, artist, or album you like!');
            return;
        }

        // Show loading state
        this.showLoading();

        try {
            // Generate query from form data
            const query = this.generateQuery(data);

            // Get recommendations (this would connect to your Node.js backend)
            const recommendations = await this.getRecommendations(query);

            // Display results
            this.showResults(recommendations);

        } catch (error) {
            console.error('Error getting recommendations:', error);
            this.showError('Failed to generate recommendations. Please try again.');
        }
    }

    generateQuery(data) {
        let query = '';

        if (data.mood) {
            query += `I'm feeling ${data.mood}. `;
        }

        if (data.artist) {
            query += `I like ${data.artist}. `;
        }

        if (data.album) {
            query += `I enjoyed ${data.album}. `;
        }

        if (data.additional) {
            query += data.additional;
        }

        // If no specific preferences, create a general query
        if (!query.trim()) {
            query = 'Suggest some great albums for me to discover';
        }

        return query;
    }

    async getRecommendations(query) {
        console.log('🎵 Sending request to server...');

        try {
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mood: this.form.mood.value,
                    artist: this.form.artist.value,
                    album: this.form.album.value,
                    additional: this.form.additional.value
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('✅ Recommendations received from server');
                // Parse the recommendation text to extract album information
                return this.parseRecommendationResponse(data);
            } else {
                throw new Error(data.error || 'Failed to get recommendations');
            }

        } catch (error) {
            console.error('❌ API request failed:', error);
            throw error;
        }
    }

    parseRecommendationResponse(data) {
        // Return just the AI-generated response without mock data
        return {
            query: data.query,
            aiResponse: data.recommendation
        };
    }

    showLoading() {
        this.hideAllSections();
        this.loadingSection.classList.remove('hidden');
    }

    showResults(data) {
        this.hideAllSections();
        this.resultsSection.classList.remove('hidden');

        // Clear previous results
        this.recommendationsContainer.innerHTML = '';

        // Add query summary
        const querySummary = document.createElement('div');
        querySummary.className = 'query-summary';
        querySummary.innerHTML = `
            <h3 class="query-title neon-text">Your Query</h3>
            <p class="query-text">"${data.query}"</p>
        `;
        this.recommendationsContainer.appendChild(querySummary);

            // Add AI Response with Markdown rendering
        if (data.aiResponse) {
            const aiResponseCard = document.createElement('div');
            aiResponseCard.className = 'ai-response-card';
            const formattedResponse = this.renderMarkdown(data.aiResponse);
            aiResponseCard.innerHTML = `
                <h3 class="ai-response-title neon-text">AI Recommendation</h3>
                <div class="ai-response-text">${formattedResponse}</div>
            `;
            this.recommendationsContainer.appendChild(aiResponseCard);
        }

        // No longer showing individual album cards with mock scores
        // The AI response now contains the full recommendation
    }

    // Simple Markdown renderer for AI responses
    renderMarkdown(text) {
        if (!text) return '';

        return text
            // Bold text **text**
            .replace(/\*\*(.*?)\*\*/g, '<strong class="markdown-bold">$1</strong>')
            // Italic text *text*
            .replace(/\*(.*?)\*/g, '<em class="markdown-italic">$1</em>')
            // Line breaks
            .replace(/\n/g, '<br>')
            // Paragraphs (double line breaks)
            .replace(/(<br>\s*<br>)/g, '</p><p>')
            // Wrap in paragraph if not already wrapped
            .replace(/^(.+)$/, '<p>$1</p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '');
    }

    showError(message) {
        this.hideAllSections();
        this.errorSection.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = message;
    }

    hideAllSections() {
        this.loadingSection.classList.add('hidden');
        this.resultsSection.classList.add('hidden');
        this.errorSection.classList.add('hidden');
    }

    createFloatingParticles() {
        const container = document.body;

        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: ${this.getRandomLightBlueColor()};
                border-radius: 50%;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                animation: particleFloat ${Math.random() * 10 + 10}s infinite ease-in-out;
                opacity: ${Math.random() * 0.3 + 0.05};
                pointer-events: none;
                z-index: 1;
            `;

            container.appendChild(particle);
        }
    }

    getRandomLightBlueColor() {
        const colors = ['#4a90e2', '#87ceeb', '#b0e0e6', '#add8e6', '#b0e0e6', '#e0f6ff', '#1e90ff', '#00bfff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AlbumAtlas();
});

// Global function for retry button
function resetForm() {
    document.getElementById('recommendationForm').reset();
    document.getElementById('errorSection').classList.add('hidden');
    document.getElementById('inputSection').classList.remove('hidden');
}
