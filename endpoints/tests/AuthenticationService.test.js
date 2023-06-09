const userService = require('../user/UserService');
const jwt = require('jsonwebtoken');
const config = require("config");
require('dotenv').config();
const { createToken } = require('../authentication/AuthenticationService');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose')

jest.mock('../user/UserService');
jest.mock('jsonwebtoken');
jest.mock('config');

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

describe('createToken', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call userService.authenticate with content', () => {
        const content = {
            username: 'exampleUser',
            password: 'examplePassword'
        };
        const user = {
            userID: 'testuser',
            isAdministrator: true
        };

        const callback = jest.fn();

        userService.authenticate.mockImplementation((content, cb) => {
            cb(null, user);
        });

        createToken(content, callback);

        expect(userService.authenticate).toHaveBeenCalledWith(content, expect.any(Function));
    });

    it('should call callback with error if authentication fails', () => {
        const content = {
            username: 'exampleUser',
            password: 'examplePassword'
        };
        const error = new Error('Authentication failed');
        const callback = jest.fn();

        userService.authenticate.mockImplementation((content, cb) => {
            cb(error, null);
        });

        createToken(content, callback);

        expect(callback).toHaveBeenCalledWith(error, null);
    });

    it('should log token creation for user', () => {
        const content = {
            username: 'exampleUser',
            password: 'examplePassword'
        };
        const user = {
            userID: 'testuser',
            isAdministrator: true
        };

        const token = 'generated_token';
        const expiresAt = '1h';
        const privateKey = 'private_key';

        const callback = jest.fn();

        userService.authenticate.mockImplementation((content, cb) => {
            cb(null, user);
        });

        config.get.mockImplementation((key) => {
            if (key === 'session.timeout') return expiresAt;
            if (key === 'session.tokenKey') return privateKey;
        });

        jwt.sign.mockReturnValue(token);

        createToken(content, callback);
    });

    it('should call callback with error if userService.authenticate returns no user', () => {
        const content = {
            username: 'exampleUser',
            password: 'examplePassword'
        };
        const callback = jest.fn();

        userService.authenticate.mockImplementation((content, cb) => {
            cb(null, null);
        });

        createToken(content, callback);

        expect(callback).toHaveBeenCalledWith(null, null);
    });

    it('should call callback with error if userService.authenticate returns an error', () => {
        const content = {
            username: 'exampleUser',
            password: 'examplePassword'
        };
        const error = new Error('Authentication error');
        const callback = jest.fn();

        userService.authenticate.mockImplementation((content, cb) => {
            cb(error, null);
        });

        createToken(content, callback);

        expect(callback).toHaveBeenCalledWith(error, null);
    });
});
