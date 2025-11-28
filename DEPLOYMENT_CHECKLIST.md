# 🚀 Render Deployment Checklist

## Pre-Deployment ✓

- [x] `.env` files are in `.gitignore`
- [x] `.env.example` files created for reference
- [x] Sensitive credentials removed from code
- [x] API URL uses environment variables
- [x] `render.yaml` configuration created
- [x] MongoDB Atlas connection configured
- [x] Cloudinary integration ready

## Step 1: Push to GitHub

```bash
cd /Volumes/PERSONAL/ilmio
git add .
git commit -m "Add Render deployment configuration"
git push -u origin main
```

## Step 2: Deploy on Render

### Using Blueprint (Automatic - Recommended)

1. Go to https://dashboard.render.com
2. Click **New** → **Blueprint**
3. Select repository: `ilmiocioccolatoapp/ilmio`
4. Render detects `render.yaml` automatically
5. Click **Apply**

### Set Environment Variables

**Backend Service (ilmio-backend):**
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<dbname>
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=production
```
⚠️ **Use your actual credentials from MongoDB Atlas and Cloudinary dashboards**

**Admin Panel (ilmio-admin):**
```
REACT_APP_API_URL=https://ilmio-backend.onrender.com/api
```
⚠️ Update URL after backend deploys!

## Step 3: Post-Deployment

### Update MongoDB Atlas
- [ ] Go to MongoDB Atlas → Network Access
- [ ] Add IP: `0.0.0.0/0` (allow all)
- [ ] Or add Render IPs from their docs

### Update Mobile App
- [ ] Edit `mobile/lib/utils/constants.dart`
- [ ] Change `baseUrl` to: `https://ilmio-backend.onrender.com/api`
- [ ] Rebuild mobile app

### Test Deployment
- [ ] Test backend: `curl https://ilmio-backend.onrender.com/api/products`
- [ ] Visit admin: `https://ilmio-admin.onrender.com`
- [ ] Create test product
- [ ] Upload test image
- [ ] Check mobile app works

## Step 4: Monitor

- [ ] Check Render logs for errors
- [ ] Monitor MongoDB Atlas usage
- [ ] Track Cloudinary storage

## URLs After Deployment

- Backend API: `https://ilmio-backend.onrender.com`
- Admin Panel: `https://ilmio-admin.onrender.com`
- Mobile App: Update and rebuild

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend timeout | Check MongoDB whitelist |
| Admin can't connect | Verify `REACT_APP_API_URL` |
| Images fail | Check Cloudinary credentials |
| CORS error | Verify backend CORS config |

## Auto-Deploy Enabled ✓

Every push to `main` branch automatically redeploys both services.

```bash
git add .
git commit -m "Your changes"
git push origin main
```

## Notes

- **Free Tier**: Backend sleeps after 15min inactivity
- **First request**: Takes ~30 seconds after sleep
- **Upgrade**: $7/month for always-on backend
- **Keep-Alive**: Run `./scripts/keep-alive.sh` to prevent sleep (optional)
