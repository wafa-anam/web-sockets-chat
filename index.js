var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.emit('all messages', messages);
    socket.emit('username', addUser(socket.id))
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
    const timestamp = date.getHours() + ':' + date.getMinutes();

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

const changeUserName = (msg, socket) => {
    let newName = msg.substring(5);
    if (users.map(user => user.username).includes(newName)) {
        console.log('Name exists, handle this soon');
    } else {
        const index = users.findIndex(user => user.id === socket.id);
        const oldName = users[index].username;
        users[index].username = newName;
        messages = messages.map(msg => msg.username === oldName ? { ...msg, username: newName } : msg)

        io.emit('all messages', messages);
        socket.emit('username', users[index]);
        io.emit('update users', users.map(user => user.username));
    }
    return;
}

const changeUserColour = (msg, socket) => {
    let colour = msg.substring(6);
    colour = colour.trimLeft()
    console.log(colour);
    var hexTest = /[0-9A-F]{6}$/i;
    if (hexTest.test(colour)) {
        const index = users.findIndex(user => user.id === socket.id);
        const userName = users[index].username;
        users[index].colour = colour;
        messages = messages.map(msg => msg.username === userName ? { ...msg, colour: colour } : msg)

        io.emit('all messages', messages);
        io.emit('update users', users.map(user => user.username));
    } else {
        console.log("invalid string, handle later", colour);
    }
    return;
}

messages = []
users = []