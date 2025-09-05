# SIS Connector

A minimal VS Code extension to connect to the Super Intelligence API.

Commands:
- SIS: Connect — connects to ws://<base>/ws (base defaults to http://localhost:8000)
- SIS: Nudge — sends a nudge to /cognition/nudge; uses WS if connected

Settings:
- sis.baseUrl (string): default http://localhost:8000

Development
- Install dependencies and compile:
  - npm install
  - npm run compile
- Press F5 in VS Code to launch the Extension Development Host.