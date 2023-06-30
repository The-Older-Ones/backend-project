require('dotenv').config();
const GameService = require("./GameServices")
const jwt = require('jsonwebtoken');
const config = require("config");
const logger = require("../../logger");

const lobbys = {};
const position = {};

async function createGame(io, socket, data) {
    logger.debug("methode : createGame called")

    const guard = guardian(data, ["playerName"]);
    if (guard) {
        socket.emit("error", guard);
        return;
    }

    const hostName = data.playerName;
    const token = data.token;

    let verify = authenticated(token);
    if (verify.error) {
        logger.warn(verify.error + " token : " + token);
        socket.emit("error", { message: verify.error, type: "warning" })
        verify = false;
    }

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeCharacter = config.game.codeSize;
    let code = "";
    let checkedGameID = false;

    do {
        for (let i = 0; i < codeCharacter; i++) {
            const randomCode = Math.floor(Math.random() * characters.length);
            code += characters[randomCode];
        }
        if (!lobbys[code]) {
            checkedGameID = true;
        }

    } while (!checkedGameID)

    if (position[socket.id]) {
        disconnect(io, socket);
    }
    try {
        const list = await GameService.getCategoryList();

        position[socket.id] = code;

        lobbys[code] = {
            player: {
                [socket.id]: {
                    socket: socket,
                    name: hostName,
                    auth: verify,
                    points: 0
                }
            },
            list: list,
            locked: false,
            host: socket.id,
            playerNumber: config.game.defaultPlayerNumber,
            rounds: config.game.defaultRounds,
            extension: false
        };

        const settings = {
            list: list,
            playerNumber: lobbys[code].playerNumber,
            rounds: lobbys[code].rounds
        }
        socket.emit("gameCreated", { gameId: code, socketId: socket.id, hostName: hostName, settings: settings });
        socket.join(code);
        logger.info(`Game created successfully for Lobby :${code}`);
    } catch (error) {
        logger.error(error.message);
        socket.emit("error", { message: error.message, type: "critical" })
    }
    logger.debug("exit methode : createGame")
}

function disconnect(io, socket) {
    logger.debug("methode : disconnect called")

    const room = position[socket.id];

    if (!room) {
        logger.info("Player left Game without enter a Lobby");
        return;
    }

    delete lobbys[room].player[socket.id];

    logger.info("Player left Lobby " + room);

    const checkEmptiness = Object.keys(lobbys[room].player).length;

    if (checkEmptiness === 0) {
        delete lobbys[room];
        delete position[socket.id];
        logger.info("Closed Lobby: " + room);
        return;
    }

    if (checkEmptiness === 1 && lobbys[room].locked) {
        reset(io, room);
    }

    if (socket.id == lobbys[room].host) {
        updateHost(io, socket)
    }

    delete position[socket.id];

    io.to(room).emit("playerLeft", { playerId: socket.id });

    if (check(room) && lobbys[room].question) {
        evaluation(io, room);
    }
    logger.debug("exit methode : disconnect")

}

function authenticated(token) {
    if (!token) {
        return false;
    }
    let verify;
    const privateKey = process.env.TOKEN_KEY;
    jwt.verify(token, privateKey, { algorithms: "HS256" }, function (err, result) {
        if (result) {
            verify = true;
        } else {
            verify = { error: "Token invalid" }
        }
    });
    return verify;
}

