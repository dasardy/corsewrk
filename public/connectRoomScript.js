let roomText = document.getElementById('roomText');
let nameText = document.getElementById('nameText');
let keyText = document.getElementById('keyText');
let connectButton = document.getElementById('connectButton');
connectButton.addEventListener('click', function() {
    if (roomText.value.trim() !== '' && nameText.value.trim() !== '' && keyText.value.trim() !== '') {
        url = '/connectRoom';
        const roomID = roomText.value;
        const userName = nameText.value;
        const roomKey = keyText.value
        const connectJson = {
            connectRoomID: roomID,
            userName: userName,
            key: roomKey
        };
        const params = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectJson)
        };
        fetch(url, params)
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                } else {
                    alert('Введены неправильные параметры. Повторите попытку');
                }
            })
            .catch(error => {
                alert("Произошла ошибка!: ", error);
            });
    } else {
        alert('Пожалуйста, заполните все поля!');
    }
});