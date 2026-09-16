const { userSchema } = require("../validation/userSchema");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

describe("user object validation tests", () => {
  it("1. doesn't permit a trivial password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com", password: "password" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "password"),
    ).toBeDefined();
  });

  it("2. requires that an email be specified", () => {
    const { error } = userSchema.validate(
      { name: "Bob", password: "Pa$$word20" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "email"),
    ).toBeDefined();
  });

  it("3. does not accept an invalid email", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "not-an-email", password: "Pa$$word20" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "email"),
    ).toBeDefined();
  });

  it("4. requires a password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "password"),
    ).toBeDefined();
  });

  it("5. requires name", () => {
    const { error } = userSchema.validate(
      { email: "bob@sample.com", password: "Pa$$word20" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "name"),
    ).toBeDefined();
  });

  it("6. the name must be valid (3 to 30 characters)", () => {
    const { error } = userSchema.validate(
      { name: "Al", email: "bob@sample.com", password: "Pa$$word20" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "name"),
    ).toBeDefined();
  });

  it("7. error comes back falsy for a valid user object", () => {
    const { error } = userSchema.validate(
      { name: "Bob Marley", email: "bob@sample.com", password: "Pa$$word20" },
      { abortEarly: false },
    );
    expect(error).toBeFalsy();
  });
});

describe("task object validation tests", () => {
  it("8. the task schema requires a title", () => {
    const { error } = taskSchema.validate({}, { abortEarly: false });
    expect(
      error.details.find((detail) => detail.context.key == "title"),
    ).toBeDefined();
  });

  it("9. an isCompleted value, if specified, must be valid", () => {
    const { error } = taskSchema.validate(
      { title: "Buy milk", isCompleted: "banana" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "isCompleted"),
    ).toBeDefined();
  });

  it("10. defaults isCompleted to false when not specified", () => {
    const { value } = taskSchema.validate(
      { title: "Buy milk" },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBe(false);
  });

  it("11. keeps isCompleted true when provided as true", () => {
    const { value } = taskSchema.validate(
      { title: "Buy milk", isCompleted: true },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBe(true);
  });
});

describe("patchTaskSchema validation tests", () => {
  it("12. does not require a title", () => {
    const { error } = patchTaskSchema.validate(
      { isCompleted: true },
      { abortEarly: false },
    );
    expect(error).toBeFalsy();
  });

  it("13. leaves isCompleted undefined when not provided", () => {
    const { value } = patchTaskSchema.validate(
      { title: "Buy milk" },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBeUndefined();
  });
});
