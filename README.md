# Stump Pros WV — Social Media Command Center

AI-powered social media content generator and scheduler for Stump Pros WV.

## What This Does
- Generates a full week of social media posts (Facebook, Instagram, Google Business Profile)
- AI writes in your voice using content pillars and anti-pattern rules
- Research tab analyzes your page, competitors, and industry trends
- Media library connects to Google Drive for your photo/video library
- Auto-tags photos using AI vision
- One-click push to Buffer for scheduled posting

## Deployment (Step by Step)

### 1. Get an Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to "API Keys" and create a new key
4. Copy it — you'll need it in step 4

### 2. Push to GitHub
1. Go to https://github.com and create a new repository called `stump-pros-social`
2. On your computer, open a terminal in this folder and run:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stump-pros-social.git
git push -u origin main
```

### 3. Deploy on Vercel (Free)
1. Go to https://vercel.com and sign up with your GitHub account
2. Click "Add New Project"
3. Import your `stump-pros-social` repository
4. Click "Deploy" — it will build and deploy automatically

### 4. Add Your API Key
1. In Vercel, go to your project → "Settings" → "Environment Variables"
2. Add: `ANTHROPIC_API_KEY` = your key from step 1
3. Click "Save"
4. Go to "Deployments" → click the three dots on the latest → "Redeploy"

### 5. You're Live!
Your app is now at `https://stump-pros-social.vercel.app` (or similar URL).

## Setting Up Inside the App

### Buffer (for posting)
1. Sign up at https://buffer.com (free plan = 3 channels)
2. Connect your Facebook Page, Instagram Business, and Google Business Profile
3. Go to Buffer → Settings → API → copy your access token
4. Paste it in the ⚙ Settings panel in the app

### Google Drive (for photos)
1. Go to https://console.cloud.google.com
2. Create a new project
3. Go to "APIs & Services" → "Library" → search "Google Drive API" → Enable
4. Go to "Credentials" → "Create Credentials" → "API Key" → copy it
5. In Google Drive, create a folder for your stump photos
6. Right-click the folder → "Share" → "Anyone with the link" → Viewer
7. Copy the folder ID from the URL (the long string after /folders/)
8. In the app, go to 📸 Media → "Connect Drive" → paste both values

## Monthly Cost
- Vercel hosting: **Free**
- Anthropic API: **~$1-5/mo** (depends on usage)
- Google Drive: **Free** (15GB) or $3-10/mo for more storage
- Buffer: **Free** (3 channels) or $6/mo for Essentials

## Files
```
stump-pros-social/
├── package.json          # Dependencies
├── vite.config.js        # Build config
├── vercel.json           # Deployment config
├── index.html            # Entry HTML
├── api/
│   └── claude.js         # Serverless API proxy
├── src/
│   ├── main.jsx          # React entry
│   └── App.jsx           # Main application
└── .env.example          # Environment variable template
```
