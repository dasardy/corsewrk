const currentUrl = window.location.href;
const currentRoomID = currentUrl.substring(currentUrl.lastIndexOf('=') + 1);
console.log(currentRoomID);
const socket = io('/');
import { initializeVideoPlayer } from './videoPlayer.js'; // Путь к файлу videoPlayer.js
import { initializeYouTubePlayer } from './youtubePlayer.js'
import { initializeVKPlayer } from './vkPlayer.js'
import { initializeLocalPlayer } from './localPlayer.js'
import { initializeChat } from './chat.js';

function checkCookie(name) {
    console.log(name);
    const cookies = document.cookie.split(';');
    console.log(name);
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
            return true;
        }
    }
    return false;

}

if (checkCookie('userID:' + currentRoomID)) {
    const userID = Cookies.get('userID:' + currentRoomID);
    const checkUserInRoomJson = {
        roomId: currentRoomID,
        userID: userID
    };
    const params = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkUserInRoomJson)
    };
    fetch(currentUrl, params)
        .then(response => response.json())
        .then(roomInfo => {
            const userName = roomInfo.username;
            const IDRoom = "Номер комнаты: " + currentRoomID;
            const KeyRoom = "Ключ: " + roomInfo.key;
            const UserNameRoom = "Ваше имя: " + userName;

            document.getElementById('IDRoom').textContent = IDRoom;
            document.getElementById('KeyRoom').textContent = KeyRoom;
            document.getElementById('UserNameRoom').textContent = UserNameRoom;

            const CopyKeyBtn = document.createElement("button");
            CopyKeyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            CopyKeyBtn.addEventListener("click", () => {
                const textToCopy = `${IDRoom}\n${KeyRoom}`;
                const tempInput = document.createElement('textarea');
                tempInput.value = textToCopy;
                document.body.appendChild(tempInput);
                tempInput.select();
                tempInput.setSelectionRange(0, 99999); // For mobile devices
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                alert('Текст скопирован:\n' + textToCopy);
            });
            document.getElementById('CopyContainer').appendChild(CopyKeyBtn);

            const playerContainer = document.getElementById('playerContainer');
            if (roomInfo.videoType === "YouTube") {
                try {
                    initializeYouTubePlayer(roomInfo, currentRoomID, userID, socket, playerContainer);
                } catch {}
            } else if (roomInfo.videoType === "VK") {
                initializeVKPlayer(roomInfo, currentRoomID, userID, socket, playerContainer);
            } else if (roomInfo.videoType === "Local") {
                initializeLocalPlayer(roomInfo, currentRoomID, userID, socket, playerContainer);
            } else if (roomInfo.videoType === "MP4") {
                initializeVideoPlayer(roomInfo, currentRoomID, userID, socket, playerContainer);
            } else {
                alert("Ссылка на видео не определена или не поддерживается! Проверьте правильность ссылки и повторите попытку.");
            }
            initializeChat(roomInfo.messages, currentRoomID, userID, socket, userName);
            document.getElementById('exitButton').addEventListener('click', () => {
                const userID = Cookies.get('userID:' + currentRoomID);
                const params = {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ roomId: currentRoomID, userID: userID, userName: userName })
                };
                fetch('/exitRoom', params)
                    .then(response => {
                        if (response.ok) {
                            window.location.href = '/';
                        } else {
                            alert("Ошибка выхода из комнаты!");
                        }
                    })
                    .catch(error => {
                        alert("Ошибка выполнения запроса: ", error);
                    });
            });
        })
        .catch(error => {
            alert("Произошла ошибка!" + error);
        });
} else {
    alert("Вы не зарегестрированы в данной комнате! Повторите попытку");
}