// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  res.status(500).json({
    message: "Internal server error.",
  });
}

module.exports = errorHandler;
