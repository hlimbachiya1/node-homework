function register(req, res) {
  const { name, email, password } = req.body;

  const newUser = {
    name,
    email,
    password,
  };

  global.users.push(newUser);
  global.user_id = newUser;

  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
}

function logon(req, res) {
  const { email, password } = req.body;
  const foundUser = global.users.find(
    (user) => user.email === email && user.password === password,
  );

  if (!foundUser) {
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
