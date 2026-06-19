const httpMocks = require("node-mocks-http");
const authMiddleware = require("../middleware/auth");
const {
  index,
  show,
  create,
  update,
  deleteTask,
} = require("../controllers/taskController");
const { logon, register, logoff } = require("../controllers/userController");

global.users = [];
global.tasks = [];
global.user_id = null;

let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

describe("Assignment 4a: Protected Task Routes", () => {
  describe("authentication middleware", () => {
    it("returns a 401 when no user is logged in.", () => {
      global.user_id = null;
      const req = httpMocks.createRequest({ method: "GET" });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next() when a user is logged in.", () => {
      global.user_id = { email: "jim@sample.com", name: "Jim" };
      const req = httpMocks.createRequest({ method: "GET" });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("user registration, logon, and logoff", () => {
    it("You can register a user.", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        body: {
          email: "jim@sample.com",
          name: "Jim",
          password: "Pa$$word20",
        },
      });
      saveRes = httpMocks.createResponse();
      await register(req, saveRes);
      expect(saveRes.statusCode).toBe(201);
      user1 = global.user_id;
    });

    it("The user can be logged on.", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        body: { email: "jim@sample.com", password: "Pa$$word20" },
      });
      saveRes = httpMocks.createResponse();
      await logon(req, saveRes);
      expect(saveRes.statusCode).toBe(200);
    });

    it("returns the expected name.", () => {
      saveData = saveRes._getJSONData();
      expect(saveData.name).toBe("Jim");
    });

    it("A logon attempt with a bad password returns a 401.", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        body: { email: "jim@sample.com", password: "bad password" },
      });
      saveRes = httpMocks.createResponse();
      await logon(req, saveRes);
      expect(saveRes.statusCode).toBe(401);
    });

    it("Registering with invalid user data returns a 400.", async () => {
      const userCount = global.users.length;
      const req = httpMocks.createRequest({
        method: "POST",
        body: { email: "not-an-email", name: "Ji", password: "password" },
      });
      saveRes = httpMocks.createResponse();
      await register(req, saveRes);
      expect(saveRes.statusCode).toBe(400);
      expect(global.users).toHaveLength(userCount);
    });

    it("Registered users do not store the plain-text password.", () => {
      expect(global.users[0].password).not.toBeDefined();
      expect(global.users[0].hashedPassword).toBeDefined();
    });

    it("You can register an additional user.", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        body: {
          email: "manuel@sample.com",
          name: "Manuel",
          password: "Pa$$word20",
        },
      });
      saveRes = httpMocks.createResponse();
      await register(req, saveRes);
      expect(saveRes.statusCode).toBe(201);
      user2 = global.user_id;
    });

    it("You can logon as that new user.", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        body: { email: "manuel@sample.com", password: "Pa$$word20" },
      });
      saveRes = httpMocks.createResponse();
      await logon(req, saveRes);
      expect(saveRes.statusCode).toBe(200);
    });

    it("You can now logoff.", async () => {
      const req = httpMocks.createRequest({ method: "POST" });
      saveRes = httpMocks.createResponse();
      await logoff(req, saveRes);
      expect(saveRes.statusCode).toBe(200);
    });
  });

  describe("task creation", () => {
    it("Creating a task with invalid data returns a 400.", async () => {
      global.user_id = user1;
      const req = httpMocks.createRequest({
        method: "POST",
        body: { title: "Hi" },
      });
      saveRes = httpMocks.createResponse();
      await create(req, saveRes);
      expect(saveRes.statusCode).toBe(400);
      expect(global.tasks).toHaveLength(0);
    });

    it("If you have a valid user id, create() succeeds.", async () => {
      global.user_id = user1;
      const req = httpMocks.createRequest({
        method: "POST",
        body: { title: "first task" },
      });
      saveRes = httpMocks.createResponse();
      await create(req, saveRes);
      expect(saveRes.statusCode).toBe(201);
    });

    it("The object returned from create() has the expected title.", () => {
      saveData = saveRes._getJSONData();
      saveTaskId = saveData.id.toString();
      expect(saveData.title).toBe("first task");
    });

    it("The object has the right value for isCompleted.", () => {
      expect(saveData.isCompleted).toBe(false);
    });

    it("The object does not include userId.", () => {
      expect(saveData.userId).not.toBeDefined();
    });
  });

  describe("getting created tasks", () => {
    it("If you use user1's id, index returns a 200 statusCode.", async () => {
      global.user_id = user1;
      const req = httpMocks.createRequest({ method: "GET" });
      saveRes = httpMocks.createResponse();
      await index(req, saveRes);
      expect(saveRes.statusCode).toBe(200);
    });

    it("The returned JSON array has length 1.", () => {
      saveData = saveRes._getJSONData();
      expect(saveData).toHaveLength(1);
    });

    it("The title in the first array object is as expected.", () => {
      expect(saveData[0].title).toBe("first task");
    });

    it("The first array object does not contain userId.", () => {
      expect(saveData[0].userId).not.toBeDefined();
    });

    it("If you get the list of tasks using user2, you get a 404.", async () => {
      global.user_id = user2;
      const req = httpMocks.createRequest({ method: "GET" });
      saveRes = httpMocks.createResponse();
      await index(req, saveRes);
      expect(saveRes.statusCode).toBe(404);
    });

    it("You can retrieve the task using show().", async () => {
      global.user_id = user1;
      const req = httpMocks.createRequest({ method: "GET" });
      req.params = { id: saveTaskId };
      saveRes = httpMocks.createResponse();
      await show(req, saveRes);
      expect(saveRes.statusCode).toBe(200);
    });

    it("show() returns 400 if the task id is invalid.", async () => {
      global.user_id = user1;
      const req = httpMocks.createRequest({ method: "GET" });
      req.params = { id: "not-a-number" };
      saveRes = httpMocks.createResponse();
      await show(req, saveRes);
      expect(saveRes.statusCode).toBe(400);
    });
  });

  describe("updating and deleting tasks", () => {
    it("User1 can set the task to isCompleted: true.", async () => {
      global.user_id = user1;
      const req = httpMocks.createRequest({ method: "PATCH" });
      req.params = { id: saveTaskId };
      req.body = { isCompleted: true };
      saveRes = httpMocks.createResponse();
      await update(req, saveRes);
      expect(saveRes.statusCode).toBe(200);
    });

    it("The updated task does not include userId.", () => {
      saveData = saveRes._getJSONData();
      expect(saveData.userId).not.toBeDefined();
      expect(saveData.isCompleted).toBe(true);
    });

    it("User2 can't update user1's task.", async () => {
      global.user_id = user2;
      const req = httpMocks.createRequest({ method: "PATCH" });
      req.params = { id: saveTaskId };
      req.body = { isCompleted: false };
      saveRes = httpMocks.createResponse();
      await update(req, saveRes);
      expect(saveRes.statusCode).not.toBe(200);
    });

    it("User2 can't delete user1's task.", async () => {
      global.user_id = user2;
      const req = httpMocks.createRequest({ method: "DELETE" });
      req.params = { id: saveTaskId };
      saveRes = httpMocks.createResponse();
      await deleteTask(req, saveRes);
      expect(saveRes.statusCode).not.toBe(200);
    });

    it("User1 can delete this task.", async () => {
      global.user_id = user1;
      const req = httpMocks.createRequest({ method: "DELETE" });
      req.params = { id: saveTaskId };
      saveRes = httpMocks.createResponse();
      await deleteTask(req, saveRes);
      expect(saveRes.statusCode).toBe(200);
    });

    it("Retrieving user1's tasks now returns a 404.", async () => {
      global.user_id = user1;
      const req = httpMocks.createRequest({ method: "GET" });
      saveRes = httpMocks.createResponse();
      await index(req, saveRes);
      expect(saveRes.statusCode).toBe(404);
    });
  });
});
