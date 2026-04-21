



require("dotenv").config();

console.log("MONGO URI:", process.env.MONGO_URI);

const express = require('express');
const cors = require("cors");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');

const User = require('./models/User');
const Task = require('./models/Task');
const { moderateTask } = require('./middleware/moderator');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- MIDDLEWARE ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



const methodOverride = require('method-override');
app.use(methodOverride('_method'));

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

// ---------- ROOT ----------
app.get('/', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.redirect('/tasks');
});

// ---------- DEBUG ----------
app.get('/me', (req, res) => {
    res.send(req.session.userId || "Not logged in");
});

// ================== AUTH ROUTES ==================

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

// ================== 🔥 API ROUTES ==================

// API LOGIN (for mobile)
app.post('/api/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) return res.status(400).json({ message: "User not found" });

        const valid = await bcrypt.compare(req.body.password, user.password);

        if (!valid) return res.status(400).json({ message: "Wrong password" });

        res.json({
            message: "Login successful",
            userId: user._id,
            username: user.username
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API SIGNUP
app.post('/api/signup', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            phone: req.body.phone
        });

        await user.save();

        res.json({ message: "User created successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API GET TASKS
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('requester')
            .populate('tasker');

        res.json(tasks);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🛡️ API MODERATION CHECK (no DB write — pure decision)
app.post('/api/tasks/moderate', (req, res) => {
    const { title, description } = req.body;
    const result = moderateTask(title, description);
    res.json(result);
});

// API CREATE TASK
app.post('/api/tasks', async (req, res) => {
    try {
        if (!req.body.title) {
            return res.status(400).json({ message: "Title required" });
        }

        // 🛡️ Academic Integrity Check
        const modResult = moderateTask(req.body.title, req.body.description);
        if (modResult.decision === 'BLOCK') {
            return res.status(403).json({
                blocked: true,
                message: "🚫 Task can't be added due to academic integrity concerns.",
                reason: modResult.reason
            });
        }

        const task = new Task({
            ...req.body
        });

        await task.save();

        res.json({ message: "Task created", task });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API CLAIM TASK
app.post('/api/tasks/:id/claim', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        if (task.status !== 'Open') {
            return res.status(400).json({ message: "Already claimed" });
        }

        task.status = 'Claimed';
        task.tasker = req.body.userId;

        await task.save();

        res.json({ message: "Task claimed" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API COMPLETE TASK
app.post('/api/tasks/:id/complete', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found" });

        task.status = 'Completed';

        await task.save();

        res.json({ message: "Task completed" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================== END API ==================

// ================== WEB TASK ROUTES ==================

// show create form
app.get('/tasks/new', isLoggedIn, (req, res) => {
    res.render('new');
});

// create task
app.post('/tasks', isLoggedIn, async (req, res) => {
    try {
        // 🛡️ Content Moderation (profanity + academic integrity)
        const modResult = moderateTask(req.body.title, req.body.description);
        if (modResult.decision === 'BLOCK') {
            const type = modResult.type === 'profanity' ? 'profanity' : '1';
            return res.redirect(`/tasks/new?blocked=${type}`);
        }

        const task = new Task({
            ...req.body,
            requester: req.session.userId
        });

        await task.save();
        res.redirect('/tasks?flash=created');

    } catch (err) {
        console.log(err);
        res.redirect('/tasks?error=Something went wrong. Try again.');
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
            userId: req.session.userId,
            flash: req.query.flash || null,       // 'created'|'claimed'|'completed'|'deleted'
            flashError: req.query.error || null   // error message string
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

        if (task.status === 'Completed') {
            return res.redirect('/tasks?error=Task already completed and locked 🔒');
        }

        if (task.status !== 'Open') {
            return res.redirect('/tasks?error=Task already claimed');
        }

        task.status = 'Claimed';
        task.tasker = req.session.userId;

        await task.save();

        res.redirect('/tasks?flash=claimed');

    } catch (err) {
        console.log(err);
        res.redirect('/tasks');
    }
});

// complete task
app.post('/tasks/:id/complete', isLoggedIn, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task || !task.tasker) return res.redirect('/tasks');

        // 🔒 Already completed — locked
        if (task.status === 'Completed') {
            return res.redirect('/tasks?error=Task already completed and locked 🔒');
        }

        if (String(task.tasker) !== String(req.session.userId)) {
            return res.redirect('/tasks?error=You are not the assigned tasker');
        }

        task.status = 'Completed';
        await task.save();

        res.redirect('/tasks?flash=completed');

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
const PORT = process.env.PORT || 3000;

app.delete("/tasks/:id", isLoggedIn, async (req, res) => {
    try {
        const taskId = req.params.id;

        const task = await Task.findById(taskId);

        if (!task) {
            return res.redirect('/tasks?error=Task not found');
        }

        // 🔒 Completed tasks are permanently locked
        if (task.status === 'Completed') {
            return res.redirect('/tasks?error=Completed tasks cannot be deleted 🔒');
        }

        // 🔐 Only creator can delete
        if (String(task.requester) !== String(req.session.userId)) {
            return res.redirect('/tasks?error=You are not authorised to delete this task');
        }

        await Task.findByIdAndDelete(taskId);

        res.redirect('/tasks?flash=deleted');
    } catch (err) {
        console.error(err);
        res.redirect('/tasks?error=Server error. Please try again.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

// ================== 🔥 FIX FOR ANDROID (UPDATE STATUS) ==================

// API UPDATE TASK STATUS (for Android PUT)
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { status, userId } = req.body;

        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // If claiming task
        if (status === "Claimed") {
            if (task.status !== "Open") {
                return res.status(400).json({ message: "Task already claimed" });
            }

            task.status = "Claimed";
            task.tasker = userId || null;
        }

        // If completing task
        if (status === "Completed") {
            task.status = "Completed";
        }

        await task.save();

        res.json({
            message: "Task updated successfully",
            task
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});