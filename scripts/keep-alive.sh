# Keep backend alive script
# This script pings the backend every 14 minutes to prevent Render free tier from sleeping

BACKEND_URL="https://ilmio-backend.onrender.com"

echo "Starting keep-alive script for $BACKEND_URL"
echo "Press Ctrl+C to stop"

while true; do
  echo "[$(date)] Pinging backend..."
  curl -s "$BACKEND_URL/api/products/available" > /dev/null
  if [ $? -eq 0 ]; then
    echo "[$(date)] ✓ Backend is alive"
  else
    echo "[$(date)] ✗ Backend ping failed"
  fi
  sleep 840  # 14 minutes
done