function joinLobby(io, socket, data) {
    logger.debug("methode : joinLobby called");

    const guard = guardian(data, ["gameId", "playerName"]);
    if (guard) {
        socket.emit("error", guard);
        return;
    }

    const lobbyId = data.gameId;
    const playerName = data.playerName;
    const token = data.token;

    if (typeof lobbys[lobbyId] === 'undefined' || lobbys[lobbyId].locked === true) {
        logger.error("Lobby is not available + " + lobbyId);
        socket.emit('error', { message: 'Lobby is not available', type: "critical" });
        return;
    }

    const playersInLobby = Object.keys(lobbys[lobbyId].player);
    
    if (playersInLobby.includes(socket.id)) {
        logger.warn("Player already in Lobby: " + lobbyId);
        socket.emit("error", { message: "Player already in Lobby", type: "warning" })
        return;
    }

    const playerNumberInLobby = playersInLobby.length;
    const lobbyMaxPlayer = lobbys[lobbyId].player.playerNumber;


    if (playerNumberInLobby == lobbyMaxPlayer) {
        logger.error(`Lobby is full ${playerNumberInLobby} : ${lobbyMaxPlayer}`);
        socket.emit("error", { message: "Lobby is full", type: "critical" })
        return;
    }

    let verify = authenticated(token);
    if (verify.error) {
        logger.error(verify.error + " token : " + token);
        socket.emit("error", { message: verify.error, type: "warning" })
        verify = false;
    }

    if (position[socket.id]) {
        disconnect(io, socket);
    }

    const lobbyMember = [];
    Object.keys(lobbys[lobbyId].player).forEach((socketId) => {
        lobbyMember.push({ socketId: socketId, playerName: lobbys[lobbyId].player[socketId].name });
    });

    lobbyMember.push({ socketId: socket.id, playerName: playerName });

    position[socket.id] = lobbyId;

    lobbys[lobbyId].player[socket.id] = {
        socket: socket,
        name: playerName,
        auth: verify,
        points: 0
    }

    const settings = {
        lobbyMember: lobbyMember,
        playerNumber: lobbys[lobbyId].playerNumber,
        rounds: lobbys[lobbyId].rounds,
        list: lobbys[lobbyId].list
    }

    socket.join(lobbyId);
    socket.emit('joinedLobby', { gameId: lobbyId, socketId: socket.id, settings: settings });
    socket.to(lobbyId).emit("playerJoined", { playerId: socket.id, playerName: playerName });
    logger.info(`Player joined Lobby successfully : ${lobbyId}`)
    logger.debug("exit methode : joinLobby")
}

function updateHost(io, socket, data) {
    logger.debug("methode : updateHost called")

    const room = position[socket.id];

    if (!room) {
        logger.error(`Player not listed in any Lobby`)
        socket.emit('error', { message: 'Not a player of this lobby', type: "critical" })
        return;
    }

    let newHost;
    if (data) {
        newHost = data.newHost ? data.newHost : Object.keys(lobbys[room].player)[0];
    } else {
        newHost = Object.keys(lobbys[room].player)[0]
    }

    const currentHost = lobbys[room].host

    if (currentHost != socket.id) {
        logger.error(`No permission to change the host. Requester : ${socket.id} , Host : ${currentHost}`)
        socket.emit("error", { message: "No permission to change the host", type: "critical" })
        return;
    }

    if (currentHost == newHost) {
        logger.warn(`Already host. Requester : ${socket.id} , Host : ${currentHost}`)
        socket.emit("error", { message: "Already host", type: "warning" });
        return;
    }

    const playerInLobby = Object.keys(lobbys[room].player).filter((id) => id == newHost).length == 1;

    if (!playerInLobby) {
        logger.error(`Selected player is not in the lobby. Requested Host : ${newHost} , Lobbymember : ${playerInLobby}`);
        socket.emit("error", { message: "Selected player is not in the lobby", type: "critical" });
        return;
    }

    lobbys[room].host = newHost;
    logger.info(`Set new Host in Lobby :${room} successfully`);

    // Feature : User eigene Fragen.  Nochmalige DB anfrage für list + ablegen in lobbys objekt,

    io.to(room).emit("updatedHost", { newHost: newHost });
    logger.debug("exit methode : updateHost")
}

