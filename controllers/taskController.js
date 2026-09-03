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
      priority: value.priority,
      userId: req.user.id,
    },
    select: { id: true, title: true, isCompleted: true, priority: true },
  });

  res.status(201).json(task);
}

async function index(req, res) {
  // Parse pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const whereClause = { userId: req.user.id };

  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find,
      mode: "insensitive",
    };
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  // Get total count for pagination metadata (using same whereClause)
  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  res.status(200).json({
    tasks,
    pagination,
  });
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
        id_userId: {
          id: taskId,
          userId: req.user.id,
        },
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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
        id_userId: {
          id: taskId,
          userId: req.user.id,
        },
      },
      select: { id: true, title: true, isCompleted: true, priority: true },
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
        id_userId: {
          id: taskId,
          userId: req.user.id,
        },
      },
      select: { id: true, title: true, isCompleted: true, priority: true },
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

async function bulkCreate(req, res, next) {
  const { tasks } = req.body || {};

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: req.user.id,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(201).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
  bulkCreate,
};
