var express = require('express')
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var cookie = require("cookie");
var path = require('path')
var port = process.env.PORT || 3000;


app.use(express.static(path.join(__dirname, '/client')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    var cookief = socket.handshake.headers.cookie ? socket.handshake.headers.cookie : '';
    var cookies = cookie.parse(cookief);
    if (!cookies.userID) {
        socket.emit('username', addUser(socket.id))
    } else {
        socket.emit('username', restoreName(cookies.userID, socket.id))
    }

    socket.emit('all messages', messages);
    io.emit('update users', users.filter(user => user.status === 'active').map(user => user.username));

    socket.on('chat message', (msg) => {
        processMessage(msg, socket)
    });
    socket.on('disconnect', () => {
        removeUser(socket.id);
        io.emit('update users', users.filter(user => user.status === 'active').map(user => user.username));
    });
});

http.listen(port, () => {
    console.log(`listening on *:${port}`);
});

let userNo = 1;

const addUser = (id) => {
    userID = { id: id, username: "User" + userNo, colour: '000000', status: 'active' }
    userNo += 1;
    users.push(userID);
    return userID;
}

const removeUser = (id) => {
    const index = users.findIndex(user => user.id === id);
    if (index !== -1) {
        users[index].status = 'inactive';
    }
}

const processMessage = (msg, socket) => {

    if (msg.trim().startsWith('/name ')) {
        changeUserName(msg, socket);
        return;
    }
    if (msg.trim().startsWith('/color ') || msg.startsWith('/colour ')) {
        changeUserColour(msg, socket);
        return;
    }
    if (msg.trim().startsWith('/')) {
        const parts = msg.trim().split(" ");
        const command = parts[0];
        socket.emit('problem', `'${command}' is an invalid command. Try '/name newName' or '/colour RRGGBB'.`);
        return;
    }

    const date = new Date();
    const timestamp = pad(date.getHours()) + ':' + pad(date.getMinutes());

    const user = users.find(user => user.id === socket.id);
    const username = user.username;
    const colour = user.colour;
    const id = user.id;

    processed = replaceEmojis(msg);

    message = {
        username,
        id,
        timestamp,
        message: processed,
        colour
    };
    messages.push(message);
    if (messages.length > 200) {
        console.log("more than 200: ");
        console.log("oldest message being removed: " + messages[0].message);
        messages = messages.slice(1)
        console.log("new length: " + messages.length);
        console.log("new oldest:" + messages[0].message);
    }
    io.emit('chat message', message);
}

function pad(n) {
    return ('00' + n).substr(-2);
}

const changeUserName = (msg, socket) => {
    let newName = msg.trim().substring(6);
    if (users.filter(user => user.status === 'active').map(user => user.username).includes(newName)) {
        socket.emit('problem', `Sorry, the name '${newName}' is aleady taken!`);
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
    let colour = msg.trim().substring(7);
    colour = colour.trim();
    var hexTest = /[0-9A-F]{6}$/i;
    if (hexTest.test(colour)) {
        const index = users.findIndex(user => user.id === socket.id);
        const userName = users[index].username;
        users[index].colour = colour;
        messages = messages.map(msg => msg.username === userName ? { ...msg, colour: colour } : msg)

        io.emit('all messages', messages);
        io.emit('update users', users.map(user => user.username));
    } else {
        socket.emit('problem', `Sorry, '${colour}' is an invalid hexadecimal string. Please enter color in RRGGBB format.`);
    }
    return;
}

const restoreName = (oldId, id) => {
    const index = users.findIndex(user => user.id === oldId);

    if (index !== -1) {
        const oldName = users[index].username;
        if (users.filter(user => user.id !== oldId).map(user => user.username).includes(oldName)) {
            users = users.filter(user => user.id !== oldId);
            newId = addUser(id);
            messages = messages.map(msg => msg.id === oldId ? { ...msg, id: id, username: newId.username } : msg)
            return newId;
        } else {
            users[index].id = id;
            users[index].status = 'active'
            messages = messages.map(msg => msg.id === oldId ? { ...msg, id: id } : msg)
            return users[index];
        }
    } else {
        return addUser(id);
    }
}

const replaceEmojis = (msg) => {
    let updated = msg.replace(':)', '&#x1F60A');
    updated = updated.replace('(:', '&#x1F60A');

    updated = updated.replace(':(', '&#x1F641');
    updated = updated.replace('):', '&#x1F641');

    updated = updated.replace(':o', '&#x1F632');
    updated = updated.replace('o:', '&#x1F632');

    updated = updated.replace(":'(", '&#x1F622');
    updated = updated.replace(")':", '&#x1F622');

    updated = updated.replace(";)", '&#x1F609');
    updated = updated.replace("(;", '&#x1F609');

    updated = updated.replace(":D", '&#x1F600');
    updated = updated.replace("D:", '&#x1F626');

    updated = updated.replace(":P", '&#x1F61B');
    updated = updated.replace(":p", '&#x1F61B');

    return updated;
}

messages = []
users = []