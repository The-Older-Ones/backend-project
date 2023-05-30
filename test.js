const io = require('socket.io-client');

const socket = io ('http://127.0.0.1:80');

socket.io('connect', () => {
    console.log('Connected to server');
})


// TODO - to test socket.io 