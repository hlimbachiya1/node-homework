const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require("../validation/userSchema");

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

async function register(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const hashedPassword = await hashPassword(value.password);

  const newUser = {
    email: value.email,
    name: value.name,
    hashedPassword,
  };

  global.users.push(newUser);
  global.user_id = newUser;

  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
}

async function logon(req, res) {
  const { email, password } = req.body;

  const foundUser = global.users.find((user) => user.email === email);

  const goodCredentials =
    foundUser && (await comparePassword(password, foundUser.hashedPassword));

  if (!goodCredentials) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  global.user_id = foundUser;

  res.status(200).json({
    name: foundUser.name,
    email: foundUser.email,
  });
}

function logoff(req, res) {
  global.user_id = null;

  res.status(200).json({
    message: "Logged off.",
  });
}

module.exports = {
  register,
  logon,
  logoff,
};
