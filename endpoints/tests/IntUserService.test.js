const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const userService = require('../user/UserService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true });
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

it('User anlegen', async () => {
  const user = {
    userID: 'testuser',
    password: 'password',
    isAdministrator: true
  };

  let test;
  try {
    test = await userService.createUser(user);
  } catch (error) {
    test = null;
  } finally {
    console.log(test)
    expect(test).toBeTruthy();
  }
});

it('authen ohne anlegen', async () => {
  const user = {
    userID: 'testuser',
    password: 'password'
  }

  await userService.authenticate(user, (error, token) => {
    expect(error).not.toBe(null);
    expect(token).toBeFalsy();
  })
});

it('authen mit anlegen', async () => {
  const user = {
    userID: 'testuser',
    password: 'password'
  }


  try {
    await userService.createUser(user);
  } catch (error) {
  } 

  await userService.authenticate({username : "testuser", password : "password"}, (error, token) => {
    expect(error).toBe(null);
    expect(token).toBeTruthy();
  })
});