function setRounds(io, socket, data) {
    logger.debug("methode : setRounds called")

    const guard = guardian(data);
    if (guard) {
        socket.emit("error", guard);
        return;
    }

    const room = position[socket.id];

    if (!room || lobbys[room].host != socket.id) {
        logger.error(`Not Authorized to change number of rounds. Player`)
        socket.emit("error", { message: "Not Authorized to change number of rounds", type: "critical" });
        return;
    }

    if (!data.rounds) {
        logger.error(`data.rounds is not set. Value : ${data.rounds}`);
        socket.emit("error", { message: `data.rounds is not set. Number of rounds are unchanged. Rounds : ${lobbys[room].rounds}`, type: "critical" });
        return;
    }

    let rounds = parseInt(data.rounds);

    if (!rounds) {
        logger.error(`data.rounds is NaN. Value : ${data.rounds}`);
        socket.emit("error", { message: `data.rounds is NaN. Number of rounds are unchanged. Rounds : ${lobbys[room].rounds}`, type: "critical" });
        return;
    }

    if (lobbys[room].locked) {
        logger.error(`Game is already locked. No changes allowed. Value of locked : ${lobbys[room].locked}`)
        socket.emit("error", { message: "Game is already locked. No changes allowed", type: "critical" })
        return;
    }

    if (rounds == lobbys[room].rounds) {
        logger.error(`Number of rounds already set. New Value : ${rounds} , Actual Value : ${rounds}`)
        socket.emit("error", { message: `Number of rounds already set to ${rounds}`, type: "warning" });
        return;
    }

    const minRounds = config.game.minRounds;
    const maxRounds = config.game.maxRounds;

    if (rounds < minRounds) {
        logger.warn(`Selected number of rounds (${rounds}) too low. Set to minimum Rounds : ${minRounds}`)
        socket.emit("error", { message: `Selected number of rounds too low. Set to minimum Rounds : ${minRounds}`, type: "warning" });
        rounds = minRounds;
    }

    if (rounds > maxRounds) {
        logger.warn(`Selected number of rounds (${rounds}) too hight. Set to maximum Rounds : ${minRounds}`)
        socket.emit("error", { message: `Selected number of rounds too high. Set to maximum Rounds : ${maxRounds}`, type: "warning" });
        rounds = maxRounds;
    }

    lobbys[room].rounds = rounds;
    logger.info(`Set new amount of rounds successfully to ${rounds}`)

    io.to(room).emit("updatedRounds", { rounds: rounds })
    logger.debug("exit methode : setRounds")
}

function setPlayerNumber(io, socket, data) {
    logger.debug("methode : setPlayerNumber called")

    const guard = guardian(data);
    if (guard) {
        socket.emit("error", guard);
        return;
    }

    const room = position[socket.id];

    if (!room || lobbys[room].host != socket.id) {
        logger.error(`Not Authorized to change number of rounds.`)
        socket.emit("error", { message: "Not Authorized to change number of rounds", type: "critical" });
        return;
    }

    if (!data.playerNumber) {
        logger.error(`data.playerNumber is not set. Value : ${data.playerNumber}`)
        socket.emit("error", { message: `data.playerNumber is not set. Number of players are unchanged. Player : ${lobbys[room].playerNumber}`, type: "critical" });
        return;
    }

    let playerNumber = parseInt(data.playerNumber);

    if (!playerNumber) {
        logger.error(`data.playerNumber is NaN. Value : ${playerNumber}`);
        socket.emit("error", { message: `data.playerNumber is NaN. Number of players are unchanged. Player : ${lobbys[room].playerNumber}`, type: "critical" });
        return;
    }

    if (lobbys[room].locked) {
        logger.error(`Game is already locked. Locked : ${lobbys[room].locked}`);
        socket.emit("error", { message: "Game is already locked. No changes allowed", type: "critical" })
        return;
    }
    const playersInLobby = Object.keys(lobbys[room].player).length;
    if (playerNumber < playersInLobby) {
        logger.error(`Player number can't be changed to a number below to the players in the lobby. Value : ${playerNumber} , Current : ${playersInLobby}`);
        socket.emit("error", { message: "Player number can't be changed to a number below to the players in the lobby", type: "critical" })
        return;
    }

    if (playerNumber == lobbys[room].playerNumber) {
        logger.warn(`Number of player already set to current. Value : ${playerNumber} , Current : ${lobbys[room].playerNumber}`);
        socket.emit("error", { message: `Number of player already set to ${playerNumber}`, type: "warning" });
        return;
    }

    const minPlayer = config.game.minPlayerNumber;
    const maxPlayer = config.game.maxPlayerNumber;

    if (playerNumber < minPlayer) {
        logger.warn(`Selected number of player (${playerNumber}) too low. Set to minimum Rounds : ${minPlayer}`)
        socket.emit("error", { message: `Selected number of player too low. Set to minimum Player : ${minPlayer}`, type: "warning" });
        playerNumber = minPlayer;
    }

    if (playerNumber > maxPlayer) {
        logger.warn(`Selected number of player (${playerNumber}) too low. Set to minimum Rounds : ${maxPlayer}`)
        socket.emit("error", { message: `Selected number of player too hight. Set to maximum Player : ${maxPlayer}`, type: "warning" });
        playerNumber = maxPlayer;
    }

    lobbys[room].playerNumber = playerNumber;
    logger.info(`Set new amount of player successfully to ${playerNumber}`)
    io.to(room).emit("updatedPlayerNumber", { playerNumber: playerNumber })
    logger.debug("exit methode : setPlayerNumber")
}

