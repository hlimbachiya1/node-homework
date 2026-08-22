const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
//const pool = require("../db/pg-pool");
const prisma = require("../db/prisma");

async function create(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted,
      userId: global.user_id,
    },
    select: { id: true, title: true, isCompleted: true },
  });

  res.status(201).json(task);
}

async function index(req, res) {
  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id,
    },
    select: { id: true, title: true, isCompleted: true },
  });

  if (tasks.length === 0) {
    return res.status(404).json({
      message: "No tasks found.",
    });
  }

  res.status(200).json(tasks);
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.findUniqueOrThrow({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { id: true, title: true, isCompleted: true },
    });

    res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "Task not found.",
      });
    }
    return next(err);
  }
}

async function update(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { id: true, title: true, isCompleted: true },
    });

    res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "Task not found.",
      });
    }
    return next(err);
  }
}

async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.delete({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { id: true, title: true, isCompleted: true },
    });

    res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "Task not found.",
      });
    }
    return next(err);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
