export function initializeChat(roomMessages, currentRoomID, userID, socket, userName) {
    const chatForm = document.createElement('form');
    chatForm.id = 'chatForm';
    const messageInput = document.createElement('input');
    messageInput.type = 'text';
    messageInput.name = 'message';
    messageInput.placeholder = 'Enter message';
    const sendButton = document.createElement('button');
    sendButton.type = 'submit';
    sendButton.textContent = 'Send';

    chatForm.appendChild(messageInput);
    chatForm.appendChild(sendButton);

    const chatMessages = document.createElement('div');
    chatMessages.id = 'chatMessages';
    document.body.appendChild(chatForm);
    document.body.appendChild(chatMessages);

    roomMessages.forEach(message => displayMessage(message));

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message) {
            socket.emit('chatMessage', { roomId: currentRoomID, userID: userID, name: userName, text: message });
            messageInput.value = '';
        }
    });

    socket.on('chatMessage', (message) => {
        displayMessage(message);
    });

    function displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        if (message.system) {
            messageElement.textContent = message.text;
            messageElement.style.textAlign = 'center';
            messageElement.style.fontStyle = 'italic';
        } else if (message.userID === userID) {
            messageElement.classList.add('my-message');
            messageElement.style.textAlign = 'right';
            messageElement.textContent = `${message.name}: ${message.text}`;
        } else {
            messageElement.classList.add('other-message');
            messageElement.style.textAlign = 'left';
            messageElement.textContent = `${message.name}: ${message.text}`;
        }
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Прокрутка вниз после добавления сообщения
    }
}