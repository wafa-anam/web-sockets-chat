$(function () {
    var socket = io();
    $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });
    socket.on('chat message', function (msg) {
        $('#messages').append(formatMessageString(msg));
        var messageBody = document.querySelector('#message-div');
        messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
    });
    socket.on('all messages', function (msgs) {
        $('#messages').empty();
        msgs.map(msg => $('#messages').append(formatMessageString(msg)));
        var messageBody = document.querySelector('#message-div');
        messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
    });
    socket.on('username', function (user) {
        $('#username').text(user.username);
        document.cookie = `username=${user.username}`;
        document.cookie = `userID=${user.id}`;
    });
    socket.on('update users', function (users) {
        $('#users').empty();
        updateUsers(users);
    });
    socket.on('problem', function (msg) {
        $('#messages').append(formatErrorString(msg));
        var messageBody = document.querySelector('#message-div');
        messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
    });
});

const updateUsers = (users) => {
    const username = document.cookie
        .split('; ')
        .find(row => row.startsWith('username'))
        .split('=')[1];
    users.map(user => {
        if (user === username) {
            $('#users').append(`<li class='bold'>${user} (you)</li>`)
        } else $('#users').append($('<li>').text(user))
    });
}
const formatMessageString = (msg) => {
    const id = document.cookie
        .split('; ')
        .find(row => row.startsWith('userID'))
        .split('=')[1];
    const className = msg.id === id ? 'class=bold' : '';

    const formattedEl = `
    <li ${className}>
        <span>${msg.timestamp}</span>
        <span style='color:#${msg.colour};'>${msg.username}:</span>
        <span>${msg.message}</span>
    </li>`
    return formattedEl;
}
const formatErrorString = (msg) => {
    const formattedEl = `
    <li>
        <span class='error'>Error: ${msg}</span>
    </li>`
    return formattedEl;
}