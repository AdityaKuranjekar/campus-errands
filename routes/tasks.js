const express = require("express");
const router = express.Router();

const Task = require("../models/Task");

router.delete('/tasks/:id', async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        return res.status(404).send("Task not found");
    }

    if (task.status !== "Open") {
        return res.send("Cannot delete accepted task");
    }

    await Task.findByIdAndDelete(req.params.id);
    res.redirect('/');
});

// ✅ GET all tasks
router.get("/tasks", async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ UPDATE task (🔥 THIS FIXES YOUR ISSUE)
router.put("/tasks/:id", async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json(updatedTask);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

router.get("/api/tasks", async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});