const express = require("express");
const timeRouter = require("./routes/timeRoutes");
const userRoutes = require("./routes/userRoutes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");
const authMiddleware = require("./middleware/auth");
const taskRouter = require("./routes/taskRoutes");
//const pool = require("./db/pg-pool");
const prisma = require("./db/prisma");
const { Prisma } = require("@prisma/client");

global.user_id = null;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post("/testpost", (req, res) => {
  res.status(200).json({
    message: "POST route works",
  });
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", db: "not connected", error: err.message });
  }
});

app.use("/api", timeRouter);
app.use("/api/users", userRoutes);
app.use("/api/tasks", authMiddleware, taskRouter);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

let server;

async function start() {
  try {
    // Verify Prisma can actually connect before accepting traffic
    await prisma.$connect();
    console.log("Prisma connected to the database.");
  } catch (err) {
    if (err instanceof Prisma.PrismaClientInitializationError) {
      console.error("Failed to initialize Prisma Client:", err.message);
    } else {
      console.error("Unexpected error while connecting to the database:", err);
    }
    process.exit(1);
  }

  server = app.listen(port, () => {
    console.log(`Server is listening on port ${port}...`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use.`);
    } else {
      console.error("Server error:", err);
    }
    process.exit(1);
  });
}

start();

let isShuttingDown = false;

async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Shutting down gracefully...");

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("HTTP server closed.");
    }
    // await pool.end();
    // console.log("Database pool closed.");
    await prisma.$disconnect();
    console.log("Prisma disconnected");
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// Safety net for Prisma (or other) errors that escape request handlers
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error("This was a Prisma initialization error.");
  }
  shutdown(1);
});

module.exports = { app, server };
