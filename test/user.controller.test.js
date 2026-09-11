require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const EventEmitter = require("events"); // needed by httpMocks.createResponse below
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const { register, logoff, logon } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const jwt = require("jsonwebtoken");

let saveRes = null;

const cookie = require("cookie");
function MockResponseWithCookies() {
  const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
  res.cookie = (name, value, options = {}) => {
    const serialized = cookie.serialize(name, String(value), options);
    let currentHeader = res.getHeader("Set-Cookie");
    if (currentHeader === undefined) currentHeader = [];
    currentHeader.push(serialized);
    res.setHeader("Set-Cookie", currentHeader);
  };
  return res;
}

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
});
afterAll(() => {
  prisma.$disconnect();
});

let jwtCookie;

describe("testing logon, register, and logoff", () => {
  let registerData = null;

  it("33. register succeeds", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        name: "Carol Danvers",
        email: "carol@sample.com",
        password: "Pa$$word20",
      },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(register, req, saveRes);
    registerData = saveRes._getJSONData();
    expect(saveRes.statusCode).toBe(201);
  });

  it("34. logon succeeds", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "carol@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it('35. a Set-Cookie entry starts with "jwt="', () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });

  it('36. that entry contains "HttpOnly;"', () => {
    expect(jwtCookie).toContain("HttpOnly;");
  });

  it("37. register's returned data has the expected name", () => {
    expect(registerData.user.name).toBe("Carol Danvers");
  });

  it("38. register's returned data has a csrfToken", () => {
    expect(registerData.csrfToken).toBeDefined();
  });

  it("39. logoff succeeds", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logoff, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("40. The logoff clears the cookie.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toContain("Jan 1970");
  });

  it("41. logon with a bad password returns 401", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "carol@sample.com", password: "WrongPassword1$" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("42. cant register an already-registered email", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: {
        name: "Carol Danvers",
        email: "carol@sample.com",
        password: "Pa$$word20",
      },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(register, req, saveRes);
    expect(saveRes.statusCode).toBe(400);
  });
});

describe("Testing JWT middleware", () => {
  let goodReq;

  it("61. missing jwt cookie returns 401", async () => {
    const req = httpMocks.createRequest({ method: "GET", cookies: {} });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("62. an invalid JWT returns 401", async () => {
    const badToken = jwt.sign({ id: 5, csrfToken: "badToken" }, "badSecret", {
      expiresIn: "1h",
    });
    const req = httpMocks.createRequest({
      method: "GET",
      cookies: { jwt: badToken },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("63. a valid JWT with a mismatched CSRF token returns 401 on a POST", async () => {
    const goodToken = jwt.sign(
      { id: 5, csrfToken: "badToken" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    const req = httpMocks.createRequest({
      method: "POST",
      cookies: { jwt: goodToken },
      headers: { "X-CSRF-TOKEN": "goodtoken" },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("64. a valid JWT with a matching CSRF token calls next()", async () => {
    const goodToken = jwt.sign(
      { id: 5, csrfToken: "goodtoken" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    goodReq = httpMocks.createRequest({
      method: "POST",
      cookies: { jwt: goodToken },
      headers: { "X-CSRF-TOKEN": "goodtoken" },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    const next = await waitForRouteHandlerCompletion(
      jwtMiddleware,
      goodReq,
      saveRes,
    );
    expect(next).toHaveBeenCalled();
  });

  it("65. req.user.id equals the id from the token", () => {
    expect(goodReq.user.id).toBe(5);
  });
});
