const httpMocks = require("node-mocks-http");
const { create, update } = require("../controllers/taskController");
const { logon, register } = require("../controllers/userController");
const { userSchema } = require("../validation/userSchema");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

describe("Assignment 4b: Advanced Validation, Patch Updates, and Password Security", () => {
  beforeEach(() => {
    global.users = [];
    global.tasks = [];
    global.user_id = null;
  });

  describe("user object validation tests", () => {
    it("doesn't permit a trivial password.", () => {
      const { error } = userSchema.validate(
        { name: "Bob", email: "bob@sample.com", password: "password" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key === "password"),
      ).toBeDefined();
    });

    it("requires that an email be specified.", () => {
      const { error } = userSchema.validate(
        { name: "Bob", password: "Pa$$word20" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key === "email"),
      ).toBeDefined();
    });

    it("does not accept an invalid email.", () => {
      const { error } = userSchema.validate(
        { name: "Bob", email: "bob_at_sample.com", password: "Pa$$word20" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key === "email"),
      ).toBeDefined();
    });

    it("requires a password.", () => {
      const { error } = userSchema.validate(
        { name: "Bob", email: "bob@sample.com" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key === "password"),
      ).toBeDefined();
    });

    it("requires name.", () => {
      const { error } = userSchema.validate(
        { email: "bob@sample.com", password: "Pa$$word20" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key === "name"),
      ).toBeDefined();
    });

    it("requires name to be 3 to 30 characters.", () => {
      const { error } = userSchema.validate(
        { name: "B", email: "bob@sample.com", password: "Pa$$word20" },
        { abortEarly: false },
      );
      expect(
        error.details.find((detail) => detail.context.key === "name"),
      ).toBeDefined();
    });

    it("returns cleaned values for a valid user object.", () => {
      const { error, value } = userSchema.validate(
        { name: "  Bob  ", email: "BOB@SAMPLE.COM", password: "Pa$$word20" },
        { abortEarly: false },
      );

      expect(error).toBeFalsy();
      expect(value.name).toBe("Bob");
      expect(value.email).toBe("bob@sample.com");
    });
  });

  describe("task object validation tests", () => {
    it("requires a title.", () => {
      const { error } = taskSchema.validate({ isCompleted: true });
      expect(
        error.details.find((detail) => detail.context.key === "title"),
      ).toBeDefined();
    });

    it("requires title to be 3 to 30 characters.", () => {
      const { error } = taskSchema.validate({ title: "Hi" });
      expect(
        error.details.find((detail) => detail.context.key === "title"),
      ).toBeDefined();
    });

    it("requires isCompleted to be valid if it is specified.", () => {
      const { error } = taskSchema.validate({
        title: "first task",
        isCompleted: "baloney",
      });
      expect(
        error.details.find((detail) => detail.context.key === "isCompleted"),
      ).toBeDefined();
    });

    it("defaults isCompleted to false when it is not provided.", () => {
      const { value } = taskSchema.validate({ title: "first task" });
      expect(value.isCompleted).toBe(false);
    });

    it("keeps isCompleted true when true is provided.", () => {
      const { value } = taskSchema.validate({
        title: "first task",
        isCompleted: true,
      });
      expect(value.isCompleted).toBe(true);
    });
  });

  describe("patchTask object validation tests", () => {
    it("does not require title for a partial update.", () => {
      const { error } = patchTaskSchema.validate({ isCompleted: true });
      expect(error).toBeFalsy();
    });

    it("does not add a default isCompleted value during a title-only patch.", () => {
      const { value } = patchTaskSchema.validate({ title: "first task" });
      expect(value.isCompleted).toBeUndefined();
    });

    it("requires at least one field for a patch request.", () => {
      const { error } = patchTaskSchema.validate({});
      expect(error).toBeDefined();
    });
  });

  describe("controller validation behavior", () => {
    it("register() returns 400 and does not store a user when validation fails.", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        body: { email: "bad-email", name: "Bo", password: "password" },
      });
      const res = httpMocks.createResponse();

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(global.users).toHaveLength(0);
    });

    it("create() returns 400 and does not store a task when validation fails.", async () => {
      global.user_id = { email: "bob@sample.com", name: "Bob" };
      const req = httpMocks.createRequest({
        method: "POST",
        body: { title: "Hi" },
      });
      const res = httpMocks.createResponse();

      await create(req, res);

      expect(res.statusCode).toBe(400);
      expect(global.tasks).toHaveLength(0);
    });

    it("update() returns 400 and does not mutate the task when the patch body is empty.", async () => {
      global.user_id = { email: "bob@sample.com", name: "Bob" };
      global.tasks.push({
        id: 1,
        title: "first task",
        isCompleted: false,
        userId: "bob@sample.com",
      });
      const req = httpMocks.createRequest({ method: "PATCH" });
      req.params = { id: "1" };
      req.body = {};
      const res = httpMocks.createResponse();

      await update(req, res);

      expect(res.statusCode).toBe(400);
      expect(global.tasks[0].isCompleted).toBe(false);
    });

    it("update() merges patch fields without replacing the stored task.", async () => {
      global.user_id = { email: "bob@sample.com", name: "Bob" };
      global.tasks.push({
        id: 1,
        title: "first task",
        isCompleted: false,
        userId: "bob@sample.com",
      });
      const originalTask = global.tasks[0];
      const req = httpMocks.createRequest({ method: "PATCH" });
      req.params = { id: "1" };
      req.body = { title: "updated task" };
      const res = httpMocks.createResponse();

      await update(req, res);

      expect(res.statusCode).toBe(200);
      expect(global.tasks[0]).toBe(originalTask);
      expect(global.tasks[0].title).toBe("updated task");
      expect(global.tasks[0].isCompleted).toBe(false);
    });
  });

  describe("password hashing behavior", () => {
    it("register() stores hashedPassword instead of plain-text password.", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        body: {
          email: "jim@sample.com",
          name: "Jim",
          password: "Pa$$word20",
        },
      });
      const res = httpMocks.createResponse();

      await register(req, res);

      expect(res.statusCode).toBe(201);
      expect(global.users[0].password).not.toBeDefined();
      expect(global.users[0].hashedPassword).toBeDefined();
      expect(global.users[0].hashedPassword).not.toBe("Pa$$word20");
      expect(global.users[0].hashedPassword).toContain(":");
    });

    it("logon() still works with the original password after hashing.", async () => {
      await register(
        httpMocks.createRequest({
          method: "POST",
          body: {
            email: "jim@sample.com",
            name: "Jim",
            password: "Pa$$word20",
          },
        }),
        httpMocks.createResponse(),
      );

      const req = httpMocks.createRequest({
        method: "POST",
        body: { email: "jim@sample.com", password: "Pa$$word20" },
      });
      const res = httpMocks.createResponse();

      await logon(req, res);

      expect(res.statusCode).toBe(200);
    });

    it("logon() returns 401 when the submitted password does not match the stored hash.", async () => {
      await register(
        httpMocks.createRequest({
          method: "POST",
          body: {
            email: "jim@sample.com",
            name: "Jim",
            password: "Pa$$word20",
          },
        }),
        httpMocks.createResponse(),
      );

      const req = httpMocks.createRequest({
        method: "POST",
        body: { email: "jim@sample.com", password: "wrongPassword" },
      });
      const res = httpMocks.createResponse();

      await logon(req, res);

      expect(res.statusCode).toBe(401);
    });
  });
});
