.PHONY: dev backend ws mobile

dev:
	@osascript -e 'tell application "Terminal"' \
		-e 'activate' \
		-e 'do script "cd /Users/mac_dee/Documents/Find-my-nanny/backend && python app.py"' \
		-e 'do script "cd /Users/mac_dee/Documents/Find-my-nanny/backend/ws-server && npm install && npm start" in selected tab of the front window' \
		-e 'do script "cd /Users/mac_dee/Documents/Find-my-nanny/mobile && npm install && npx expo start" in selected tab of the front window' \
		-e 'end tell'

backend:
	@cd backend && python app.py

ws:
	@cd backend/ws-server && npm install && npm start

mobile:
	@cd mobile && npm install && npx expo start
