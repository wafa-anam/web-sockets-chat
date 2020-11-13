var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var cookie = require("cookie");

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    var cookief = socket.handshake.headers.cookie ? socket.handshake.headers.cookie : '';
    var cookies = cookie.parse(cookief);
    if (!cookies.username) {
        socket.emit('username', addUser(socket.id))
    } else {
        socket.emit('username', restoreName(cookies.username, socket.id))
    }

    socket.emit('all messages', messages);
    io.emit('update users', users.map(user => user.username));

    socket.on('chat message', (msg) => {
        processMessage(msg, socket)
    });
    socket.on('disconnect', () => {
        removeUser(socket.id);
        io.emit('update users', users.map(user => user.username));
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

let userNo = 1;

const addUser = (id) => {
    userID = { id: id, username: "User" + userNo, colour: '000000' }
    userNo += 1;
    users.push(userID);
    return userID;
}

const removeUser = (id) => {
    users = users.filter(user => user.id !== id);
}

const processMessage = (msg, socket) => {

    if (msg.startsWith('/name ')) {
        changeUserName(msg, socket);
        return;
    }
    if (msg.startsWith('/color ') || msg.startsWith('/colour ')) {
        changeUserColour(msg, socket);
        return;
    }

    const date = new Date();
    const timestamp = pad(date.getHours()) + ':' + pad(date.getMinutes());

    const user = users.find(user => user.id === socket.id);
    const username = user.username;
    const colour = user.colour;
    message = {
        username,
        timestamp,
        message: msg,
        colour
    };
    messages.push(message);
    io.emit('chat message', message);
}

function pad(n) {
    return ('00' + n).substr(-2);
}

const changeUserName = (msg, socket) => {
    let newName = msg.substring(6);
    if (users.map(user => user.username).includes(newName)) {
        socket.emit('problem', `Sorry, the name "${newName}" is aleady taken!`);
    } else {
        const index = users.findIndex(user => user.id === socket.id);
        const oldName = users[index].username;
        users[index].username = newName;
        messages = messages.map(msg => msg.username === oldName ? { ...msg, username: newName } : msg)

        socket.emit('username', users[index]);
        io.emit('update users', users.map(user => user.username));
        io.emit('all messages', messages);
    }
    return;
}

const changeUserColour = (msg, socket) => {
    let colour = msg.substring(7);
    colour = colour.trimLeft()
    var hexTest = /[0-9A-F]{6}$/i;
    if (hexTest.test(colour)) {
        const index = users.findIndex(user => user.id === socket.id);
        const userName = users[index].username;
        users[index].colour = colour;
        messages = messages.map(msg => msg.username === userName ? { ...msg, colour: colour } : msg)

        io.emit('all messages', messages);
        io.emit('update users', users.map(user => user.username));
    } else {
        socket.emit('problem', `Sorry, "${colour}" is an invalid hexadecimal string. Please enter color in RRGGBB format.`);
    }
    return;
}

const restoreName = (oldName, id) => {
    if (users.map(user => user.username).includes(oldName)) {
        return addUser(id);
    } else {
        userID = { id: id, username: oldName, colour: '000000' }
        users.push(userID);
        return userID;
    }
}

messages = []
users = []