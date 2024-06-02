export function initializeVKPlayer(roomInfo, currentRoomID, userID, socket, playerContainer) {
    const iframe = document.createElement('iframe');
    iframe.src = convertVKLink(roomInfo.videoLink) + "&js_api=1";
    iframe.width = '640';
    iframe.height = '360';
    iframe.allow = 'autoplay; screen-wake-lock; fullscreen';

    playerContainer.appendChild(iframe);

    const player = VK.VideoPlayer(iframe);
    socket.emit('joinRoom', currentRoomID, userID);

    let localChange = false;
    let isFirstLaunch = true;
    let lastUpdateTime = Date.now()
    player.on('started', () => {
        if (isFirstLaunch) {
            socket.emit('getLastTime', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
            socket.on('giveLastTime', (roomLastTime) => {
                player.seek(roomLastTime);
            });
            isFirstLaunch = false;
        }
        if (!localChange) {
            socket.emit('play', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
        }
        localChange = false;
    });
    player.on('resumed', () => {
        if (!localChange) {
            socket.emit('play', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
        }
        localChange = false;
    })
    player.on('paused', () => {
        if (!localChange) {
            socket.emit('pause', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
        }
        localChange = false;
    });
    player.on('timeupdate', () => {
        const currentTime = Date.now();
        if (!localChange && (currentTime - lastUpdateTime) > 1000) {
            socket.emit('timeupdate', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
            lastUpdateTime = currentTime;
        }
        localChange = false;
    });

    socket.on('syncPlay', (currentTime) => {
        localChange = true;
        player.seek(currentTime);
        if (!isFirstLaunch) {
            player.play();
        }
    });

    socket.on('syncPause', (currentTime) => {
        localChange = true;
        player.seek(currentTime);
        player.pause();
    });

}


function convertVKLink(link) {

    const regex = /https:\/\/vk\.com\/video(-?\d+)_(\d+)/;
    const match = link.match(regex);

    if (match && match.length === 3) {
        const oid = match[1];
        const id = match[2];
        return `https://vk.com/video_ext.php?oid=${oid}&id=${id}`;
    } else {
        throw new Error('Invalid VK video link format');
    }
}
