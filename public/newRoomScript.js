let LaunchButtonIsAdded = false;
let linkInput;
let UserInput = document.createElement("input");
UserInput.type = "text";
UserInput.placeholder = "Введите ваш nickname"
let ButtonContainer = document.getElementById("PlayBtnContainer");
let LaunchButton = document.createElement('button');
LaunchButton.innerText = "Создать комнату";

document.querySelectorAll('.card').forEach(function(card) {
    card.addEventListener('click', function() {
        document.querySelectorAll('.card').forEach(function(c) {
            c.classList.remove('active');
        });
        this.classList.add('active');
        let inputsContainer = document.getElementById('inputsContainer');
        inputsContainer.innerHTML = '';
        let isLocal = this.id === 'LocalCard';
        if (!isLocal) {
            linkInput = document.createElement('input');
            linkInput.type = 'text';
            linkInput.placeholder = 'Вставьте URL видео';
            inputsContainer.appendChild(linkInput);
        }
        inputsContainer.appendChild(UserInput);
        LaunchButton.onclick = () => {
            const url = "/createRoom";
            const admin = UserInput.value;
            if (admin === "") {
                alert("Вы не написали имя пользователя!");
            } else {
                const roomJson = {
                    adminName: admin,
                    local: isLocal,
                    link: isLocal ? "localvideo" : linkInput.value
                };
                if (!isLocal && (!linkInput || linkInput.value === "")) {
                    alert("Вы не ввели ссылку на видео!");
                } else {
                    console.log(roomJson)
                    sendRequest(url, roomJson);

                }
            }
        };

        if (!LaunchButtonIsAdded) {
            ButtonContainer.appendChild(LaunchButton);
            LaunchButtonIsAdded = true;
        }
    });
});

function sendRequest(url, roomJson) {
    const params = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(roomJson)
    };
    fetch(url, params)
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            }
        })
        .catch(error => {
            alert("Произошла ошибка: ", error);
        });
}