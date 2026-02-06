.PHONY: dev backend ws mobile

dev: backend ws mobile

backend:
	@echo "Starting backend on http://localhost:5000"
	@cd backend && python app.py &

ws:
	@echo "Starting WS server on ws://localhost:5050"
	@cd backend/ws-server && npm install && npm start &

mobile:
	@echo "Starting Expo app"
	@cd mobile && npm install && npx expo start
