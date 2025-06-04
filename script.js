// Конфигурация Firebase
const firebaseConfig = {
    databaseURL: "https://sitik-1fea0-default-rtdb.firebaseio.com/"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Константы
const ADMIN_PASSWORD = "sopopdp";

// Состояние приложения
const state = {
    currentUser: localStorage.getItem('chatApp_userId') || `User${Math.floor(Math.random() * 100000)}`,
    currentRoom: null,
    selectedChat: null
};

// Сохраняем пользователя в localStorage при первом посещении
if (!localStorage.getItem('chatApp_userId')) {
    localStorage.setItem('chatApp_userId', state.currentUser);
}

// Элементы DOM
const elements = {
    mainScreen: document.getElementById('mainScreen'),
    addChatBtn: document.getElementById('addChatBtn'),
    chatsList: document.getElementById('chatsList'),
    createChatModal: document.getElementById('createChatModal'),
    joinChatModal: document.getElementById('joinChatModal'),
    settingsModal: document.getElementById('settingsModal'),
    chatScreen: document.getElementById('chatScreen'),
    newChatName: document.getElementById('newChatName'),
    newChatPassword: document.getElementById('newChatPassword'),
    createChatForm: document.getElementById('createChatForm'),
    joinChatForm: document.getElementById('joinChatForm'),
    passwordGroup: document.getElementById('passwordGroup'),
    chatPassword: document.getElementById('chatPassword'),
    adminPassword: document.getElementById('adminPassword'),
    joinChatTitle: document.getElementById('joinChatTitle'),
    currentRoomName: document.getElementById('currentRoomName'),
    settingsBtn: document.getElementById('settingsBtn'),
    deleteChatBtn: document.getElementById('deleteChatBtn'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    modalCloses: document.querySelectorAll('.close'),
    currentUserDisplay: document.getElementById('currentUserDisplay'),
    currentUserName: document.getElementById('currentUserName'),
    changeNameModal: document.getElementById('changeNameModal'),
    changeNameForm: document.getElementById('changeNameForm'),
    newUserName: document.getElementById('newUserName')
};

// Инициализация приложения
function init() {
    updateUserDisplay();
    setupEventListeners();
    loadChatsList();
}

// Обновление отображения имени пользователя
function updateUserDisplay() {
    elements.currentUserName.textContent = state.currentUser;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка добавления чата
    elements.addChatBtn.addEventListener('click', () => {
        elements.createChatModal.style.display = 'block';
    });

    // Создание чата
    elements.createChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createChat();
    });

    // Вход в чат
    elements.joinChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await joinChat();
    });

    // Настройки чата
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsModal.style.display = 'block';
    });

    // Удаление чата
    elements.deleteChatBtn.addEventListener('click', async () => {
        await deleteChat();
    });

    // Отправка сообщения
    elements.sendMessageBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Выход из чата
    elements.leaveRoomBtn.addEventListener('click', leaveChat);

    // Изменение имени пользователя
    elements.changeNameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = elements.newUserName.value.trim();
        if (newName) {
            state.currentUser = newName;
            localStorage.setItem('chatApp_userId', newName);
            updateUserDisplay();
            elements.changeNameModal.style.display = 'none';
            elements.newUserName.value = '';
        }
    });

    // Клик по отображению пользователя
    elements.currentUserDisplay.addEventListener('click', () => {
        elements.newUserName.value = state.currentUser;
        elements.changeNameModal.style.display = 'block';
    });

    // Закрытие модальных окон
    elements.modalCloses.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            elements.createChatModal.style.display = 'none';
            elements.joinChatModal.style.display = 'none';
            elements.settingsModal.style.display = 'none';
            elements.changeNameModal.style.display = 'none';
        });
    });

    // Закрытие по клику вне окна
    window.addEventListener('click', (e) => {
        if (e.target === elements.createChatModal) elements.createChatModal.style.display = 'none';
        if (e.target === elements.joinChatModal) elements.joinChatModal.style.display = 'none';
        if (e.target === elements.settingsModal) elements.settingsModal.style.display = 'none';
        if (e.target === elements.changeNameModal) elements.changeNameModal.style.display = 'none';
    });
}

