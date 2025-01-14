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

class ContactForm {
    constructor(formId) {
        this.form = document.getElementById(formId);
        this.validator = new FormValidator(this.form);
        this.rateLimiter = new RateLimiter(5, 60000); // 5 requests per minute
        this.setupForm();
    }

    setupForm() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.rateLimiter.checkLimit()) {
                this.showFeedback('Please wait before submitting again.', true);
                return;
            }

            const validation = this.validator.validateForm();
            if (!validation.isValid) {
                this.showFeedback(validation.errors.join('. '), true);
                return;
            }

            const submitButton = this.form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            try {
                const formData = new FormData(this.form);
                const queryString = new URLSearchParams(formData).toString();
                
                // Create a temporary form
                const tempForm = document.createElement('form');
                tempForm.method = 'POST';
                tempForm.action = GOOGLE_SCRIPT_URL;
                tempForm.target = '_blank'; // This prevents page reload
                
                // Add hidden fields
                for (let [key, value] of formData.entries()) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = value;
                    tempForm.appendChild(input);
                }
                
                // Add the form to the document and submit it
                document.body.appendChild(tempForm);
                tempForm.submit();
                document.body.removeChild(tempForm);
                
                this.showFeedback('Message sent successfully!', false);
                this.form.reset();
                
            } catch (error) {
                console.error('Form submission error:', error);
                this.showFeedback('Error sending message. Please try again.', true);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Message';
            }
        });
    }

    showFeedback(message, isError) {
        let feedbackEl = this.form.querySelector('.form-feedback');
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.className = 'form-feedback';
            this.form.insertAdjacentElement('beforeend', feedbackEl);
        }
        
        feedbackEl.textContent = message;
        feedbackEl.className = `form-feedback ${isError ? 'error' : 'success'}`;
        feedbackEl.style.display = 'block';
        
        setTimeout(() => {
            feedbackEl.style.display = 'none';
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ContactForm('contactForm');
});
