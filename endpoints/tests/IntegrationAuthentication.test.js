const { createToken } = require('../authentication/AuthenticationService');
const userService = require('../user/UserService');

describe('createToken integration test', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create a token if authentication is successful', (done) => {
    const content = {
      username: 'testuser',
      password: 'password'
    };
    const user = {
      userID: 'testuser',
      isAdministrator: true
    };

    userService.authenticate(content, (error, authenticatedUser) => {
      expect(error).toBeNull();
      expect(authenticatedUser).toEqual(user);

      createToken(content, (tokenError, token) => {
        expect(tokenError).toBeNull();
        expect(typeof token).toBe('string');
        done();
      });
    });
  }, 10000);

//   it('should return an error if authentication fails', (done) => {
//     const content = {
//       username: 'exampleUser',
//       password: 'examplePassword'
//     };
//     const error = new Error('Authentication failed');

//     userService.authenticate(content, (authenticateError) => {
//       expect(authenticateError).toEqual(error);

//       createToken(content, (tokenError, token) => {
//         expect(tokenError).toEqual(error);
//         expect(token).toBeNull();
//         done();
//       });
//     });
//   });
});
