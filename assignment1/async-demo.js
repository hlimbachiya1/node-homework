const fs = require("fs");
const path = require("path");

/// Write a sample file for demonstration
const sampleDir = path.join(__dirname, "sample-files");
const sampleFile = path.join(sampleDir, "sample.txt");

// folder existance check
if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir);
}

fs.writeFileSync(sampleFile, "Hello, async world!");

// 1. Callback style
fs.readFile(sampleFile, "utf8", (err, content) => {
  if (err) {
    console.log("Callback read failed:", err.message);
    return;
  }
  console.log("Callback read:", content);
  runPromiseDemo();
});

// Callback hell example (test and leave it in comments):

// 2. Promise style
function readTextFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, content) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(content);
    });
  });
}

function runPromiseDemo() {
  readTextFile(sampleFile)
    .then((content) => {
      console.log("Promise read:", content);
      runAsyncAwaitDemo();
    })
    .catch((err) => {
      console.log("Promise read failed:", err.message);
    });
}

// 3. Async/Await style
async function runAsyncAwaitDemo() {
  try {
    const content = await readTextFile(sampleFile);
    console.log("Async/Await read:", content);
  } catch (err) {
    console.log("Async/Await read failed:", err.message);
  }
}
