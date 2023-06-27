const userService = require('../user/UserService');
const jwt = require('jsonwebtoken');
const config = require("config");
const { createToken } = require('../authentication/AuthenticationService');

jest.mock('../user/UserService');
jest.mock('jsonwebtoken');
jest.mock('config');

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

    it('should call callback with token if authentication is successful', () => {
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

        expect(jwt.sign).toHaveBeenCalledWith(
            { "user": user.userID, "isAdministrator": user.isAdministrator },
            privateKey,
            { expiresIn: expiresAt, algorithm: "HS256" }
        );
        expect(callback).toHaveBeenCalledWith(null, token);
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
