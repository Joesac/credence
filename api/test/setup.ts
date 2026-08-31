// Vitest global setup — satisfies env vars required by module imports.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.API_KEY = 'test-api-key';
process.env.ONESIGNAL_APP_ID = 'test-app-id';
process.env.ONESIGNAL_REST_API_KEY = 'test-rest-key';
