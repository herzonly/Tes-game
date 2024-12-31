
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;
let waitingPlayers = [];
let playerCount = 0;

// Serve static HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

io.on('connection', (socket) => {
    playerCount++;
    io.emit('playerCount', playerCount);

    socket.on('disconnect', () => {
        playerCount--;
        waitingPlayers = waitingPlayers.filter(id => id !== socket.id);
        io.emit('playerCount', playerCount);
    });

    socket.on('findMatch', () => {
        if (waitingPlayers.length > 0) {
            const partnerId = waitingPlayers.shift();
            const room = `room_${socket.id}_${partnerId}`;
            const isBot = Math.random() < 0.3; // 30% chance of bot partner

            socket.join(room);
            io.sockets.sockets.get(partnerId)?.join(room);

            io.to(room).emit('matchFound', {
                room: room,
                partnerId: partnerId,
                isBot: isBot
            });
        } else {
            waitingPlayers.push(socket.id);
        }
    });

    socket.on('message', (data) => {
        io.to(data.room).emit('message', {
            message: data.message,
            isBot: false
        });
    });

    socket.on('gameEnd', (data) => {
        socket.leave(data.room);
    });
});

http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
