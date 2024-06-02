const express = require("express");
const fs = require("fs");
const http = require("http");
const socketIo = require("socket.io");
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true,
    port: 9000
});
app.use('/peerjs', peerServer);
// установка порта
const PORT = 5000;
app.use(cookieParser());
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static("public"));

let rooms = [];
if (fs.existsSync("rooms.json")) {
    rooms = JSON.parse(fs.readFileSync("rooms.json", "utf-8"));
}

app.get('/', (req, res) => {
    res.render('begin.ejs');
});

app.get('/createRoom', (req, res) => {
    res.render('newroom.ejs');
});

app.get('/connectRoom', (req, res) => {
    res.render('conRoom.ejs');
});

app.get('/room=:roomId', (req, res) => {
    res.render('room.ejs');
});
// создание комнаты 
app.post('/createRoom', (req, res) => {
    const roomId = getNewRoomId(rooms);
    const adminToUsers = {
        name: req.body.adminName,
        ID: uuidv4()
    };
    const room = {
        id: roomId,
        users: [adminToUsers],
        local: req.body.local,
        videoLink: req.body.link,
        key: uuidv4(),
        admin: req.body.adminName,
        lastTime: 0,
        messages: []
    };
    rooms.push(room);
    saveRoomsToFile();
    // После создания комнаты устанавливаем куки и затем перенаправляем пользователя
    res.cookie('userID:' + roomId, adminToUsers.ID);
    res.status(200).redirect('/room=' + roomId);
});


// подключение к комнате
app.post('/connectRoom', (req, res) => {
    const roomId = req.body.connectRoomID;
    const roomKey = req.body.key;
    const userName = req.body.userName;
    for (const room of rooms) {
        if (room.id == roomId && room.key == roomKey) {
            const newUser = {
                name: userName,
                ID: uuidv4(),
            };
            room.users.push(newUser);
            res.cookie('userID:' + roomId, newUser.ID);
            saveRoomsToFile();
            res.redirect('/room=' + roomId);
            return;
        }
    }
    res.status(400).send("Invalid room ID or key");
});

app.post('/room=:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const userID = req.body.userID;
    const room = rooms.find(room => room.id == roomId);
    if (room) {
        const user = room.users.find(user => user.ID == userID);
        videoType = getVideoSite(room.videoLink);
        if (user) {
            const roomInfoJson = {
                key: room.key,
                id: room.id,
                adminID: room.users[0].ID,
                videoLink: room.videoLink,
                lastTime: room.lastTime,
                videoType: getVideoSite(room.videoLink),
                local: room.local,
                username: user.name,
                messages: room.messages.slice(0, 50)
            };
            res.send(roomInfoJson);
            return;
        }
    }
    res.status(400).send("Invalid room ID or user ID");
});
app.delete('/exitRoom', (req, res) => {
    const { roomId, userID, userName } = req.body;
    const room = rooms.find(room => room.id == roomId);
    if (room) {
        const userIndex = room.users.findIndex(user => user.ID == userID);
        if (userIndex !== -1) {
            const exitMessage = {
                name: " ",
                system: true,
                text: `Пользователь ${userName} вышел из комнаты`,
            };
            room.messages.push(exitMessage);
            io.to(roomId).emit('chatMessage', exitMessage);
            room.users.splice(userIndex, 1);
            console.log(room.users.length);
            if (room.users.length == 0) {
                const delroomIndex = rooms.findIndex(r => r.id == roomId);
                rooms.splice(delroomIndex, 1);
            }
            saveRoomsToFile();
            io.to(roomId).emit('userLeft', userID);
            res.cookie('userID:' + roomId, '', { expires: new Date(0) });
            res.sendStatus(200);
            return;
        }
    }
    res.status(400).send("Invalid room ID or user ID");
});


let userTimers = {};

