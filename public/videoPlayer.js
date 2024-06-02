export function initializeVideoPlayer(roomInfo, currentRoomID, userID, socket, playerContainer) {
    const videoPlayer = document.createElement('video');
    videoPlayer.width = '640';
    videoPlayer.height = '360';
    videoPlayer.controls = true;
    const videoSource = document.createElement('source');
    videoSource.src = roomInfo.videoLink;
    videoPlayer.appendChild(videoSource);
    videoPlayer.currentTime = roomInfo.lastTime;
    videoPlayer.load();
    playerContainer.appendChild(videoPlayer);
    socket.emit('joinRoom', currentRoomID, userID);
    let localChange = false;
    let isFirstLaunch = true;
    let isSeeking = false;

    videoPlayer.addEventListener('play', () => {
        if (isFirstLaunch) {
            socket.emit('getLastTime', { roomId: currentRoomID, currentTime: videoPlayer.currentTime });
            socket.on('giveLastTime', (roomLastTime) => {
                videoPlayer.currentTime = roomLastTime;
            });
            isFirstLaunch = false;
        }
        if (!localChange && !isSeeking) {
            socket.emit('play', { roomId: currentRoomID, currentTime: videoPlayer.currentTime });
        }
        localChange = false;
        isSeeking = false;
    });

    videoPlayer.addEventListener('pause', () => {
        if (!localChange && !isSeeking) {
            socket.emit('pause', { roomId: currentRoomID, currentTime: videoPlayer.currentTime });
        }
        localChange = false;
        isSeeking = false;
    });

    videoPlayer.addEventListener('seeking', () => {
        isSeeking = true;
    });

    videoPlayer.addEventListener('seeked', () => {
        if (isSeeking) {
            socket.emit('timeupdate', { roomId: currentRoomID, currentTime: videoPlayer.currentTime });
        }
        isSeeking = false;
    });

    let lastUpdateTime = Date.now();

    videoPlayer.addEventListener('timeupdate', () => {
        const currentTime = Date.now();
        if (!localChange && (currentTime - lastUpdateTime) > 1000) {
            socket.emit('timeupdate', { roomId: currentRoomID, currentTime: videoPlayer.currentTime });
            lastUpdateTime = currentTime;
        }
        localChange = false;
    });

    socket.on('syncPlay', (currentTime) => {
        localChange = true;
        videoPlayer.currentTime = currentTime;
        if (!isFirstLaunch) {
            videoPlayer.play();
        }
    });

    socket.on('syncPause', (currentTime) => {
        localChange = true;
        videoPlayer.currentTime = currentTime;
        videoPlayer.pause();
    });
}