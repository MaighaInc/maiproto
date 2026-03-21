Serve frontend on port 3000

Option A: Using http-server (if installed globally):

cd frontend
http-server -p 3000

Option B: Using npx serve (no global install):

cd frontend
npx serve -l 3000
Open browser → http://localhost:3000
Click Fetch Data from Backend → should see { message: "Hello from Node.js backend!" }

✅ This confirms CORS is working across two different ports.

4️⃣ Quick Tips
Backend on port 5000, frontend on port 3000 → simulates cross-origin requests.
In production, you can set CORS for specific origins only:
app.use(cors({ origin: 'https://myfrontend.com' }));
All requests from other origins will be blocked by the browser.