const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

describe("Assignment 2a: Core Events, HTTP, and Express", () => {
  const assignmentDir = path.join(__dirname, "../assignment2");
  const rootDir = path.join(__dirname, "..");
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

  describe("Task 1: Event Emitter and Listener", () => {
    test("events.js should exist, export an emitter, and log time messages", () => {
      const eventsPath = path.join(assignmentDir, "events.js");
      expect(fs.existsSync(eventsPath)).toBe(true);

      const emitter = require(eventsPath);
      expect(typeof emitter.emit).toBe("function");
      expect(emitter.listenerCount("time")).toBe(1);

      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      emitter.emit("time", "test time");
      expect(logSpy).toHaveBeenCalledWith("Time received:", "test time");
      logSpy.mockRestore();
    });
  });

  describe("Tasks 2 and 3: Raw Node HTTP Server", () => {
    test("sampleHTTP.js should handle GET /time with a JSON response", async () => {
      const { res, body } = await requestRawServer({ path: "/time" });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");

      const jsonData = JSON.parse(body);
      expect(jsonData).toHaveProperty("time");
      expect(typeof jsonData.time).toBe("string");
    });

    test("sampleHTTP.js should handle GET /timePage with an HTML response", async () => {
      const { res, body } = await requestRawServer({ path: "/timePage" });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("text/html; charset=utf-8");
      expect(body).toContain("<!DOCTYPE html>");
      expect(body).toContain("Clock");
      expect(body).toContain("getTimeBtn");
      expect(body).toContain("fetch('/time')");
    });

    test("sampleHTTP.js should handle POST /echo with a JSON response", async () => {
      const requestBody = JSON.stringify({ message: "Hello from Postman" });
      const { res, body } = await requestRawServer({
        method: "POST",
        path: "/echo",
        body: requestBody,
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(JSON.parse(body)).toEqual({
        weReceived: {
          message: "Hello from Postman",
        },
      });
    });
  });

  describe("Tasks 4 and 5: Express Application", () => {
    const request = require("supertest");
    const { app, server } = require("../app");
    let agent;

    beforeAll(() => {
      agent = request.agent(app);
    });

    afterAll(() => {
      server.close();
    });

    test("app.js should exist and export an Express app", () => {
      const appPath = path.join(rootDir, "app.js");
      expect(fs.existsSync(appPath)).toBe(true);
      expect(typeof app).toBe("function");
    });

    test("GET / should return 200", async () => {
      const res = await agent.get("/").send();
      expect(res.status).toBe(200);
      expect(res.text).toBe("Hello, World!");
    });

    test("POST /testpost should return 200", async () => {
      const res = await agent.post("/testpost").send();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "POST route works",
      });
    });

    test("controllers/timeController.js should export time handlers", () => {
      const controllerPath = path.join(rootDir, "controllers/timeController.js");
      expect(fs.existsSync(controllerPath)).toBe(true);

      const timeController = require(controllerPath);
      expect(typeof timeController.getTime).toBe("function");
      expect(typeof timeController.echoBody).toBe("function");
    });

    test("routes/timeRoutes.js should exist", () => {
      const routesPath = path.join(rootDir, "routes/timeRoutes.js");
      expect(fs.existsSync(routesPath)).toBe(true);
    });

    test("GET /api/time should return a time object", async () => {
      const res = await agent.get("/api/time").send();

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("time");
      expect(typeof res.body.time).toBe("string");
    });

    test("POST /api/echo should return the posted body", async () => {
      const requestBody = { source: "Express layout practice" };
      const res = await agent.post("/api/echo").send(requestBody);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        weReceived: requestBody,
      });
    });
  });
});
