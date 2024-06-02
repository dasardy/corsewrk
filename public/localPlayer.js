export function initializeLocalPlayer(roomInfo, currentRoomID, userID, socket, playerContainer) {
    socket.emit('joinRoom', currentRoomID, userID);
    const peer = new Peer(userID);
    let fileInput;
    let streamButton;
    let player;
    let stream;
    let localChange = false;

    player = document.createElement("video");
    player.controls = true;
    player.muted = false;
    playerContainer.appendChild(player);
    if (userID !== roomInfo.adminID) {
        const checkStreamButton = document.createElement("button");
        checkStreamButton.innerText = "Проверить трансляцию";
        checkStreamButton.className = "room_button";
        playerContainer.appendChild(checkStreamButton);

        checkStreamButton.addEventListener("click", () => {
            location.reload();
        });
    }

    peer.on('open', (id) => {
        if (id === roomInfo.adminID) {
            const fileInputWrapper = document.createElement("div");
            fileInputWrapper.className = "file_input_wrapper";

            fileInput = document.createElement("input");
            fileInput.type = 'file';
            fileInput.id = 'fileInput';
            fileInput.className = "file_input_lp";
            fileInputWrapper.appendChild(fileInput);

            const fileLabel = document.createElement("label");
            fileLabel.innerText = "Выберите файл";
            fileLabel.className = "file_input_label";
            fileLabel.htmlFor = "fileInput";
            fileInputWrapper.appendChild(fileLabel);

            playerContainer.appendChild(fileInputWrapper);
            streamButton = document.createElement("button");
            streamButton.innerText = "start";
            streamButton.className = "room_button";
            playerContainer.appendChild(streamButton);
            player.loop = true;
            streamButton.addEventListener("click", () => {
                const file = fileInput.files[0];
                if (!file) {
                    alert("Пожалуйста, сначала выберите файл.");
                    return;
                }
                player.src = URL.createObjectURL(file);
                player.addEventListener('canplay', () => {
                    player.play();
                    stream = player.captureStream();
                }, { once: true });
            });
        }
    });

    socket.on("userJoined", (newUserID) => {
        if (userID === roomInfo.adminID) {
            const call = peer.call(newUserID, stream);
        }
    });

    peer.on('call', (call) => {
        alert("Трансляция началась! Нажмите play для запуска фильма у себя");
        call.answer();
        call.on('stream', (remoteStream) => {
            player.srcObject = remoteStream;
        });
    });

    player.addEventListener('play', () => {
        if (!localChange) {
            socket.emit('play', { roomId: currentRoomID, currentTime: player.currentTime });
        }
        localChange = false;
    });

    player.addEventListener('pause', () => {
        if (!localChange) {
            socket.emit('pause', { roomId: currentRoomID, currentTime: player.currentTime });
        }
        localChange = false;
    });

    socket.on('syncPlay', (currentTime) => {
        localChange = true;
        player.play().catch(error => {
            console.error("Error during syncPlay:", error);
        });

    });

    socket.on('syncPause', (currentTime) => {
        localChange = true;
        player.pause();

    });
}