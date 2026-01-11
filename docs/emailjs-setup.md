# EmailJS Setup Guide

## Overview

The contact form uses EmailJS to send emails directly from the browser without a backend server. This is a client-side solution that's secure and reliable.

## Setup Steps

### 1. Create EmailJS Account

1. Go to https://www.emailjs.com/
2. Sign up for a free account (100 emails/month free tier)
3. Verify your email address

### 2. Create Email Service

1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail recommended)
4. Connect your email account (nvijayasuhaas@gmail.com)
5. **Save the Service ID** (e.g., `service_xxxxxxx`)

### 3. Create Email Template

1. In EmailJS dashboard, go to **Email Templates**
2. Click **Create New Template**
3. Use this template structure:

**Template Name:** Portfolio Contact Form

**Subject:** New message from portfolio website

**Content:**
```
You have a new message from your portfolio website.

From: {{from_name}}
Email: {{from_email}}

Message:
{{message}}
```

4. **Save the Template ID** (e.g., `template_xxxxxxx`)

### 4. Get Public Key

1. In EmailJS dashboard, go to **Account** → **General**
2. Find your **Public Key** (e.g., `xxxxxxxxxxxxx`)
3. This is safe to use in client-side code

### 5. Update index.html

Replace the placeholder values in `index.html`:

**Line ~237:** Replace `YOUR_PUBLIC_KEY` with your EmailJS public key
```javascript
emailjs.init("YOUR_PUBLIC_KEY");
```

**Line ~250:** Replace `YOUR_SERVICE_ID` with your service ID
```javascript
const serviceID = "YOUR_SERVICE_ID";
```

**Line ~251:** Replace `YOUR_TEMPLATE_ID` with your template ID
```javascript
const templateID = "YOUR_TEMPLATE_ID";
```

## How It Works

1. User fills out the contact form (name, email, message)
2. JavaScript validates the inputs
3. Form submission is prevented (no page reload)
4. EmailJS sends email using your configured service
5. Success/error message is displayed
6. Form resets on success

## Security Notes

- Public key is safe to expose (it's designed for client-side use)
- No passwords are stored in code
- EmailJS handles authentication server-side
- Free tier includes rate limiting

## Testing

1. Fill out the form with test data
2. Submit the form
3. Check your email (nvijayasuhaas@gmail.com)
4. Verify email subject and content

## Troubleshooting

- **Email not received:** Check spam folder, verify service connection
- **Error message:** Check browser console for errors
- **Form not submitting:** Check that all EmailJS IDs are correctly set