function setExtension(io, socket, data) {
    logger.debug("methode : setExtension called")

    const guard = guardian(data);
    if (guard) {
        socket.emit("error", guard);
        return;
    }

    const room = position[socket.id];

    if (!room || lobbys[room].host != socket.id) {
        logger.error("Not Authorized to activate extension")
        socket.emit("error", { message: "Not Authorized to activate extension", type: "critical" });
        return;
    }

    if (lobbys[room].locked) {
        logger.error(`Game already started. Locked : ${lobbys[room].locked}`);
        socket.emit('error', { message: 'Game already started', type: "critical" })
        return;
    }

    lobbys[room].extension = data.extension ? true : false;
    logger.info(`Set extension successfully to ${lobbys[room].extension}`)

    io.to(room).emit("updatedExtension", { extension: lobbys[room].extension });
    logger.debug("exit methode : setExtension")
}

async function startGame(io, socket, data) {
    logger.debug("methode : startGame called")

    const guard = guardian(data);
    if (guard) {
        socket.emit("error", guard);
        return;
    }

    try {
        const room = position[socket.id];
        if (!room) {
            logger.error(`Lobby is not available`)
            socket.emit('error', { message: 'Lobby is not available', type: "critical" })
            return;
        }

        if (lobbys[room].host != socket.id) {
            logger.error(`No permission to start the game. Requester : ${socket.id} , Host : ${lobbys[room].host}`)
            socket.emit('error', { message: 'No permission to start the game', type: "critical" })
            return;
        }

        if (lobbys[room].locked) {
            logger.error('Game already started. Locked : lobbys[room].locked')
            socket.emit('error', { message: 'Game already started', type: "critical" })
            return;
        }

        const playersInLobby = Object.keys(lobbys[room].player).length
        const minPlayerNumber = config.game.minPlayerNumber;

        if (playersInLobby < minPlayerNumber) {
            logger.error(`Less than the minimum allowed Player. Current : ${playersInLobby} , Minimum : ${minPlayerNumber}`)
            socket.emit('error', { message: `Less than the minimum allowed Player. Minimum allowed Player are ${minPlayerNumber}`, type: "critical" })
            return;
        }

        const list = data.list;

        if (!list || !Array.isArray(list) || list.length == 0) {
            logger.error(`data.list is either not stored, an array or is an empty array. Value : ${list}`)
            socket.emit('error', { message: 'data.list is either not stored or it is not an array', type: "critical" })
            return;
        }

        await GameService.checkCategory(list);

        lobbys[room].locked = true;
        logger.info(`Game ${room} successfully started`)

        io.to(room).emit("startedGame", { list: list });

    } catch (error) {
        logger.error(error.message);
        socket.emit("error", { message: error.message, type: "critical" });
    }
    logger.debug("exit methode : startGame")
}

