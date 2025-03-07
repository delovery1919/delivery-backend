
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { calculateDistance, isValidLocation } = require('./utils/utils');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_CLUSTER;

console.log(MONGO_URI);
mongoose.connect(MONGO_URI, {
    appName: process.env.APP_NAME,
    user: process.env.MONGO_USER,
    pass: process.env.MONGO_PASSWORD
})

    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.error('MongoDB Connection Error:', err));

// schema
const AttendanceSchema = new mongoose.Schema({
    partnerId: mongoose.Schema.Types.ObjectId,
    locationId: mongoose.Schema.Types.ObjectId,
    checkInTime: Date,
    checkOutTime: Date,
    route: [{ latitude: Number, longitude: Number }],
    distanceCovered: { type: Number, default: 0 }, // in meters
    createdAt: { type: Date, default: Date.now },


}, {
    timestamps: {
        updatedAt: true,
    }
});
const Attendance = mongoose.model('Attendance', AttendanceSchema);


const LatLong = new mongoose.Schema({
    latitude: Number,
    longitude: Number,
})

const LocationSchema = new mongoose.Schema({
    name: String,
    latitude: Number,
    longitude: Number,
    radius: Number,
    boundary: { type: [LatLong], default: [] },// in meters
    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false, }
}, { timestamps: { updatedAt: true, } });



const Location = mongoose.model('Location', LocationSchema);


const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    state: String,
    city: String,
    deleted: { type: Boolean, default: false },
    isLead: { type: Boolean, default: false },

    locationId: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
}, { timestamps: { updatedAt: true } });
const User = mongoose.model('users', UserSchema);

// end




app.post('/user/create', async (req, res) => {
    try {
        const alreadyExist = await User.findOne({ email: req.body.email, phone: req.body.phone });

        if (alreadyExist) {
            res.status(400).json({ message: "already exists" });
        } else {
            const partner = new User(req.body);
            await partner.save();
            res.status(200).json(partner);
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


// get user by id
app.get('/user/:id', async (req, res) => {
    try {
        const alreadyExist = await User.findById(req.params.id);

        if (alreadyExist) {
            res.status(200).json(alreadyExist);
        } else {
            const partner = new User(req.body);
            await partner.save();
            res.status(400).json({ message: "User not found" });
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// get user by location
app.get('/users/:location_id', async (req, res) => {
    try {
        const users = await User.find({ locationId: req.params.location_id });
        res.status(200).json(users);


    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/locations/create', async (req, res) => {
    try {
        const alreadyExists = await Location.findOne({ latitude: req.body.latitude, longitude: req.body.longitude, name: req.body.name, })

        if (alreadyExists) {
            res.status(201).json(alreadyExists);
        } else {
            const location = new Location(req.body);
            await location.save();
            res.status(201).json(location);
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.get('/locations/all', async (req, res) => {
    try {
        const locations = await Location.find();

        res.status(201).json(locations);



    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});



app.post('/attendance/checkin', async (req, res) => {
    try {
        const { partnerId, locationId } = req.body;

        const locationExists = await Location.findById(locationId);
        const partnerExists = await User.findById(partnerId);

        if (locationExists && partnerExists) {
            const attendance = new Attendance({
                partnerId,
                locationId,
                checkInTime: new Date(),
                route: [],
            });
            await attendance.save();
            res.status(201).json(attendance.toJSON());
        } else {
            res.status(400).json({
                message: "failed to check in"
            });
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.post('/attendance/track', async (req, res) => {
    try {
        const { attendanceId, location } = req.body; // location = { latitude, longitude }
        const attendance = await Attendance.findById(attendanceId);
        if (!attendance || attendance.checkOutTime) {
            return res.status(404).json({ error: 'Active attendance record not found' });
        }

        const previousLocation = attendance.route.length > 0 ? attendance.route[attendance.route.length - 1] : null;
        if (previousLocation) {
            if (isValidLocation(previousLocation.latitude, previousLocation.longitude) &&
                isValidLocation(location.latitude, location.longitude)) {
                const distance = calculateDistance(
                    previousLocation.latitude, previousLocation.longitude,
                    location.latitude, location.longitude,
                );
                attendance.distanceCovered += distance;
                console.log('Distance:', distance);
            } else {
                console.log('Invalid location data');
            }


        }

        attendance.route.push(location);
        await attendance.save();
        res.status(200).json({ distanceCovered: attendance.distanceCovered });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});




app.post('/attendance/checkout', async (req, res) => {
    try {
        const { attendanceId } = req.body;
        const attendance = await Attendance.findById(attendanceId);
        if (!attendance || attendance.checkOutTime) {
            return res.status(404).json({ error: 'Active attendance record not found' });
        }

        attendance.checkOutTime = new Date();
        await attendance.save();
        res.status(200).json({ distanceCovered: attendance.distanceCovered });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});



app.get('/reports', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filter = {};
        if (startDate && endDate) {
            filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        const reports = await Attendance.find(filter).populate('partnerId locationId');
        res.status(200).json(reports);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
