const mongoose = require('mongoose');
const UserService = require('../user/UserService');
const User = require('../user/UserModel');
require('dotenv').config();

describe('User Service Integration Test', () => {
  beforeAll(async () => {
    const ConnectionString = process.env.DATABASE_URL; // MongoDB-Verbindungs-URI inklusive Datenbankname

    // Verbindung zur MongoDB herstellen
    await mongoose.connect(ConnectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Verbindung zur MongoDB schließen
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Vor jedem Testfall: Testdaten in die Datenbank einfügen oder Vorbereitungen treffen
    await User.deleteMany(); // Vorhandene Benutzerdaten löschen

    // Beispiel: Einen Benutzer in die Datenbank einfügen
    const newUser = {
      userID: 'existinguser',
      password: 'password',
      email: 'existing@example.com',
    };
    await User.create(newUser);
  });

  afterEach(async () => {
    // Nach jedem Testfall: Datenbank aufräumen oder zurücksetzen
    await User.deleteMany(); // Alle Benutzerdaten löschen
  });

  it('should create a user and return a subset of user data', async () => {
    const newUser = {
      userID: 'testuser',
      password: 'password',
      email: 'test@example.com',
      // profilePicture: 'picture.png',
      isVerified: true,
      isAdministrator: false,
    };

    const createdUser = await UserService.createUser(newUser);

    expect(createdUser.userID).toEqual(newUser.userID);
    expect(createdUser.email).toEqual(newUser.email);
    // expect(createdUser.profilePicture).toEqual(newUser.profilePicture);
    expect(createdUser.isVerified).toEqual(newUser.isVerified);
    expect(createdUser.isAdministrator).toEqual(newUser.isAdministrator);
  });

});
