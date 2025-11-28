# Deployment Guide for Render.com

This guide will help you deploy the Il Mio Cioccolato application to Render.

## Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **MongoDB Atlas** - Already configured
4. **Cloudinary Account** - Already configured

## Option 1: Deploy Using render.yaml (Recommended)

This method deploys both backend and admin panel automatically.

### Steps:

1. **Push to GitHub**
   ```bash
   git push -u origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository: `ilmiocioccolatoapp/ilmio`
   - Render will automatically detect `render.yaml`

3. **Set Environment Variables**
   
   For **ilmio-backend** service, add:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<dbname>
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   NODE_ENV=production
   ```
   
   ⚠️ **Important:** Replace placeholders with your actual credentials from:
   - MongoDB Atlas Dashboard → Database → Connect
   - Cloudinary Console → Account Details

   For **ilmio-admin** service, add:
   ```
   REACT_APP_API_URL=https://ilmio-backend.onrender.com/api
   ```
   *(Replace with your actual backend URL after deployment)*

4. **Deploy**
   - Click "Apply" to start deployment
   - Wait for both services to build and deploy

## Option 2: Manual Deployment

### Deploy Backend API

1. **Create New Web Service**
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `ilmio-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free

2. **Add Environment Variables**
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=<dbname>
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
   
   Get your credentials from:
   - MongoDB Atlas: Database → Connect → Connect your application
   - Cloudinary: Console → Account Details

3. **Deploy**
   - Click "Create Web Service"
   - Note the URL: `https://ilmio-backend.onrender.com`

### Deploy Admin Panel

1. **Create New Static Site**
   - Click "New" → "Static Site"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `ilmio-admin`
     - **Root Directory**: `admin`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `build`
     - **Plan**: Free

2. **Add Environment Variable**
   ```
   REACT_APP_API_URL=https://ilmio-backend.onrender.com/api
   ```
   *(Use your actual backend URL)*

3. **Deploy**
   - Click "Create Static Site"
   - Note the URL: `https://ilmio-admin.onrender.com`

## Post-Deployment Steps

### 1. Update MongoDB Atlas Whitelist
- Go to MongoDB Atlas
- Navigate to Network Access
- Add Render's IP: `0.0.0.0/0` (allow from anywhere)
  - Or add specific Render IPs from their documentation

### 2. Update Mobile App
Update the API URL in `/mobile/lib/utils/constants.dart`:
```dart
static const String baseUrl = 'https://ilmio-backend.onrender.com/api';
```

### 3. Test the Deployment

1. **Test Backend API**
   ```bash
   curl https://ilmio-backend.onrender.com/api/products/available
   ```

2. **Test Admin Panel**
   - Visit: `https://ilmio-admin.onrender.com`
   - Try logging in and managing products

## Important Notes

### Free Tier Limitations
- **Backend**: Service spins down after 15 minutes of inactivity
  - First request after sleep takes ~30 seconds
  - Consider upgrading to paid plan for production

- **Static Site**: Always active, no sleep

### Security Best Practices

✅ **DO:**
- Use environment variables for all secrets
- Keep `.env` files in `.gitignore`
- Regularly rotate API keys and passwords
- Use HTTPS only (Render provides free SSL)

❌ **DON'T:**
- Commit `.env` files to Git
- Hardcode secrets in code
- Share MongoDB or Cloudinary credentials publicly

### CORS Configuration
The backend is configured to accept requests from any origin (`origin: '*'`). For production, consider restricting to your admin panel URL:

```javascript
app.use(cors({
  origin: ['https://ilmio-admin.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Troubleshooting

### Backend Won't Start
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check Render logs: Dashboard → Service → Logs

### Admin Panel Can't Connect to Backend
- Verify `REACT_APP_API_URL` is correct
- Check backend is running
- Inspect browser console for CORS errors

### Images Not Uploading
- Verify Cloudinary credentials
- Check file size (limit: 10MB)
- Review backend logs

## Monitoring

- **Render Dashboard**: View logs, metrics, and deployment history
- **MongoDB Atlas**: Monitor database usage
- **Cloudinary**: Track image storage and bandwidth

## Auto-Deploy

Render automatically deploys when you push to the `main` branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Both services will rebuild and redeploy automatically.

## Cost Estimate

**Free Tier (Current Setup):**
- Backend: Free (with sleep after 15min inactivity)
- Admin Panel: Free
- **Total: $0/month**

**Recommended for Production:**
- Backend: Starter ($7/month) - No sleep, always active
- Admin Panel: Free
- **Total: $7/month**

## Support

- Render Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com
