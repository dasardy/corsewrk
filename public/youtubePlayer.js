export function initializeYouTubePlayer(roomInfo, currentRoomID, userID, socket, playerContainer) {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    let player;
    let intervalId;

    function createPlayer() {
        let startTime = roomInfo.lastTime;
        player = new YT.Player(playerContainer, {
            width: '640',
            height: '360',
            videoId: roomInfo.videoLink.split('v=')[1],

            playerVars: {
                'controls': 1,
                'autoplay': 0,
                'start': startTime,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });

        let localChange = false;
        let isFirstLaunch = true;

        function onPlayerReady(event) {
            socket.emit('joinRoom', currentRoomID, userID);
        }

        function onPlayerStateChange(event) {
            if (event.data === YT.PlayerState.PLAYING) {
                if (isFirstLaunch) {
                    socket.emit('getLastTime', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
                    socket.on('giveLastTime', (roomLastTime) => {
                        player.seekTo(roomLastTime, true);
                    });
                    isFirstLaunch = false;
                } else {
                    intervalId = setInterval(() => {
                        socket.emit('timeupdate', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
                    }, 2000);
                }
                if (!localChange) {
                    socket.emit('play', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
                }
                localChange = false;

            } else if (event.data === YT.PlayerState.PAUSED) {
                if (!localChange) {
                    socket.emit('pause', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
                }
            } else if (event.data === YT.PlayerState.ENDED) {
                socket.emit('pause', { roomId: currentRoomID, currentTime: player.getCurrentTime() });
            }
        }
        socket.on('syncPlay', (currentTime) => {
            localChange = true;
            player.seekTo(currentTime, true);
            if (isFirstLaunch == false) {
                player.playVideo();
            }
        });

        socket.on('syncPause', (currentTime) => {
            localChange = true;
            player.seekTo(currentTime, true);
            player.pauseVideo();
        });
    }

    if (window.YT && window.YT.Player) {
        createPlayer();
    } else {
        window.onYouTubeIframeAPIReady = createPlayer;
    }
}