async function giveQuestion(io, socket, data) {
    logger.debug("methode : giveQuestion called")

    const guard = guardian(data);
    if (guard) {
        socket.emit("error", guard);
        return;
    }

    try {
        // TODO Feature Training -> auch möglich wenn valider Token mitgeliefert wird | rounds = 0 behandlung
        const room = position[socket.id];

        if (!room) {
            logger.error(`Lobby is not available`)
            socket.emit('error', { message: 'Lobby is not available', type: "critical" })
            return;
        }

        if (!lobbys[room].locked) {
            logger.error('Game already started. Locked : lobbys[room].locked')
            socket.emit('error', { message: 'Lobby is not locked', type: "critical" })
            return;
        }

        const category = data.category;
        const difficulty = data.difficulty;

        if (!category || !difficulty) {
            const problem = !category ? "category" : "difficulty"
            logger.error(`${problem} is not given. Category value : ${category} , Difficulty value : ${difficulty}`)
            socket.emit('error', { message: `${problem} is not given`, type: "critical" });
            return;
        }

        const question = await GameService.getRandomQuestion(category, difficulty);

        lobbys[room].question = question;

        const userQuestion = {
            category: question.category,
            difficulty: question.difficulty,
            question: question.question,
            allAnswers: question.allAnswers,
        };

        logger.info(`Generate question successfully`)
        io.to(room).emit("givenQuestion", userQuestion);

    } catch (error) {
        logger.error(error.message)
        socket.emit("error", { message: error.message, type: "critical" });
    }
    logger.debug("exit methode : giveQuestion")
}

function setAnswer(io, socket, data) {
    logger.debug("methode : setAnswer called")

    const guard = guardian(data);
    if (guard) {
        socket.emit("error", guard);
        return;
    }

    const room = position[socket.id];

    if (!room) {
        logger.error(`Lobby is not available`)
        socket.emit('error', { message: 'Lobby is not available', type: "critical" })
        return;
    }

    if (!lobbys[room].locked) {
        logger.error(`Game not started. Locked : ${lobbys[room].locked}`)
        socket.emit('error', { message: 'Lobby is not locked', type: "critical" })
        return;
    }

    if (!lobbys[room].question) {
        logger.error(`No Question saved. Question : ${lobbys[room].question}`)
        socket.emit('error', { message: 'No question choose', type: "critical" })
        return;
    }

    if (!data.answer) {
        logger.error(`data.answer is not set. Value : ${data.answer}`)
        socket.emit('error', { message: 'data.answer is not set', type: "critical" })
        return;
    }

    if (lobbys[room].player[socket.id].answer) {
        const origAnswer = lobbys[room].player[socket.id].answer
        logger.error(`Already gave an answer. Current :${origAnswer} , Value : ${lobbys[room].player[socket.id].answer}`)
        socket.emit('error', { message: `Already gave an answer: ${origAnswer}`, type: "critical" })
        return;
    }

    lobbys[room].player[socket.id].answer = data.answer.toString();
    logger.info(`Answer successfully set to ${data.answer.toString()}`);

    if (check(room)) {
        evaluation(io, room);
    } else {
        io.to(room).emit("playerAnswered", { playerId: socket.id })
    }
    logger.debug("exit methode : setAnswer")
}

function check(room) {
    const players = Object.keys(lobbys[room].player);
    let checked = true;
    players.forEach(playerId => {
        if (!lobbys[room].player[playerId].answer) {
            checked = false;
            return;
        }
    })
    return checked;
}

