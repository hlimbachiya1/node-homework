const os = require("os");
const path = require("path");
const fs = require("fs");
const fsPromises = require('fs/promises');

const sampleFilesDir = path.join(__dirname, "sample-files");
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
const cpus = os.cpus();
console.log("Platform:", os.platform());
console.log("CPU:", cpus[0].model);
console.log("Total Memory:", os.totalmem());

// Path module
const joinedPath = path.join(sampleFilesDir, "folder", "file.txt");
console.log("Joined path:", joinedPath);

// fs.promises API
async function runFsPromisesDemo() {
  const demoFile = path.join(sampleFilesDir, "demo.txt");
  try {
    await fsPromises.writeFile(demoFile, "Hello from fs.promises!");
    const content = await fsPromises.readFile(demoFile, "utf8");
    console.log("fs.promises read:", content);
  } catch (err) {
    console.log("fs.promises operation failed:", err.message);
  }
}

// Streams for large files- log first 40 chars of each chunk
function runStreamsDemo() {
  return new Promise((resolve, reject) => {
    const largeFile = path.join(sampleFilesDir, "largefile.txt");

    let fileContents = "";
    for (let i = 1; i <= 100; i++) {
      fileContents += `This is a line in a large file, line number ${i}.\n`;
    }
    fs.writeFileSync(largeFile, fileContents);

    const readStream = fs.createReadStream(largeFile, {
      encoding: "utf8",
      highWaterMark: 1024,
    });

    readStream.on("data", (chunk) => {
      console.log("Read chunk:", chunk.slice(0, 40));
    });

    readStream.on("end", () => {
      console.log("Finished reading large file with streams.");
      resolve();
    });

    readStream.on("error", (err) => {
      console.log("Error reading file:", err.message);
      reject(err);
    });
  });
}

async function main() {
  await runFsPromisesDemo();
  await runStreamsDemo();
}

main();
