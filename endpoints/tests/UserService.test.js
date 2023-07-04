const UserService = require('../user/UserService');
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

describe('createUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if required fields are missing', async () => {
    const newUser = {
    };
    User.create = jest.fn();

    await expect(UserService.createUser(newUser)).rejects.toThrowError('Please fill all required fields');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('should throw an error if User.create throws a validation error', async () => {
    const newUser = {
      userID: 'testuser',
      password: 'password',
    };

    User.create = jest.fn().mockRejectedValue(new Error('Validation error'));

    try {
      UserService.createUser(newUser);
    } catch (error) {
      // .catch((error) => {
      expect(error).toThrowError('Validation error');
      expect(User.create).toHaveBeenCalledWith(newUser);
      done();
    }
  })

  it('should throw an error if a user with the same userID or email already exists', async () => {
    const newUser = {
      userID: 'existinguser',
      password: 'password',
    };

    User.create = jest.fn().mockRejectedValue({ name: 'MongoError' });
    User.findOne = jest.fn().mockResolvedValue({});

    await expect(UserService.createUser(newUser)).rejects.toThrowError('User with the same UserID or Email already exists');
    expect(User.create).toHaveBeenCalledWith(newUser);
    expect(User.findOne).toHaveBeenCalledWith({ userID: newUser.userID });
  });

  it('should create a user and return a subset of user data', async () => {
    const newUser = {
      userID: 'testuser',
      password: 'password',
      email: 'test@example.com',
      profilePicture: 'picture.png',
      isVerified: true,
      isAdministrator: false,
    };

    const createdUser = {
      ...newUser,
      _id: '12345',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    User.create = jest.fn().mockResolvedValue(createdUser);
    User.findOne = jest.fn();

    const expectedSubset = {
      userID: createdUser.userID,
      email: createdUser.email,
      profilePicture: createdUser.profilePicture,
      isVerified: createdUser.isVerified,
      isAdministrator: createdUser.isAdministrator,
    };

    await expect(UserService.createUser(newUser)).resolves.toEqual(expectedSubset);
    expect(User.create).toHaveBeenCalledWith(newUser);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe('authenticate', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call the callback with error if the user does not exist', async () => {
    const loginUser = {
      username: 'nonexistentuser',
      password: 'password',
    };

    User.findOne = jest.fn().mockResolvedValue(null);

    const callback = jest.fn();

    await UserService.authenticate(loginUser, callback);

    expect(User.findOne).toHaveBeenCalledWith({ userID: loginUser.username });
    expect(callback).toHaveBeenCalledWith(true, null);
  });

  it('should call the callback with error if the password is incorrect', async () => {
    const loginUser = {
      username: 'testuser',
      password: 'wrongpassword',
    };

    const user = {
      comparePassword: jest.fn().mockImplementation((password, callback) => {
        callback(null, false);
      }),
    };

    User.findOne = jest.fn().mockResolvedValue(user);

    const callback = jest.fn();

    await UserService.authenticate(loginUser, callback);

    expect(User.findOne).toHaveBeenCalledWith({ userID: loginUser.username });
    expect(user.comparePassword).toHaveBeenCalledWith(loginUser.password, expect.any(Function));
    expect(callback).toHaveBeenCalledWith(true, null);
  });
});
