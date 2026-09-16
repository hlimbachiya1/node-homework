require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; // before requiring prisma!
const EventEmitter = require("events"); // needed by httpMocks.createResponse below
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");

let user1 = null,
  user2 = null,
  saveRes = null,
  saveData = null,
  saveTaskId = null;

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  user1 = await prisma.user.create({
    data: { name: "Bob", email: "bob@sample.com", hashedPassword: "nonsense" },
  });
  user2 = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@sample.com",
      hashedPassword: "nonsense",
    },
  });
});

afterAll(() => {
  prisma.$disconnect();
});

describe("creating tasks", () => {
  it("14. cant create a task without a user id", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });

  it("15. a bogus user id causes a database error when creating a task", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "second task" },
      user: { id: 999999 },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });

  it("16. If you have a valid user id, create() succeeds (res.statusCode should be 201).", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "Buy groceries" },
      user: { id: user1.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(create, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });

  it("17. The object returned from the create() call has the expected title.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.title).toBe("Buy groceries");
  });

  it("18. The object has the right value for isCompleted.", () => {
    expect(saveData.isCompleted).toBe(false);
  });

  it("19. The object returned has no userId field.", () => {
    saveTaskId = saveData.id;
    expect(saveData.userId).toBeUndefined();
  });
});

describe("test getting created tasks", () => {
  it("20. index() fails without a user id", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({ method: "GET" });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(index, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });

  it("21. If you use user1's id on index() the call returns a 200 status.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      user: { id: user1.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("22. The returned tasks array has a length of 1.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks.length).toBe(1);
  });

  it("23. The first task's title matches what was created.", () => {
    expect(saveData.tasks[0].title).toBe("Buy groceries");
  });

  it("24. The first task object has no userId field.", () => {
    expect(saveData.tasks[0].userId).toBeUndefined();
  });

  it("25. Security check: user2's id on index() does not return user1's tasks.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      user: { id: user2.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes._getJSONData().tasks).toEqual([]);
  });

  it("26. show() retrieves the created task by id for user1.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { id: saveTaskId.toString() },
      user: { id: user1.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("27. Security check: user2 cannot retrieve user1's task via show().", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { id: saveTaskId.toString() },
      user: { id: user2.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});

describe("updating and deleting tasks", () => {
  it("28. user1 can update the task to isCompleted: true.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      params: { id: saveTaskId.toString() },
      body: { isCompleted: true },
      user: { id: user1.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("29. user2 cannot update user1's task.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      params: { id: saveTaskId.toString() },
      body: { isCompleted: true },
      user: { id: user2.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("30. user2 cannot delete user1's task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      params: { id: saveTaskId.toString() },
      user: { id: user2.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("31. user1 can delete their own task.", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      params: { id: saveTaskId.toString() },
      user: { id: user1.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("32. Re-fetching the deleted task now returns 404.", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      params: { id: saveTaskId.toString() },
      user: { id: user1.id },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});
