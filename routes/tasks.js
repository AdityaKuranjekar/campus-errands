const express = require("express");
const router = express.Router();

const Task = require("../models/Task");

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