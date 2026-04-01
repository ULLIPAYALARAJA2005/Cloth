#!/bin/bash
# =========================================
# Kalyani Fashion Hub - ngrok Tunnel Starter
# =========================================
# 
# FIRST TIME SETUP:
#   1. Go to https://ngrok.com and create a FREE account
#   2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
#   3. Run: ngrok config add-authtoken YOUR_TOKEN_HERE
#   4. Then run this script: bash start-ngrok.sh

echo "🚀 Starting ngrok tunnels for Kalyani Fashion Hub..."
echo ""

# Check if ngrok is configured
if ! ngrok config check &>/dev/null; then
  echo "⚠️  ngrok not configured. Please run:"
  echo "   ngrok config add-authtoken YOUR_TOKEN"
  echo "   (Get your free token at https://dashboard.ngrok.com)"
  exit 1
fi

# Kill any existing ngrok processes
pkill -f ngrok 2>/dev/null
sleep 1

# Start all 3 tunnels in background using ngrok's multi-tunnel
ngrok start --all --config ~/.config/ngrok/ngrok.yml &
NGROK_PID=$!

sleep 3

# Fetch the public URLs from the ngrok API
echo "🌐 Your public URLs:"
echo ""
curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    for t in tunnels:
        name = t.get('name', '')
        url = t.get('public_url', '')
        if 'backend' in name:
            print(f'  ⚙️  Backend API : {url}')
        elif 'user' in name:
            print(f'  🛍️  User Store  : {url}')
        elif 'admin' in name:
            print(f'  🔧 Admin Panel : {url}')
        else:
            print(f'  🔗 {name}: {url}')
except:
    print('  Run: curl http://localhost:4040/api/tunnels to see URLs')
"

echo ""
echo "📱 Open these links on any device, anywhere!"
echo "   Press Ctrl+C to stop ngrok"
echo ""
echo "   💡 Tip: You can also view tunnels at http://localhost:4040"
echo ""

wait $NGROK_PID
