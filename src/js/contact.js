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
    
    // Validate Google Script URL
    if (!window.GOOGLE_SCRIPT_URL || window.GOOGLE_SCRIPT_URL.includes('{{')) {
        console.error('Invalid Google Script URL configuration');
        showFeedback('Form is misconfigured. Please contact administrator.', true);
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const validation = validator.validateForm();
        if (!validation.isValid) {
            showFeedback(validation.errors.join(', '), true);
            return;
        }

        if (!rateLimiter.checkLimit()) {
            showFeedback('Too many requests. Please try again later.', true);
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            const formData = new FormData(form);
            const params = new URLSearchParams(formData);
            
            // Generate callback name
            const callbackName = 'formCallback_' + Date.now();
            
            // Create promise to handle JSONP response
            const responsePromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    delete window[callbackName];
                    reject(new Error('Request timed out'));
                }, 10000);
                
                window[callbackName] = function(response) {
                    clearTimeout(timeout);
                    resolve(response);
                };
            });
            
            params.append('callback', callbackName);
            
            // Create and append script
            const script = document.createElement('script');
            const url = new URL(window.GOOGLE_SCRIPT_URL);
            url.search = params.toString();
            
            console.log('Submitting to:', url.toString());
            script.src = url.toString();
            
            script.onerror = (error) => {
                console.error('Script loading error:', error);
                throw new Error('Failed to connect to server');
            };
            
            document.body.appendChild(script);
            
            const response = await responsePromise;
            
            if (response.status === 'success') {
                showFeedback('Message sent successfully!', false);
                form.reset();
            } else {
                throw new Error(response.message || 'Server returned an error');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            showFeedback(error.message || 'Error sending message. Please try again.', true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            
            // Clean up any leftover scripts
            const scripts = document.querySelectorAll('script[src*="' + window.GOOGLE_SCRIPT_URL + '"]');
            scripts.forEach(script => script.remove());
        }
    });
});