## Running Locally in Codespaces

### Prerequisites
- GitHub Codespaces environment (already set up in this workspace)
- Live Server extension (install if not already available)

### Quick Start

1. **Install Live Server Extension** (if needed):
   - Open Extensions panel (`Ctrl+Shift+X`)
   - Search for "Live Server" by Ritwick Dey
   - Click "Install"

2. **Start the Development Server**:
   - Navigate to `frontend/src/index.html` in the Explorer
   - Right-click on `index.html`
   - Select "Open with Live Server"
   
   *Alternative: Open `index.html` and click "Go Live" in the status bar*

3. **View Your Portfolio**:
   - The site will automatically open in a new browser tab
   - URL will be something like: `http://127.0.0.1:5500/frontend/src/index.html`
   - Live reload is enabled - changes save automatically refresh the browser

   **If you need to open the site manually in the host's default browser:**
   ```
   $BROWSER http://127.0.0.1:5500/frontend/src/index.html
   ```