// Загрузка списка чатов
function loadChatsList() {
    database.ref('rooms').on('value', (snapshot) => {
        elements.chatsList.innerHTML = '';
        const chats = snapshot.val() || {};

        Object.entries(chats).forEach(([id, chat]) => {
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-card';
            chatElement.innerHTML = `
                <div class="chat-name">${chat.name}</div>
                <div class="chat-meta">
                    ${chat.password ? '<i class="fas fa-lock"></i> С паролем' : '<i class="fas fa-unlock"></i> Открытый'}
                </div>
            `;

            chatElement.addEventListener('click', () => {
                state.selectedChat = { id, ...chat };
                openJoinModal(chat);
            });

            elements.chatsList.appendChild(chatElement);
        });
    });
}

// Открытие модального окна входа
function openJoinModal(chat) {
    elements.joinChatTitle.textContent = `Войти в "${chat.name}"`;
    
    if (chat.password) {
        elements.passwordGroup.style.display = 'block';
        elements.chatPassword.required = true;
    } else {
        elements.passwordGroup.style.display = 'none';
        elements.chatPassword.required = false;
    }
    
    elements.joinChatModal.style.display = 'block';
}

// Создание нового чата
async function createChat() {
    const name = elements.newChatName.value.trim();
    const password = elements.newChatPassword.value.trim();

    if (!name) {
        alert('Введите название чата');
        return;
    }

    try {
        const roomId = generateRoomId(name);
        
        await database.ref(`rooms/${roomId}`).set({
            name: name,
            password: password || null,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            messages: {}
        });

        elements.createChatModal.style.display = 'none';
        elements.newChatName.value = '';
        elements.newChatPassword.value = '';
    } catch (error) {
        console.error("Ошибка при создании чата:", error);
        alert("Не удалось создать чат");
    }
}

// Вход в чат
async function joinChat() {
    const chat = state.selectedChat;
    const password = elements.chatPassword.value.trim();

    if (chat.password && chat.password !== password) {
        alert('Неверный пароль');
        return;
    }

    state.currentRoom = chat.id;
    elements.joinChatModal.style.display = 'none';
    elements.chatPassword.value = '';
    elements.mainScreen.style.display = 'none';
    elements.chatScreen.style.display = 'flex';
    elements.currentRoomName.textContent = chat.name;
    
    loadMessages();
    elements.messageInput.focus();
}

// Загрузка сообщений
function loadMessages() {
    database.ref(`rooms/${state.currentRoom}/messages`).on('value', (snapshot) => {
        elements.messagesContainer.innerHTML = '';
        const messages = snapshot.val() || {};

        Object.entries(messages).forEach(([id, msg]) => {
            const isCurrentUser = msg.user === state.currentUser;
            const messageElement = document.createElement('div');
            messageElement.className = `message ${isCurrentUser ? 'user' : 'other'}`;
            
            messageElement.innerHTML = `
                <div class="message-text">${msg.text}</div>
                <div class="message-info">
                    <span>${msg.user}</span>
                    <span>${formatTime(msg.timestamp)}</span>
                </div>
            `;
            
            elements.messagesContainer.appendChild(messageElement);
        });

        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    });
}

// Удаление чата
async function deleteChat() {
    const password = elements.adminPassword.value.trim();
    
    if (password !== ADMIN_PASSWORD) {
        alert('Неверный пароль администратора');
        return;
    }

    if (!state.currentRoom) {
        alert('Чат не выбран');
        return;
    }

    if (confirm('Вы уверены, что хотите удалить этот чат? Все сообщения будут потеряны!')) {
        try {
            await database.ref(`rooms/${state.currentRoom}`).remove();
            alert('Чат успешно удален');
            leaveChat();
            elements.settingsModal.style.display = 'none';
            elements.adminPassword.value = '';
        } catch (error) {
            console.error("Ошибка при удалении чата:", error);
            alert("Не удалось удалить чат");
        }
    }
}

// Отправка сообщения
function sendMessage() {
    const text = elements.messageInput.value.trim();
    if (!text || !state.currentRoom) return;

    database.ref(`rooms/${state.currentRoom}/messages`).push({
        text: text,
        user: state.currentUser,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    elements.messageInput.value = '';
}

// Выход из чата
function leaveChat() {
    state.currentRoom = null;
    elements.chatScreen.style.display = 'none';
    elements.mainScreen.style.display = 'block';
}

// Вспомогательные функции
function generateRoomId(name) {
    return name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        + '-' + Math.random().toString(36).substr(2, 5);
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Запуск приложения
init();