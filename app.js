require("dotenv").config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');

const User = require('./models/User');
const Task = require('./models/Task');

const app = express();

// ---------- MIDDLEWARE ----------
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: false
}));

// make user available in all views
app.use((req, res, next) => {
    res.locals.currentUser = req.session.userId;
    res.locals.error = req.query.error;
    next();
});

// view engine
app.set('view engine', 'ejs');

// ---------- DB CONNECTION ----------
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB connected"))
    .catch(err => console.log(err));

// ---------- AUTH MIDDLEWARE ----------
function isLoggedIn(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login?error=Login required');
    }
    next();
}

app.get('/', (req, res) => {
    res.redirect('/login');
});

// ---------- HOME ROUTE ----------
app.get('/', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.redirect('/tasks');
});

// ---------- DEBUG ----------
app.get('/me', (req, res) => {
    res.send(req.session.userId || "Not logged in");
});

// ---------- AUTH ROUTES ----------

// signup page
app.get('/signup', (req, res) => {
    res.render('signup');
});

// signup logic
app.post('/signup', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            phone: req.body.phone
        });

        await user.save();
        res.redirect('/login');

    } catch (err) {
        console.log(err);
        res.redirect('/signup');
    }
});

// login page
app.get('/login', (req, res) => {
    res.render('login');
});

// login logic
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) return res.redirect('/login');

        const valid = await bcrypt.compare(req.body.password, user.password);

        if (!valid) return res.redirect('/login');

        req.session.userId = user._id;

        res.redirect('/tasks');

    } catch (err) {
        console.log(err);
        res.redirect('/login');
    }
});

// logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// ---------- TASK ROUTES ----------

// show create form
app.get('/tasks/new', isLoggedIn, (req, res) => {
    res.render('new');
});

// create task
app.post('/tasks', isLoggedIn, async (req, res) => {
    try {
        const task = new Task({
            ...req.body,
            requester: req.session.userId
        });

        await task.save();
        res.redirect('/tasks');

    } catch (err) {
        console.log(err);
        res.redirect('/tasks');
    }
});

// show all tasks
app.get('/tasks', isLoggedIn, async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('requester')
            .populate('tasker');

        res.render('index', {
            tasks,
            userId: req.session.userId
        });

    } catch (err) {
        console.log(err);
        res.redirect('/login');
    }
});

// claim task
app.post('/tasks/:id/claim', isLoggedIn, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return res.redirect('/tasks');

        if (String(task.requester) === String(req.session.userId)) {
            return res.redirect('/tasks?error=You cannot claim your own task');
        }

        if (task.status !== 'Open') {
            return res.redirect('/tasks?error=Task already claimed');
        }

        task.status = 'Claimed';
        task.tasker = req.session.userId;

        await task.save();

        res.redirect('/tasks');

    } catch (err) {
        console.log(err);
        res.redirect('/tasks');
    }
});

// complete task
app.post('/tasks/:id/complete', isLoggedIn, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task || !task.tasker) {
            return res.redirect('/tasks');
        }

        if (String(task.tasker) !== String(req.session.userId)) {
            return res.redirect('/tasks');
        }

        task.status = 'Completed';
        await task.save();

        res.redirect('/tasks');

    } catch (err) {
        console.log(err);
        res.redirect('/tasks');
    }
});

// ---------- MY TASKS ----------
app.get('/mytasks', isLoggedIn, async (req, res) => {
    try {
        const created = await Task.find({ requester: req.session.userId }).populate('requester').populate('tasker');
        const accepted = await Task.find({ tasker: req.session.userId }).populate('requester').populate('tasker');

        res.render('mytasks', { created, accepted, userId: req.session.userId });

    } catch (err) {
        console.log(err);
        res.redirect('/tasks');
    }
});

// ---------- START SERVER ----------
app.listen(3000, () => {
    console.log("Server running on 3000");
});