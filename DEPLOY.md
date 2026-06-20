# SkyCast AI — Deployment Guide

## Project Structure

```
skycast/
├── public/
│   └── index.html              ← Frontend (no API keys inside)
├── netlify/
│   └── functions/
│       ├── weather.js          ← Secure OWM proxy
│       └── ai-activities.js    ← Secure Claude proxy
├── netlify.toml                ← Netlify routing + security headers
├── .env.example                ← Template for your keys
├── .gitignore                  ← Prevents .env from being committed
└── DEPLOY.md                   ← This file
```

---

## Step 1 — Get Your API Keys

### OpenWeatherMap (Free)
1. Go to https://openweathermap.org → Sign Up
2. Dashboard → **API Keys** → copy the default key
3. Wait up to 10 minutes for the key to activate

### Anthropic (Claude AI)
1. Go to https://console.anthropic.com → Sign In
2. **API Keys** → **Create Key** → copy it
3. Set a monthly spend limit under **Billing** (e.g. $5) for safety

---

## Step 2 — Deploy to Netlify

### Option A — Drag & Drop (Fastest, no Git needed)

1. Zip the entire `skycast/` folder
2. Go to https://app.netlify.com → **Add new site** → **Deploy manually**
3. Drag the zip onto the page
4. Your site is live at a random URL like `skycast-abc123.netlify.app`

### Option B — GitHub (Recommended for updates)

```bash
# In your terminal, inside the skycast/ folder:
git init
git add .
git commit -m "Initial deploy"
git branch -M main

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/skycast.git
git push -u origin main
```

Then in Netlify:
1. **Add new site** → **Import from Git** → Connect GitHub
2. Select your repo
3. Build settings are auto-detected from `netlify.toml`
4. Click **Deploy site**

---

## Step 3 — Add Environment Variables (CRITICAL)

Your API keys must be added in Netlify — **never in the code**.

1. Go to your site in Netlify dashboard
2. **Site Configuration** → **Environment Variables** → **Add a variable**

Add these two:

| Key                  | Value                        |
|----------------------|------------------------------|
| `OWM_API_KEY`        | your OpenWeatherMap key      |
| `ANTHROPIC_API_KEY`  | your Anthropic sk-ant-... key |

3. Click **Save**
4. Go to **Deploys** → **Trigger deploy** → **Deploy site**

The site will redeploy with the keys available to the serverless functions — but never visible in the browser.

---

## Step 4 — Test It

1. Open your Netlify URL
2. Click **📍 My Location** — allow location access
3. Weather should load in ~1 second
4. AI activity suggestions should appear in ~3 seconds

If you see errors, check **Netlify → Functions → Logs** to debug.

---

## Step 5 — (Optional) Custom Domain

1. Netlify dashboard → **Domain Management** → **Add custom domain**
2. Enter your domain (e.g. `skycast.com`)
3. Update your domain's DNS nameservers to Netlify's
4. HTTPS is provisioned automatically (free)

---

## Security Notes

- ✅ API keys live only in Netlify environment variables
- ✅ Serverless functions run on the server — keys never reach the browser
- ✅ CORS headers restrict who can call the functions
- ✅ Security headers (X-Frame-Options, etc.) set in netlify.toml
- ✅ `.gitignore` prevents any `.env` file from being committed

---

## Local Development

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Create your local .env file
cp .env.example .env
# Edit .env and add your real keys

# Run locally (functions + frontend together)
netlify dev
# Opens at http://localhost:8888
```
