const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const { userSchema, loginSchema } = require("../validation/userSchema");
//const pool = require("../db/pg-pool");
const prisma = require("../db/prisma");

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT // notes for self:
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie. Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

async function register(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const hashedPassword = await hashPassword(value.password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const newUser = await tx.user.create({
        data: {
          email: value.email,
          name: value.name,
          hashedPassword,
        },
        select: { id: true, name: true, email: true, createdAt: true },
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    const csrfToken = setJwtCookie(req, res, result.user);

    res.status(201).json({
      user: {
        name: result.user.name,
        email: result.user.email,
      },
      csrfToken,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({
        message: "That email is already registered.",
      });
    }
    return next(err);
  }
}

async function logon(req, res, next) {
  const { error, value } = loginSchema.validate(req.body ?? {}, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const { email, password } = value;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const goodCredentials = await comparePassword(
      password,
      user.hashedPassword,
    );

    if (!goodCredentials) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const csrfToken = setJwtCookie(req, res, user);

    res.status(200).json({
      name: user.name,
      email: user.email,
      csrfToken,
    });
  } catch (err) {
    return next(err);
  }
}

function logoff(req, res) {
  res.clearCookie("jwt", cookieFlags(req));

  res.status(200).json({
    message: "Logged off.",
  });
}

module.exports = {
  register,
  logon,
  logoff,
};
