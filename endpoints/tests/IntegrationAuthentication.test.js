const { createToken } = require('../authentication/AuthenticationService');
const userService = require('../user/UserService');
const User = require('../user/UserModel');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer
let mongoUri;

let originalEnv;

beforeAll(async () => {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true });
  originalEnv = { ...process.env };
  process.env.TOKEN_KEY = '123456';
});

afterAll(async () => {
  jest.clearAllMocks();
  process.env = originalEnv;
  await mongoServer.stop();
})

describe('createToken integration test', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = await mongoServer.getUri();
  });

  beforeEach(async () => {
    await User.deleteMany();
    const newUser = {
      userID: 'existinguser',
      password: 'password',
      email: 'existing@example.com',
    };
    await User.create(newUser);
  });

  it('should create a token if authentication is successful', async () => {
    const content = {
      username: 'existinguser',
      password: 'password'
    };
    const user = {
      userID: 'existinguser',
      isAdministrator: false
    };

    userService.authenticate(content, (error, authenticatedUser) => {
      expect(error).toBeNull();
      const { isAdministrator, userID } = authenticatedUser;

      expect({ isAdministrator, userID }).toEqual(user);

      createToken(content, (tokenError, token) => {
        expect(tokenError).toBeNull();
        expect(typeof token).toBe('string');
      });
    });
  });
    it('should return an error if authentication fails', (done) => {
      const content = {
        username: 'existingUser',
        password: 'examplePassword'
      };
      const error = new Error('Authentication failed');

      userService.authenticate(content, (authenticateError) => {
        expect(authenticateError).toEqual(true);

          done();
      });
    });
});
