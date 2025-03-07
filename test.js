const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./app'); // Assuming your main file is named app.js
require('dotenv').config();

beforeAll(async () => {
    // Connect to the MongoDB test database
    const MONGO_URI = process.env.TEST_MONGO_URI;
    await mongoose.connect(MONGO_URI, {
        appName: process.env.APP_NAME,
        user: process.env.MONGO_USER,
        pass: process.env.MONGO_PASSWORD
    });
});

afterAll(async () => {
    // Close the database connection
    await mongoose.connection.close();
});

describe('API Tests', () => {
    let partnerId, locationId, attendanceId;

    test('Add a delivery partner', async () => {
        const response = await request(app)
            .post('/partners')
            .send({
                name: 'John Doe',
                email: 'johndoe@example.com',
                phone: '1234567890',
                locationId: '605d1b2f9f1b2c3d4e5f6789', // Example ID
            });
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        partnerId = response.body._id;
    });

    test('Add a location', async () => {
        const response = await request(app)
            .post('/locations')
            .send({
                name: 'Office Location',
                latitude: 37.7749,
                longitude: -122.4194,
                radius: 100,
            });
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        locationId = response.body._id;
    });

    test('Check in a delivery partner', async () => {
        const response = await request(app)
            .post('/attendance/checkin')
            .send({
                partnerId,
                locationId,
            });
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        attendanceId = response.body._id;
    });

    test('Track a delivery partner', async () => {
        const response = await request(app)
            .post('/attendance/track')
            .send({
                attendanceId,
                location: {
                    latitude: 37.775,
                    longitude: -122.418,
                },
            });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('distanceCovered');
    });

    test('Check out a delivery partner', async () => {
        const response = await request(app)
            .post('/attendance/checkout')
            .send({
                attendanceId,
            });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('distanceCovered');
    });

    test('Fetch reports', async () => {
        const response = await request(app)
            .get('/reports')
            .query({
                startDate: '2023-01-01',
                endDate: '2023-12-31',
            });
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