io.on('connection', (socket) => {
    console.log('User connected');
    socket.on('joinRoom', (roomId, userID) => {
        const room = rooms.find(room => room.id == roomId);
        if (room) {
            socket.join(roomId);
            const user = room.users.find(user => user.ID == userID);
            const joinMessage = {
                name: " ",
                system: true,
                text: `Пользователь ${user.name} присоединился к комнате`,
            };
            room.messages.push(joinMessage);
            io.to(roomId).emit('chatMessage', joinMessage);
            console.log('User joined room(server): ' + roomId);
            socket.to(roomId).emit('userJoined', userID);
            // Отменяем таймер удаления, если он был запущен
            if (userTimers[userID]) {
                clearTimeout(userTimers[userID]);
                delete userTimers[userID];
            }
            socket.on('disconnect', () => {
                console.log('User disconnected from room: ' + roomId);
                const room = rooms.find(room => room.id == roomId);
                if (room) {
                    const userIndex = room.users.findIndex(user => user.ID == userID);
                    if (userIndex !== -1) {
                        room.users[userIndex].disconnectTime = new Date().getTime();
                        const exitMessage = {
                            name: " ",
                            system: true,
                            text: `Пользователь ${user.name} отсоединился от комнаты`,
                        };
                        room.messages.push(exitMessage);
                        io.to(roomId).emit('chatMessage', exitMessage);
                        saveRoomsToFile();
                        // Устанавливаем таймер на удаление пользователя через 5 минут, если он еще не запущен
                        if (!userTimers[userID]) {
                            userTimers[userID] = setTimeout(() => {
                                const userIndex = room.users.findIndex(user => user.ID == userID);
                                if (userIndex !== -1) {
                                    room.users.splice(userIndex, 1);
                                    if (room.users.length == 0) {
                                        const delroomIndex = rooms.findIndex(r => r.id == roomId);
                                        rooms.splice(delroomIndex, 1);
                                    }
                                    saveRoomsToFile();
                                    io.to(roomId).emit('userLeft', userID);
                                }
                                delete userTimers[userID];
                            }, 300000); // 300000 мс = 5 минут
                        }
                    }
                }
            });
        }
    });
    socket.on('chatMessage', (data) => {
        const room = rooms.find(room => room.id == data.roomId);
        if (room) {
            const message = { name: data.name, text: data.text, userID: data.userID };
            room.messages.push(message);
            io.to(data.roomId).emit('chatMessage', message);
        }
    });

    socket.on('play', (data) => {
        console.log('Play event received', data);
        const room = rooms.find(room => room.id == data.roomId);
        if (room) {
            room.lastTime = data.currentTime;
            socket.to(data.roomId).emit('syncPlay', data.currentTime, () => {
                saveRoomsToFile();
            });
        }
    });
    socket.on('pause', (data) => {
        console.log('Pause event received', data);
        const room = rooms.find(room => room.id == data.roomId);
        if (room) {
            room.lastTime = data.currentTime;
            socket.to(data.roomId).emit('syncPause', data.currentTime, () => {
                saveRoomsToFile();
            });
        }
    });

    socket.on('timeupdate', (data) => {
        const room = rooms.find(room => room.id == data.roomId);
        if (room) {
            room.lastTime = data.currentTime;
        }
    });

    socket.on("getLastTime", (data) => {
        const room = rooms.find(room => room.id == data.roomId);
        socket.emit('giveLastTime', (room.lastTime));
    });

});

function saveRoomsToFile() {
    fs.writeFileSync("rooms.json", JSON.stringify(rooms), "utf-8");
}

function getVideoSite(url) {
    const vkRegex = /^(?:https?:\/\/)?(?:www\.)?vk\.com\/(?:video_ext\.php\?oid=\d+&id=\d+&hash=[\w\d]+|video-?\d+_\d+)/;
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\/)|youtu\.be\/)([^\s&]+)/;
    const mp4Regex = /^(?:https?:\/\/)?(?:www\.)?.+\.(mp4)$/;

    if (vkRegex.test(url)) {
        return "VK";
    } else if (youtubeRegex.test(url)) {
        return "YouTube";
    } else if (mp4Regex.test(url)) {
        return "MP4";
    } else if (url == "localvideo") {
        return "Local";
    }
}

function getNewRoomId(rooms) {
    let newRoomId = Math.floor(Math.random() * 900 + 100);
    const room = rooms.find(room => room.id == newRoomId);
    if (room) {
        return getNewRoomId(rooms);
    } else {
        return newRoomId;
    }
}

server.listen(PORT, () => console.log("SERVER STARTED ON PORT", PORT));