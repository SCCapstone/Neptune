const request = require('supertest');
const { app, httpServer } = require("../src/Classes/ExpressApp.js");

test("heart beat exists", async () => {
	const response = await request(app).get('/heartbeat');
	expect(response.statusCode).toBe(200);
	expect(response.text).toBe("ok");
});

test("main landing page", async () => {
	const response = await request(app).get('/');
	expect(response.statusCode).toBe(200);
});