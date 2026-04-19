const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');

const User = require('./models/User');
const Task = require('./models/Task');

const app = express();

// middleware
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: false
}));

// view engine
app.set('view engine', 'ejs');

// DB connect


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB connected"))
.catch(err => console.log(err));

// ---------- DEBUG ROUTE ----------
app.get('/me', (req, res) => {
    res.send(req.session.userId || "Not logged in");
});

// ---------- AUTH ROUTES ----------

// signup
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: hashedPassword,
    phone: req.body.phone   // ✅ ADD THIS
    });

    await user.save();
    res.redirect('/login');
});

// login
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return res.send("User not found ❌");
    }

    const valid = await bcrypt.compare(req.body.password, user.password);

    if (!valid) {
        return res.send("Wrong password ❌");
    }

    req.session.userId = user._id;

    res.redirect('/tasks');
});

// ---------- TASK ROUTES ----------

// show form
app.get('/tasks/new', (req, res) => {
    res.render('new');
});

// create task
app.post('/tasks', async (req, res) => {
    if (!req.session.userId) {
        return res.send("Please login first ❌");
    }

    const task = new Task({
        ...req.body,
        requester: req.session.userId
    });

    await task.save();
    res.redirect('/tasks');
});

// show all tasks (WITH populate)
app.get('/tasks', async (req, res) => {
    const tasks = await Task.find()
        .populate('requester')
        .populate('tasker');

    res.render('index', { 
        tasks,
        userId: req.session.userId
    });
});

// claim task
app.post('/tasks/:id/claim', async (req, res) => {
    if (!req.session.userId) {
        return res.send("Please login first ❌");
    }

    const task = await Task.findById(req.params.id);

    if (!task) return res.send("Task not found ❌");

    if (task.requester?.toString() === req.session.userId) {
        return res.send("You cannot claim your own task ❌");
    }

    if (task.status !== 'Open') {
        return res.send("Already claimed ❌");
    }

    task.status = 'Claimed';
    task.tasker = req.session.userId;

    await task.save();

    res.redirect('/tasks');
});

// complete task
app.post('/tasks/:id/complete', async (req, res) => {
    if (!req.session.userId) {
        return res.send("Please login first ❌");
    }

    const task = await Task.findById(req.params.id);

    if (!task) return res.send("Task not found");

    if (!task.tasker) {
        return res.send("Task not claimed yet ❌");
    }

    if (task.tasker.toString() !== req.session.userId) {
        return res.send("Not authorized ❌");
    }

    task.status = 'Completed';
    await task.save();

    res.redirect('/tasks');
});

// ---------- MY TASKS (dashboard) ----------

app.get('/mytasks', async (req, res) => {
    if (!req.session.userId) {
        return res.send("Please login first ❌");
    }

    const created = await Task.find({ requester: req.session.userId });
    const accepted = await Task.find({ tasker: req.session.userId });

    res.render('mytasks', { created, accepted });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// ---------- START SERVER ----------
app.listen(3000, () => {
    console.log("Server running on 3000");
});

