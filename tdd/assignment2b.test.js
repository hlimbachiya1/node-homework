const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

describe("Assignment 2b: Advanced HTTP and Express Edge Cases", () => {
  const assignmentDir = path.join(__dirname, "../assignment2");
  const httpPath = path.join(assignmentDir, "sampleHTTP.js");

  let rawServerProcess;

  const requestRawServer = ({ method = "GET", path: requestPath, body }) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: 8000,
          path: requestPath,
          method,
          headers:
            body === undefined
              ? undefined
              : {
                  "Content-Type": "application/json",
                  "Content-Length": Buffer.byteLength(body),
                },
        },
        (res) => {
          let responseBody = "";
          res.on("data", (chunk) => {
            responseBody += chunk;
          });
          res.on("end", () => {
            resolve({ res, body: responseBody });
          });
        },
      );

      req.on("error", reject);
      if (body !== undefined) {
        req.write(body);
      }
      req.end();
    });

  const waitForRawServer = async () => {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      try {
        await requestRawServer({ path: "/time" });
        return;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error("sampleHTTP.js did not start listening on port 8000.");
  };

  beforeAll(async () => {
    if (!fs.existsSync(assignmentDir)) {
      throw new Error(
        "assignment2 directory does not exist. Please create it first.",
      );
    }

    if (!fs.existsSync(httpPath)) {
      throw new Error("assignment2/sampleHTTP.js does not exist.");
    }

    rawServerProcess = spawn(process.execPath, [httpPath], {
      stdio: "ignore",
    });

    await waitForRawServer();
  });

  afterAll(() => {
    if (rawServerProcess && !rawServerProcess.killed) {
      rawServerProcess.kill();
    }
  });

  describe("Tasks 6 and 7: Raw HTTP Edge Cases", () => {
    test("sampleHTTP.js should return 404 JSON for unknown routes", async () => {
      const { res, body } = await requestRawServer({ path: "/not-here" });

      expect(res.statusCode).toBe(404);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(JSON.parse(body)).toEqual({
        message: "That route is not available.",
      });
    });

    test("sampleHTTP.js should return 400 JSON for invalid POST /echo JSON", async () => {
      const { res, body } = await requestRawServer({
        method: "POST",
        path: "/echo",
        body: '{"message":"missing end quote}',
      });

      expect(res.statusCode).toBe(400);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(JSON.parse(body)).toEqual({
        message: "Invalid JSON.",
      });
    });
  });

  describe("Task 8: Express Unknown Route", () => {
    const request = require("supertest");
    const { app, server } = require("../app");
    let agent;

    beforeAll(() => {
      agent = request.agent(app);
    });

    afterAll(() => {
      server.close();
    });

    test("Express should return 404 JSON for unknown routes", async () => {
      const res = await agent.get("/unknown").send();

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        message: "No route found for GET /unknown",
      });
    });
  });
});
