class FormValidator {
    constructor(form) {
        this.form = form;
        this.emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    }

    validateEmail(email) {
        return this.emailRegex.test(email);
    }

    validateForm() {
        const name = this.form.querySelector('#name').value.trim();
        const email = this.form.querySelector('#email').value.trim();
        const subject = this.form.querySelector('#subject').value.trim();
        const message = this.form.querySelector('#message').value.trim();
        const errors = [];

        if (name.length < 2) errors.push('Name must be at least 2 characters long');
        if (!this.validateEmail(email)) errors.push('Please enter a valid email address');
        if (subject.length < 2) errors.push('Subject must be at least 2 characters long');
        if (message.length < 10) errors.push('Message must be at least 10 characters long');

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.requests = [];
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
    }

    checkLimit() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }
}

function showFeedback(message, isError) {
    let feedbackEl = document.querySelector('.form-feedback');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.className = 'form-feedback';
        document.querySelector('.contact-form').insertAdjacentElement('beforeend', feedbackEl);
    }
    
    feedbackEl.textContent = message;
    feedbackEl.className = `form-feedback ${isError ? 'error' : 'success'}`;
    feedbackEl.style.display = 'block';
    
    setTimeout(() => {
        feedbackEl.style.display = 'none';
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    
    // Debug logging for script URL
    console.log('Loaded contact form script. URL:', window.GOOGLE_SCRIPT_URL);
    
    if (!window.GOOGLE_SCRIPT_URL) {
        showFeedback('Configuration error: Missing script URL', true);
        console.error('Google Script URL not configured');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        try {
            // Log form data for debugging
            const formData = new FormData(form);
            const params = new URLSearchParams(formData);
            console.log('Submitting form data:', Object.fromEntries(params));
            
            // Generate callback name
            const callbackName = 'formCallback_' + Date.now();
            console.log('Generated callback name:', callbackName);
            
            // Create promise to handle JSONP response
            const responsePromise = new Promise((resolve, reject) => {
                // Set timeout to handle no response
                const timeout = setTimeout(() => {
                    delete window[callbackName];
                    reject(new Error('Request timed out'));
                }, 10000); // 10 second timeout
                
                // Create callback function
                window[callbackName] = function(response) {
                    clearTimeout(timeout);
                    console.log('Received response:', response);
                    resolve(response);
                };
            });
            
            // Add callback parameter
            params.append('callback', callbackName);
            
            // Create and append script
            const script = document.createElement('script');
            const url = `${window.GOOGLE_SCRIPT_URL}?${params.toString()}`;
            console.log('Making request to:', url);
            
            script.src = url;
            
            script.onerror = (error) => {
                console.error('Script loading error:', error);
                showFeedback('Error connecting to server. Please check console for details.', true);
                delete window[callbackName];
            };
            
            document.body.appendChild(script);
            
            // Wait for response
            const response = await responsePromise;
            
            if (response.status === 'success') {
                showFeedback('Message sent successfully!', false);
                form.reset();
            } else {
                throw new Error(response.message || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            showFeedback(error.message || 'Error sending message. Please try again.', true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
        }
    });
});

function showFeedback(message, isError) {
    console.log(`Showing feedback: ${message} (error: ${isError})`);
    let feedbackEl = document.querySelector('.form-feedback');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.className = 'form-feedback';
        document.querySelector('.contact-form').insertAdjacentElement('beforeend', feedbackEl);
    }
    
    feedbackEl.textContent = message;
    feedbackEl.className = `form-feedback ${isError ? 'error' : 'success'}`;
    feedbackEl.style.display = 'block';
    
    setTimeout(() => {
        feedbackEl.style.display = 'none';
    }, 5000);
}
