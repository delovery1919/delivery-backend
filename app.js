
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

// console.log(MONGO_URI);
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
    autoCheckout: { type: Boolean, default: false },
    route: [{ latitude: Number, longitude: Number, isMock: { type: Boolean, default: false, }, isBaseLocation: { type: Boolean, default: false, } }],
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
    loginId: String,
    email: String,
    phone: String,
    state: String,
    city: String,
    pass: String,
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },

    locationId: mongoose.Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
}, { timestamps: { updatedAt: true } });
const User = mongoose.model('users', UserSchema);

// end




app.post('/users/create', async (req, res) => {
    try {

        const isActiveLocation = await Location.findById(req.body.locationId);




        const alreadyExist = await User.findOne({ email: req.body.email, phone: req.body.phone, loginId: req.body.loginId, });

        if (alreadyExist) {
            res.status(400).json({ message: "already exists" });
        } else if (!isActiveLocation) {

            res.status(400).json({ message: "Location not found" });
        } else if (isActiveLocation.isDeleted) {
            res.status(400).json({ message: "Location is deleted" });
        }
        else {


            const partner = new User(req.body);
            await partner.save();
            res.status(200).json(partner);
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.post('/users/login', async (req, res) => {
    try {
        const user = await User.findOne({ loginId: req.body.loginId, pass: req.body.pass, isActive: true, isDeleted: false });

        if (user) {
            res.status(200).json(user);
        } else {

            res.status(400).json({ message: "User not found" });
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// get user by id
app.get('/users/:id', async (req, res) => {
    try {
        const alreadyExist = await User.findById(req.params.id);

        if (alreadyExist) {
            res.status(200).json(alreadyExist);
        } else {

            res.status(400).json({ message: "User not found" });
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// get user by id

app.post('/users/update/:id', async (req, res) => {
    try {
        // Check if the user exists by ID
        const user = await User.findById(req.params.id);

        if (user) {
            // Perform the update operation
            const updatedUser = await User.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true } // This ensures the updated user is returned
            );

            // Send success response
            res.status(200).json({ message: "User updated successfully", user: updatedUser });
        } else {
            // If the user does not exist, return a not found error
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        // If an error occurs, return an error response
        res.status(400).json({ error: error.message });
    }
});


app.get('/users/location/:id', async (req, res) => {
    try {
        // Find users with a specific locationId and isActive set to true
        const users = await User.find({
            locationId: req.params.id,  // Match the locationId
            isActive: true  // Only active users
        });

        // Return the list of users
        res.status(200).json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});



app.get('/users/all/active', async (req, res) => {
    try {
        // Find all active users
        const users = await User.find({ isActive: true });
        // console.log(users);

        // Return the list of active users
        res.status(200).json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


// get all current users
app.get('/users/all/applicant', async (req, res) => {
    try {
        // Find all inactive users (applicants)
        const users = await User.find({ isActive: false });

        // Return the list of applicants (inactive users)
        res.status(200).json(users);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.post('/locations/create', async (req, res) => {
    try {
        const alreadyExists = await Location.findOne({ latitude: req.body.latitude, longitude: req.body.longitude, name: req.body.name, })

        if (alreadyExists) {
            res.status(400).json({ message: "location already exists" });
        } else {
            const location = new Location(req.body);
            await location.save();
            res.status(201).json(location);
        }

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.post('/locations/update/:id', async (req, res) => {
    try {
        // Find the location by its ID
        const location = await Location.findById(req.params.id);

        if (!location) {
            return res.status(404).json({ message: "Location not found" });
        }

        // Check if there is another location with the same latitude, longitude, and name
        // (but different from the current location's id)
        const alreadyExists = await Location.findOne({
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            name: req.body.name,
            _id: { $ne: req.params.id } // Exclude the current location ID
        });

        if (alreadyExists) {
            return res.status(400).json({ message: "Location with the same coordinates and name already exists" });
        }

        // Update the location
        const updatedLocation = await Location.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true } // This ensures the updated document is returned
        );

        // Send success response with updated location
        res.status(200).json({ message: "Location updated successfully", location: updatedLocation });
    } catch (error) {
        // Handle any errors
        res.status(400).json({ error: error.message });
    }
});



app.get('/locations/all', async (req, res) => {
    try {
        const locations = await Location.find();

        res.status(200).json(locations);



    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/locations/user-count', async (req, res) => {
    try {
        // Step 1: Find all locations
        const locations = await Location.find({ isDeleted: false }).lean();

        if (!locations || locations.length === 0) {
            return res.status(404).json({ message: 'No locations found' });
        }

        // Step 2: Loop through each location and get the users associated with it
        const locationUserData = await Promise.all(locations.map(async (location) => {
            // Get all users for this location (active, non-deleted users)
            const usersAtLocation = await User.find({
                locationId: location._id,
                isActive: true,
                isDeleted: false
            }).select('name email');  // Only select name and email for users

            // Return location data with user count and user details
            return {
                locationId: location._id,
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                userCount: usersAtLocation.length,
                users: usersAtLocation
            };
        }));

        // Step 3: Send the response
        res.status(200).json(locationUserData);

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
                // console.log('Distance:', distance);
            } else {
                // console.log('Invalid location data');
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
