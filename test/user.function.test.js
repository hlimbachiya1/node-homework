require("dotenv").config();
const request = require("supertest");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const prisma = require("../db/prisma");
let agent;
const { app, server } = require("../app");

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  agent = request.agent(app);
});

afterAll(async () => {
  prisma.$disconnect();
  server.close(); // required — otherwise a zombie process can be left running
});

describe("register a user", () => {
  let saveRes = null;

  it("46. it creates the user entry", async () => {
    const newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };
    saveRes = await agent.post("/api/users/register").send(newUser);
    expect(saveRes.status).toBe(201);
  });

  it("47. the registered object has the expected name", () => {
    expect(saveRes.body.user.name).toBe("John Deere");
  });

  it("48. the registered object includes a csrfToken", () => {
    expect(saveRes.body.csrfToken).toBeDefined();
  });
});

describe("logon and task access", () => {
  let csrfToken;

  it("49. can logon as the new user", async () => {
    const res = await agent
      .post("/api/users/logon")
      .send({ email: "jdeere@example.com", password: "Pa$$word20" });
    csrfToken = res.body.csrfToken;
    expect(res.status).toBe(200);
  });

  it("50. confirms logged in: GET /api/tasks does not 401", async () => {
    const res = await agent.get("/api/tasks");
    expect(res.status).not.toBe(401);
  });

  it("51. can log out", async () => {
    const res = await agent
      .post("/api/users/logoff")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(res.status).toBe(200);
  });

  it("52. confirms really logged out: GET /api/tasks now 401s", async () => {
    const res = await agent.get("/api/tasks");
    expect(res.status).toBe(401);
  });
});
