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
    
    console.log(`Form feedback: ${message} (${isError ? 'error' : 'success'})`);
    
    setTimeout(() => {
        feedbackEl.style.display = 'none';
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    // Remove config import and directly set the form action
    form.action = window.GOOGLE_SCRIPT_URL || '';
    
    if (!form.action) {
        console.error('Google Script URL not configured');
        return;
    }

    const validator = new FormValidator(form);
    const rateLimiter = new RateLimiter(3, 60000);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const validationResult = validator.validateForm();
        if (!validationResult.isValid) {
            showFeedback(validationResult.errors.join(', '), true);
            return;
        }

        if (!rateLimiter.checkLimit()) {
            showFeedback('Please wait before sending another message', true);
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            const formData = new FormData(form);
            const urlEncodedData = new URLSearchParams(formData).toString();

            console.log('Sending data:', Object.fromEntries(formData));

            const response = await fetch(form.action, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            });

            showFeedback('Message sent successfully!', false);
            form.reset();
            
        } catch (error) {
            console.error('Error:', error);
            showFeedback('Error sending message. Please try again.', true);
            
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
        }
    });
});