function reset(io, room) {
    logger.debug("methode : reset called")
    lobbys[room].locked = false;
    lobbys[room].rounds = config.game.defaultRounds;

    const players = Object.keys(lobbys[room].player);
    players.forEach(playerId => {
        lobbys[room].player[playerId].points = 0;
        if (lobbys[room].player[playerId].answer) {
            delete lobbys[room].player[playerId].answer;
        }
    })

    if (lobbys[room].question) {
        delete lobbys[room].question;
    }

    const lobbyMember = [];
    Object.keys(lobbys[room].player).forEach((socketId) => {
        lobbyMember.push({ socketId: socketId, playerName: lobbys[room].player[socketId].name });
    });

    const settings = {
        rounds: lobbys[room].rounds,
        playerNumber: lobbys[room].playerNumber,
        lobbyMember: lobbyMember,
        extension: false
    }

    io.to(room).emit("resetLobby", { settings: settings })
    logger.debug("exit methode : reset")
}

function evaluation(io, room) {
    logger.debug("methode : evaluation called")
    const lobbyRoom = lobbys[room];

    const result = Object.entries(lobbyRoom.player).map(([socketId, properties]) => {
        let query = false;
        if (properties.answer == lobbyRoom.question.correct_answer) {
            properties.points += parseInt(lobbyRoom.question.difficulty);
            query = true;
        }
        return (
            {
                socketId: socketId,
                points: properties.points,
                answer: query
            }
        )
    }).sort((a, b) => {
        const pointsA = Object.values(a)[0].points;
        const pointsB = Object.values(b)[0].points;
        return pointsB - pointsA;
    });
    logger.info(`Leaderboard successfully created for ${room}`)

    lobbyRoom.rounds--;

    if (lobbyRoom.rounds == 0 && !lobbyRoom.extension) {
        logger.info(`Game : ${room} successfully finished`)
        io.to(room).emit("gameFinished", { leaderboard: result });
        return;
    };

    const first = result[0].points;
    const second = result[1].points;

    if (lobbyRoom.rounds == 0 && lobbyRoom.extension && first == second) {
        lobbyRoom.rounds = config.game.maxExtension;
        lobbyRoom.extension = false;
        logger.info(`Game : ${room} successfully extend.`)
        io.to(room).emit("gameExtended");
    };

    const status = {
        rightAnswer: lobbyRoom.question.correct_answer,
        roundsLeft: lobbyRoom.rounds,
        leaderboard: result
    }

    delete lobbyRoom.question;
    Object.keys(lobbyRoom.player).forEach(socketId => {
        delete lobbyRoom.player[socketId].answer;
    });

    logger.info(`Round successfully finished for ${room}`)
    io.to(room).emit("roundFinished", status);
    logger.debug("exit methode : evaluation")
}

function newGame(io, socket) {
    logger.debug("methode : newGame called")
    const room = position[socket.id];

    if (!room || lobbys[room].host != socket.id) {
        logger.error(`Not Authorized to initialize new game. Requester : ${socket.id} , Host : ${currentHost}`)
        socket.emit("error", { message: "Not Authorized to initialize new game", type: "critical" });
        return;
    }

    reset(io, room);
    logger.debug("exit methode : newGame")
}

function lobbySynchro(socket, data) {
    const room = position[socket.id];
    socket.to(room).emit("synchronizedLobby", data)
}

/** Funktion um vorhanden sein der gegebenen daten / parametern zu prüfen.
@param {object} obj - Objekt mit verschiedenen Properties.
@param {String[]} options - Properties die data enthalten soll.
@returns {object | boolean} Sendet im Fehlerfall {message : String , type : "critical"} ansonsten false.
*/
function guardian(obj, options) {
    logger.debug("methode : guardian called");

    if (!obj) {
        logger.error(`data is not set`)
        return { message: "data is not set", type: "critical" };
    }

    let check = false;
    let result = false;

    if (options) {
        for (let i = 0; i < options.length; i++) {
            obj[options[i]] ? true : check = options[i];

            if (check) {
                logger.error(`data.${check} is not set`);
                result = { message: `data.${check} is not set`, type: "critical" };
                break;
            }
        }
    }

    logger.debug("exit methode : guardian");
    return result;
}

module.exports = {
    createGame,
    disconnect,
    joinLobby,
    updateHost,
    setRounds,
    setPlayerNumber,
    startGame,
    giveQuestion,
    setAnswer,
    setExtension,
    newGame,
    lobbySynchro
}