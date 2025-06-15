const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User schema and model
const userSchema = new mongoose.Schema({
  username: String
});
const User = mongoose.model("User", userSchema);

// Exercise schema and model
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  description: String,
  duration: Number,
  date: Date
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create new user
app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: "Username is required" });

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, 'username _id'); // Only username and _id
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Add exercises
app.post("/api/users/:id/exercises", async (req, res) => {
  const userId = req.params.id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: "Description and duration are required" });
  }

  try {
    const userDoc = await User.findById(userId);
    if (!userDoc) return res.status(400).json({ error: "User not found" });

    const exerciseDate = date ? new Date(date) : new Date();

    const newExercise = new Exercise({
      userId: userDoc._id,
      username: userDoc.username,
      description,
      duration: Number(duration),
      date: exerciseDate
    });

    const savedExercise = await newExercise.save();

    res.json({
      _id: userDoc._id,
      username: userDoc.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get exercise logs with optional filters
app.get("/api/users/:id/logs", async (req, res) => {
  const userId = req.params.id;
  const { from, to, limit } = req.query;

  try {
    const userDoc = await User.findById(userId);
    if (!userDoc) return res.status(400).json({ error: "User not found" });

    let filter = { userId: userId };

    if (from) {
      const fromDate = new Date(from);
      if (!filter.date) filter.date = {};
      filter.date.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (!filter.date) filter.date = {};
      filter.date.$lte = toDate;
    }

    let query = Exercise.find(filter).select('description duration date -_id');

    if (limit) {
      query = query.limit(Number(limit));
    }

    const exercises = await query.exec();

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      _id: userDoc._id,
      username: userDoc.username,
      count: log.length,
      log
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
