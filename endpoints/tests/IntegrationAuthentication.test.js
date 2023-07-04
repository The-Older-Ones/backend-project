const { createToken } = require('../authentication/AuthenticationService');
const userService = require('../user/UserService');
const User = require('../user/UserModel');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let originalEnv;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true });
  originalEnv = { ...process.env };
  process.env.TOKEN_KEY = '123456';
});

afterAll(async () => {
  jest.clearAllMocks();
  process.env = originalEnv;
  await mongoose.disconnect();
  await mongoServer.stop();
})

describe('createToken integration test', () => {

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

        createToken(content, (tokenError, token) => {
          expect(tokenError).toEqual(true);
          expect(token).toBeNull();
          done();
        });
      });
    });
});
