const { createToken } = require('../authentication/AuthenticationService');
const userService = require('../user/UserService');
const User = require('../user/UserModel');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
// const { Mockgoose } = require('mongoose-mockgoose');

let mongoServer
let mongoUri;

// const mockgoose = new Mockgoose(mongoose);

describe('createToken integration test', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = await mongoServer.getUri();

    // Verbindung zur MongoDB herstellen
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // await mockgoose.helper.reset();
    // Vor jedem Testfall: Testdaten in die Datenbank einfügen oder Vorbereitungen treffen
    // Beispiel: Einen Benutzer in die Datenbank einfügen
    await User.deleteMany();
    const newUser = {
      userID: 'existinguser',
      password: 'password',
      email: 'existing@example.com',
    };
    await User.create(newUser);
  });

  afterEach(async () => {
    // await User.deleteMany();
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

      // Compare the subset with the expected user object
      expect({ isAdministrator, userID }).toEqual(user);

      createToken(content, (tokenError, token) => {
        expect(tokenError).toBeNull();
        expect(typeof token).toBe('string');
        done();
      });
    });
  });
    it('should return an error if authentication fails', (done) => {
      const content = {
        username: 'exampleUser',
        password: 'examplePassword'
      };
      const error = new Error('Authentication failed');

      userService.authenticate(content, (authenticateError) => {
        expect(authenticateError).toEqual(error);

        createToken(content, (tokenError, token) => {
          expect(tokenError).toEqual(error);
          expect(token).toBeNull();
          done();
        });
      });
    });


  // it('should throw an error if userService.authenticate returns an error', () => {
  //     const content = {
  //         username: 'exampleUser',
  //         password: 'examplePassword'
  //     };
  //     const error = new Error('Authentication error');

  //     userService.authenticate.mockImplementation((content, cb) => {
  //         cb(error, null);
  //     });

  //     expect(() => {
  //         createToken(content);
  //     }).toThrowError(error);
  // });
});
