// ═══════════════════════════════════════════════
//  ChatFlow — Client Logic
//  Features: Socket.io, Messages, Audio, Files, Emoji, Settings
//  v2: History, Back-Button Exit, Messenger-style Emoji
// ═══════════════════════════════════════════════

'use strict';

/* ─────────────────── Twemoji Helper ─────────────────── */
// Applies Messenger/Twitter-style SVG emojis to any DOM element
// ─────────────────── Messenger-style Emoji (Facebook) ───────────────────

function applyTwemoji(el) {
  if (!el || !window.twemoji) return;

  try {
    // 1. Use robust twemoji parser to get correct filenames for all emojis (handles ZWJ, etc)
    twemoji.parse(el, {
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
      folder: '72x72',
      ext: '.png'
    });

    // 2. Override with Facebook emojis, with fallback to Twemoji for missing ones
    const imgs = el.querySelectorAll('img.emoji');
    imgs.forEach(img => {
      // originalSrc is the working Twemoji URL
      const originalSrc = img.src; 
      // extract filename e.g. '1f600.png'
      const filename = originalSrc.substring(originalSrc.lastIndexOf('/') + 1);
      
      // point to Facebook CDN
      img.src = `https://cdn.jsdelivr.net/npm/emoji-datasource-facebook@14.0.0/img/facebook/64/${filename}`;
      
      // if Facebook image doesn't exist (404), fall back to Twemoji seamlessly!
      img.onerror = function() {
        this.onerror = null;
        this.src = originalSrc;
      };
      
      img.draggable = false;
    });
  } catch (e) {
    console.error('Emoji parsing error:', e);
  }
}

/* ─────────────────── State ─────────────────── */
let socket = null;
let myName = '';
let partnerName = '';
let mySocketId = '';
let roomCode = '';
let isOnline = navigator.onLine;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let recTimerInterval = null;
let recSeconds = 0;
let typingTimer = null;
let soundEnabled = true;
let darkMode = true;
let msgIdCounter = 0;
const pendingMessages = new Map();
const messageEls = new Map();

/* ─────────────────── Messenger-Style Emoji Data ─────────────────── */
// Most-used row (always shown at top)
const FREQUENT_EMOJIS = ['😂', '❤️', '😍', '🥰', '😊', '🙏', '😭', '☺️', '😘', '🤣', '👍', '🎉', '🙌', '🔥', '💯', '✨', '😎', '🥺', '😅', '💪', '🤩', '😜', '🫶', '💀', '🤔', '😤', '🥳', '😴', '🫡', '🤯'];

const EMOJI_CATEGORIES = [
  {
    id: 'frequent',
    icon: '⭐',
    label: 'الأكثر استخداماً',
    emojis: FREQUENT_EMOJIS
  },
  {
    id: 'faces',
    icon: '😀',
    label: 'وجوه وأشخاص',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '🫨', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '🫣', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊']
  },
  {
    id: 'gestures',
    icon: '👋',
    label: 'إيماءات',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '🫙', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🫀', '🫁', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '💋', '🫦', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵']
  },
  {
    id: 'hearts',
    icon: '❤️',
    label: 'قلوب ومشاعر',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🫀', '😍', '🥰', '😘', '💏', '💑', '💌', '💋', '🫦', '💃', '🕺', '💐', '🌹', '🌷', '🌸', '🌺', '🌻', '🌼', '🍀', '🌿', '🍁', '🍂', '🍃', '🌱', '🌲', '🌳', '🌴', '🌵', '🎋', '🎍', '☘️', '🌾', '🌬️', '🌀', '🌈', '☀️', '🌤️', '⛅', '🌥️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌊', '💧', '💦', '🫧']
  },
  {
    id: 'celebration',
    icon: '🎉',
    label: 'احتفال ونشاطات',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🎗️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎷', '🪗', '🎸', '🎹', '🥁', '🪘', '🎺', '🎻', '🪕', '🎮', '🕹️', '🎲', '🎯', '🎳', '🎰', '🧩', '♟️', '🎠', '🎡', '🎢', '🎪', '🛝', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤸', '🤺', '🏇', '⛹️', '🤾', '🏌️', '🏄', '🚣', '🧗', '🚵', '🚴', '🏆']
  },
  {
    id: 'food',
    icon: '🍕',
    label: 'طعام وشراب',
    emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🫒', '🥑', '🫑', '🌽', '🥕', '🧅', '🥔', '🥔', '🧄', '🥬', '🥒', '🌿', '🍄', '🥜', '🌰', '🧀', '🥗', '🥙', '🥪', '🌮', '🌯', '🫔', '🥫', '🫕', '🍱', '🍣', '🍤', '🍜', '🍝', '🍛', '🍲', '🥘', '🍵', '☕', '🫖', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🥤', '🧋', '🫗']
  },
  {
    id: 'travel',
    icon: '✈️',
    label: 'أماكن وسفر',
    emojis: ['✈️', '🚀', '🛸', '🛶', '🛥️', '🚢', '⛴️', '⛵', '🚗', '🚕', '🚙', '🛻', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛺', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🪂', '⛽', '🚦', '🚥', '🚧', '🛣️', '🛤️', '⛽', '🌍', '🌎', '🌏', '🗺️', '🧭', '🌋', '🏔️', '⛰️', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌉', '🌌', '🌁', '🏰', '🏯', '🏟️', '⛲', '🌁', '🗼', '🗽', '🗾', '🎡', '🎢', '🎠', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏗️', '🧱', '⛩️', '🕌', '🛕', '🕍', '⛪']
  },
  {
    id: 'objects',
    icon: '💡',
    label: 'أشياء ورموز',
    emojis: ['💡', '🔦', '🕯️', '🪔', '🔋', '🔌', '💻', '📱', '☎️', '📞', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📡', '🔭', '🔬', '💉', '🩸', '💊', '🩹', '🩼', '🪜', '🧹', '🧺', '🧻', '🪤', '🧼', '🧽', '🧴', '🪥', '🛋️', '🪑', '🚽', '🚿', '🛁', '🪟', '🪞', '🛏️', '🧸', '🪆', '🎎', '🎏', '🎐', '🎑', '🎍', '🎋', '🎄', '🎃', '🎆', '🎇', '✨', '🎊', '🎉', '🎈', '🎁', '🎀', '🎗️', '🔑', '🗝️', '🔒', '🔓', '🔐', '🔏', '🛡️', '⚔️', '🔫', '🪃', '🏹', '🪚', '🔧', '🪛', '🔩', '⚙️', '🔨', '🪓', '⛏️', '🗡️', '🔗', '⛓️', '🪝', '🧲', '💰', '💳', '🪙', '💎', '⚖️', '📚', '📖', '📝', '✏️', '🖊️', '🖋️', '✒️', '📌', '📍', '📎', '🖇️', '📐', '📏', '✂️', '🗃️', '🗄️', '🗑️', '📦', '📫', '📮', '🏷️']
  },
  {
    id: 'symbols',
    icon: '🔥',
    label: 'رموز وعلامات',
    emojis: ['🔥', '💯', '✅', '❌', '❓', '❗', '💤', '💢', '💣', '💥', '💬', '💭', '🗯️', '💫', '⭐', '🌟', '✨', '⚡', '🌈', '☀️', '🌙', '🌛', '🌜', '🌚', '🌝', '🌞', '☁️', '⛅', '🌤️', '🌥️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '🌊', '💧', '🫧', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '⏰', '⏱️', '⏲️', '🔔', '🔕', '📢', '📣', '🔊', '🔉', '🔈', '🔇', '📯', '🔁', '🔂', '▶️', '⏭️', '⏩', '⏸️', '⏹️', '⏺️', '🔀', '🔃', '🔄', '⏬', '⏫', '⬆️', '⬇️', '⬅️', '➡️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '🔙', '🔚', '🔛', '🔜', '🔝', '🆗', '🆒', '🆓', '🆙', '🆕', '🆖', '🅰️', '🅱️', '🆎', '🅾️', '🆘', '❎', '🚫', '🈵', '🈶', '🈯', '🉐', '🈹', '🈚', '🈲', '🉑', '🈸', '🈴', '🈳', '🈺', '🈷️', '🈶', '🈷️', '☰', '✔️', '➕', '➖', '➗', '✖️', '♻️', '🔱', '📛', '🔰', '⭕', '💠', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🔲', '🔳', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔲', '🔳']
  },
];

/* ─────────────────── DOM Refs ─────────────────── */
const $ = id => document.getElementById(id);
const joinScreen = $('join-screen');
const chatScreen = $('chat-screen');
const myNameInput = $('my-name');
const roomCodeInput = $('room-code');
const joinBtn = $('join-btn');
const genRoomBtn = $('gen-room');
const partnerNameLbl = $('partner-name-label');
const partnerStatus = $('partner-status-label');
const partnerAvatar = $('partner-avatar');
const statusDot = $('partner-status-dot');
const messagesList = $('messages-list');
const messagesArea = $('messages-area');
const msgInput = $('msg-input');
const sendBtn = $('send-btn');
const sendIcon = $('send-icon');
const micIcon = $('mic-icon');
const emojiBtn = $('emoji-btn');
const emojiPicker = $('emoji-picker');
const attachBtn = $('attach-btn');
const fileInput = $('file-input');
const recordingBar = $('recording-bar');
const recTimer = $('rec-timer');
const cancelRecord = $('cancel-record');
const sendRecord = $('send-record');
const typingIndicator = $('typing-indicator');
const settingsBtn = $('settings-btn');
const settingsOverlay = $('settings-overlay');
const closeSettings = $('close-settings');
const bgOptions = document.querySelectorAll('.bg-option');
const customBgInput = $('custom-bg-input');
const darkModeToggle = $('dark-mode-toggle');
const soundToggle = $('sound-toggle');
const leaveRoom = $('leave-room');
const chatBg = $('chat-bg');
const notifySound = $('notify-sound');
let toastContainer = null;

/* ─────────────────── BACK BUTTON (Mobile) ─────────────────── */
// On load, push an extra state so the back button stays on page
function setupBackButtonTrap() {
  // Push a "chat" state — if user presses back, popstate fires
  history.pushState({ chat: true }, '', window.location.href);

  window.addEventListener('popstate', (e) => {
    // They pressed back — exit page entirely
    // Replace current history entry so there's nowhere to go back to
    history.replaceState(null, '', window.location.href);
    window.location.replace('about:blank');
  });
}

// Prevent pull-to-refresh on mobile from losing the chat session
document.addEventListener('touchmove', (e) => {
  if (chatScreen.style.display !== 'none' && chatScreen.style.display !== '') {
    // Allow normal scroll within messages area
    if (!messagesArea.contains(e.target)) {
      e.preventDefault();
    }
  }
}, { passive: false });

/* ─────────────────── INIT ─────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Setup back-button trap immediately
  setupBackButtonTrap();

  // Create toast container
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);

  // Build exact Messenger-style emoji picker
  buildEmojiPicker();
  // Sync active tab when user scrolls (called after grid renders)
  setTimeout(syncTabOnScroll, 200);

  // Apply saved preferences
  const savedTheme = localStorage.getItem('cf-theme') || 'dark';
  darkMode = savedTheme === 'dark';
  applyTheme(darkMode);
  darkModeToggle.checked = darkMode;

  const savedBg = localStorage.getItem('cf-bg') || 'default';
  applyBackground(savedBg);
  bgOptions.forEach(o => o.classList.toggle('active', o.dataset.bg === savedBg));

  soundEnabled = localStorage.getItem('cf-sound') !== 'false';
  soundToggle.checked = soundEnabled;

  // Network status
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });

  // Auto-fill saved name and room
  const savedName = localStorage.getItem('cf-myname') || '';
  const savedRoom = localStorage.getItem('cf-lastroom') || '';
  if (savedName) myNameInput.value = savedName;
  if (savedRoom) roomCodeInput.value = savedRoom;

  // Auto-resize textarea
  msgInput.addEventListener('input', () => {
    msgInput.style.height = 'auto';
    msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
    toggleSendMic();
    if (msgInput.value.trim()) {
      emitTyping();
    } else {
      emitStopTyping();
    }
  });

  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  });

  // Send button
  sendBtn.addEventListener('click', () => {
    if (msgInput.value.trim()) {
      sendTextMessage();
    } else {
      startAudioRecording();
    }
  });

  // Emoji
  emojiBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = !emojiPicker.classList.contains('hidden');
    emojiPicker.classList.toggle('hidden');
    emojiBtn.classList.toggle('emoji-btn-active', !isOpen);
    if (!isOpen) {
      // picker just opened — focus search
      const searchEl = emojiPicker.querySelector('.ep-search-input');
      if (searchEl) setTimeout(() => searchEl.focus(), 80);
      // Scroll messages to bottom so picker doesn't hide last message
      scrollToBottom();
    }
  });
  document.addEventListener('click', e => {
    if (!emojiPicker.classList.contains('hidden') &&
      !emojiPicker.contains(e.target) &&
      e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
      emojiPicker.classList.add('hidden');
      emojiBtn.classList.remove('emoji-btn-active');
    }
  });

  // File attach
  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  // Recording controls
  cancelRecord.addEventListener('click', cancelAudioRecording);
  sendRecord.addEventListener('click', stopAndSendRecording);

  // Settings
  settingsBtn.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
  closeSettings.addEventListener('click', () => settingsOverlay.classList.add('hidden'));
  settingsOverlay.addEventListener('click', e => {
    if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden');
  });

  // Background options
  bgOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      if (opt.dataset.bg === 'custom') {
        customBgInput.click();
        return;
      }
      bgOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      applyBackground(opt.dataset.bg);
      localStorage.setItem('cf-bg', opt.dataset.bg);
    });
  });
  customBgInput.addEventListener('change', handleCustomBg);

  // Dark mode toggle
  darkModeToggle.addEventListener('change', () => {
    darkMode = darkModeToggle.checked;
    applyTheme(darkMode);
    localStorage.setItem('cf-theme', darkMode ? 'dark' : 'light');
  });

  // Sound toggle
  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    localStorage.setItem('cf-sound', soundEnabled);
  });

  // Leave room
  leaveRoom.addEventListener('click', () => {
    if (socket) socket.disconnect();
    localStorage.removeItem('cf-lastroom');
    window.location.replace(window.location.href.split('?')[0]);
  });

  // Join room
  joinBtn.addEventListener('click', joinRoom);
  genRoomBtn.addEventListener('click', () => {
    roomCodeInput.value = Math.random().toString(36).substring(2, 8).toUpperCase();
  });
  myNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') roomCodeInput.focus(); });
  roomCodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });

  // Load saved custom bg
  const savedCustomBg = localStorage.getItem('cf-custom-bg');
  if (savedCustomBg && localStorage.getItem('cf-bg') === 'custom') {
    chatBg.style.backgroundImage = `url(${savedCustomBg})`;
    chatBg.style.backgroundSize = 'cover';
  }
});

/* ─────────────────── JOIN ROOM ─────────────────── */
function joinRoom() {
  const name = myNameInput.value.trim();
  const room = roomCodeInput.value.trim().toUpperCase();
  if (!name) { showToast('⚠️ أدخل اسمك أولاً', 'error'); myNameInput.focus(); return; }
  if (!room) { showToast('⚠️ أدخل رمز الغرفة', 'error'); roomCodeInput.focus(); return; }

  myName = name;
  roomCode = room;
  localStorage.setItem('cf-myname', name);
  localStorage.setItem('cf-lastroom', room);

  joinBtn.disabled = true;
  joinBtn.textContent = 'جاري الاتصال...';

  socket = io({ transports: ['websocket'] });

  socket.on('connect', () => {
    mySocketId = socket.id;
    socket.emit('join-room', { room, name });
    showChatScreen();
  });

  socket.on('connect_error', () => {
    showToast('❌ فشل الاتصال بالسيرفر', 'error');
    joinBtn.disabled = false;
    joinBtn.textContent = 'دخول الغرفة';
  });

  setupSocketListeners();
}

function showChatScreen() {
  joinScreen.classList.remove('active');
  chatScreen.style.display = 'flex';
  msgInput.focus();
}

/* ─────────────────── SOCKET EVENTS ─────────────────── */
function setupSocketListeners() {
  // ── Room history (load old messages) ──
  socket.on('room-history', ({ messages, myName: serverMyName }) => {
    if (!messages || messages.length === 0) return;

    // Group by date for separators
    let lastDate = '';
    messages.forEach(msg => {
      const msgDate = new Date(msg.timestamp).toLocaleDateString('ar-EG');
      if (msgDate !== lastDate) {
        addDateSeparator(msg.timestamp);
        lastDate = msgDate;
      }
      const isMine = msg.senderName === myName;
      renderMessage(msg, isMine, true /* isHistory */);
    });

    addSystemMessage('📜 تم تحميل المحادثة السابقة');
    scrollToBottom(true);
  });

  socket.on('waiting-for-partner', () => {
    partnerNameLbl.textContent = 'في انتظار الطرف الآخر...';
    partnerStatus.textContent = 'انتظر انضمام شخص آخر';
    addSystemMessage(`🔗 رمز الغرفة: ${roomCode} — شاركه مع الطرف الآخر`);
  });

  socket.on('partner-joined', ({ name }) => {
    partnerName = name;
    partnerNameLbl.textContent = name;
    partnerStatus.textContent = 'متصل الآن 🟢';
    partnerAvatar.textContent = name.charAt(0).toUpperCase();
    statusDot.classList.remove('offline');
    statusDot.classList.add('online');
    addSystemMessage(`✅ انضم ${name} إلى المحادثة`);
    showToast(`👋 ${name} انضم إلى الغرفة`);
  });

  socket.on('partner-left', () => {
    partnerStatus.textContent = 'انقطع الاتصال';
    statusDot.classList.remove('online');
    statusDot.classList.add('offline');
    addSystemMessage('⚠️ غادر الطرف الآخر المحادثة');
    showToast('⚠️ الطرف الآخر غادر', 'error');
  });

  socket.on('receive-message', (data) => {
    // Add date separator if needed
    const msgDate = new Date(data.timestamp).toLocaleDateString('ar-EG');
    const lastMsg = messagesList.lastElementChild;
    const lastDate = lastMsg?.dataset?.date;
    if (msgDate !== lastDate) addDateSeparator(data.timestamp);

    renderMessage(data, false);
    socket.emit('messages-read', { messageIds: [data.id] });
    if (soundEnabled) playNotifySound();
  });

  socket.on('message-delivered', ({ id }) => {
    updateMessageStatus(id, 'delivered');
  });

  socket.on('messages-seen', ({ messageIds }) => {
    messageIds.forEach(id => updateMessageStatus(id, 'seen'));
  });

  socket.on('partner-typing', () => {
    typingIndicator.classList.remove('hidden');
    scrollToBottom();
  });

  socket.on('partner-stop-typing', () => {
    typingIndicator.classList.add('hidden');
  });

  socket.on('disconnect', () => {
    partnerStatus.textContent = 'انقطع الاتصال بالسيرفر';
    statusDot.classList.remove('online');
    statusDot.classList.add('offline');
    addSystemMessage('🔴 فُقد الاتصال');
  });
}

/* ─────────────────── SEND TEXT MESSAGE ─────────────────── */
function sendTextMessage() {
  const text = msgInput.value.trim();
  if (!text || !socket || !socket.connected) {
    if (!socket || !socket.connected) showToast('⚠️ غير متصل بالإنترنت', 'error');
    return;
  }

  const id = generateId();

  // Date separator if needed
  const now = Date.now();
  const msgDate = new Date(now).toLocaleDateString('ar-EG');
  const lastMsg = messagesList.lastElementChild;
  const lastDate = lastMsg?.dataset?.date;
  if (msgDate !== lastDate) addDateSeparator(now);

  renderMessage({
    id, senderId: mySocketId, type: 'text',
    content: text, timestamp: now, status: 'sent'
  }, true);

  pendingMessages.set(id, { status: 'sent' });
  socket.emit('send-message', { id, content: text, type: 'text' });

  msgInput.value = '';
  msgInput.style.height = 'auto';
  toggleSendMic();
  emitStopTyping();
  scrollToBottom();
}

/* ─────────────────── SEND FILE ─────────────────── */
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  fileInput.value = '';

  const maxSize = 64 * 1024 * 1024;
  if (file.size > maxSize) { showToast('❌ الملف أكبر من 64MB', 'error'); return; }

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) { showToast('❌ صيغة غير مدعومة', 'error'); return; }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const content = ev.target.result;
    const id = generateId();
    const fileType = isImage ? 'image' : 'video';
    const now = Date.now();

    const msgDate = new Date(now).toLocaleDateString('ar-EG');
    const lastMsg = messagesList.lastElementChild;
    if (msgDate !== lastMsg?.dataset?.date) addDateSeparator(now);

    renderMessage({
      id, senderId: mySocketId, type: fileType,
      content, fileName: file.name, timestamp: now, status: 'sent'
    }, true);

    socket.emit('send-file', { id, fileType, content, fileName: file.name });
    pendingMessages.set(id, { status: 'sent' });
    scrollToBottom();
  };
  reader.readAsDataURL(file);
}

/* ─────────────────── AUDIO RECORDING ─────────────────── */
async function startAudioRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('❌ المتصفح لا يدعم التسجيل', 'error');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: 48000, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';

    mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
    recordedChunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => stream.getTracks().forEach(t => t.stop());

    mediaRecorder.start(100);
    isRecording = true;
    recSeconds = 0;
    showRecordingBar();
    recTimerInterval = setInterval(() => {
      recSeconds++;
      recTimer.textContent = `${Math.floor(recSeconds / 60)}:${(recSeconds % 60).toString().padStart(2, '0')}`;
    }, 1000);
  } catch (err) {
    showToast('❌ تعذر الوصول للميكروفون', 'error');
  }
}

function showRecordingBar() {
  recordingBar.classList.remove('hidden');
  $('input-bar').classList.add('hidden');
}
function hideRecordingBar() {
  recordingBar.classList.add('hidden');
  $('input-bar').classList.remove('hidden');
  clearInterval(recTimerInterval);
  isRecording = false;
}
function cancelAudioRecording() {
  if (mediaRecorder && isRecording) { mediaRecorder.stop(); recordedChunks = []; }
  hideRecordingBar();
}
function stopAndSendRecording() {
  if (!mediaRecorder || !isRecording) return;
  mediaRecorder.addEventListener('stop', () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target.result;
      const id = generateId();
      const duration = recSeconds;
      const now = Date.now();

      const msgDate = new Date(now).toLocaleDateString('ar-EG');
      const lastMsg = messagesList.lastElementChild;
      if (msgDate !== lastMsg?.dataset?.date) addDateSeparator(now);

      renderMessage({ id, senderId: mySocketId, type: 'audio', content, duration, timestamp: now, status: 'sent' }, true);
      socket.emit('send-file', { id, fileType: 'audio', content, duration });
      pendingMessages.set(id, { status: 'sent' });
      scrollToBottom();
    };
    reader.readAsDataURL(blob);
  }, { once: true });
  mediaRecorder.stop();
  hideRecordingBar();
}

/* ─────────────────── RENDER MESSAGE ─────────────────── */
function renderMessage(data, isMine, isHistory = false) {
  const row = document.createElement('div');
  row.classList.add('msg-row', isMine ? 'mine' : 'other');
  row.dataset.msgId = data.id;
  if (isHistory) row.classList.add('history-msg');

  // Date tracking
  row.dataset.date = new Date(data.timestamp).toLocaleDateString('ar-EG');

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');

  if (data.type === 'text') {
    bubble.innerHTML = `
      <span class="msg-text">${escapeHtml(data.content).replace(/\n/g, '<br>')}</span>
      <div class="msg-meta">
        <span>${formatTime(data.timestamp)}</span>
        ${isMine ? renderTicks(data.status || 'sent') : ''}
      </div>`;
  } else if (data.type === 'image') {
    bubble.classList.add('media-bubble');
    bubble.innerHTML = `
      <img src="${data.content}" alt="صورة" loading="lazy" style="max-width:280px;border-radius:8px" />
      <div class="msg-meta" style="padding:2px 6px 4px">
        <span>${formatTime(data.timestamp)}</span>
        ${isMine ? renderTicks(data.status || 'sent') : ''}
      </div>`;
    bubble.querySelector('img').addEventListener('click', () => openImageViewer(data.content));
  } else if (data.type === 'video') {
    bubble.classList.add('media-bubble');
    bubble.innerHTML = `
      <video src="${data.content}" controls preload="metadata" style="max-width:280px;border-radius:8px;background:#000"></video>
      <div class="msg-meta" style="padding:2px 6px 4px">
        <span>${formatTime(data.timestamp)}</span>
        ${isMine ? renderTicks(data.status || 'sent') : ''}
      </div>`;
  } else if (data.type === 'audio') {
    bubble.classList.add('audio-bubble');
    const waveId = 'wave-' + data.id;
    const audioId = 'audio-' + data.id;
    const spdId = 'spd-' + data.id;
    const dur = formatDuration(data.duration || 0);
    const bars = Array.from({ length: 20 }, () => {
      const h = 4 + Math.floor(Math.random() * 18);
      return `<span style="height:${h}px"></span>`;
    }).join('');
    bubble.innerHTML = `
      <audio id="${audioId}" src="${data.content}" preload="none" style="display:none"></audio>
      <button class="audio-play-btn" onclick="toggleAudio('${audioId}','${waveId}',this,'${spdId}')">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div class="audio-waveform" id="${waveId}">${bars}</div>
      <button class="audio-speed-btn" id="${spdId}" onclick="changeAudioSpeed('${audioId}','${spdId}')">1×</button>
      <span class="audio-duration" id="dur-${data.id}">${dur}</span>
      <div class="msg-meta" style="margin-right:4px">
        <span>${formatTime(data.timestamp)}</span>
        ${isMine ? renderTicks(data.status || 'sent') : ''}
      </div>`;
  }

  row.appendChild(bubble);
  messagesList.appendChild(row);
  messageEls.set(data.id, row);

  // Add the heart reaction element
  const heartEl = document.createElement('div');
  heartEl.className = 'heart-reaction';
  heartEl.textContent = '❤️';
  bubble.appendChild(heartEl);

  // Double tap to like (Futuristic feature)
  let lastTap = 0;
  bubble.addEventListener('click', (e) => {
    // ignore clicks on media elements or buttons
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.closest('button')) return;
    
    const now = Date.now();
    if (now - lastTap < 300) {
      heartEl.classList.remove('animate');
      void heartEl.offsetWidth; // trigger reflow
      heartEl.classList.add('animate');
    }
    lastTap = now;
  });

  // Apply Messenger-style (Twemoji) emoji rendering to the message bubble
  if (!bubble.dataset.twemoji) {
    applyTwemoji(bubble);
    bubble.dataset.twemoji = "1";
  }

  return row;
}

/* ─────────────────── TICK STATUS ─────────────────── */
function updateMessageStatus(msgId, status) {
  const row = messageEls.get(msgId);
  if (!row) return;
  const ticksEl = row.querySelector('.ticks');
  if (!ticksEl) return;
  ticksEl.className = `ticks ${status}`;
  ticksEl.innerHTML = getTicksSvg(status);
}
function renderTicks(status) {
  return `<span class="ticks ${status}">${getTicksSvg(status)}</span>`;
}
function getTicksSvg(status) {
  if (status === 'sent') {
    return `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
  }
  if (status === 'delivered' || status === 'seen') {
    return `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M.41 13.41 6 19l1.41-1.42L1.83 12zm22.99-9.42L11 16.17l-4.19-4.18-1.42 1.41 5.61 5.6 14.01-14z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>`;
}

/* ─────────────────── AUDIO PLAYER ─────────────────── */
window.toggleAudio = function (audioId, waveId, btn, spdId) {
  const audio = document.getElementById(audioId);
  const wave = document.getElementById(waveId);
  if (!audio) return;

  if (audio.paused) {
    // Pause any other playing audio
    document.querySelectorAll('audio[id^="audio-"]').forEach(a => {
      if (a.id !== audioId && !a.paused) {
        a.pause();
        const ow = document.getElementById(a.id.replace('audio-', 'wave-'));
        if (ow) ow.classList.remove('playing');
        const ob = document.querySelector(`[onclick*="${a.id}"]`);
        if (ob) ob.innerHTML = '<svg viewBox="0 0 24 24"><path fill="white" d="M8 5v14l11-7z"/></svg>';
      }
    });
    audio.play();
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path fill="white" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    wave.classList.add('playing');
    
    const durEl = document.getElementById('dur-' + audioId.replace('audio-', ''));
    audio.ontimeupdate = () => { if (durEl) durEl.textContent = formatDuration(Math.floor(audio.currentTime)); };
    audio.onended = () => {
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path fill="white" d="M8 5v14l11-7z"/></svg>';
      wave.classList.remove('playing');
      if (durEl) durEl.textContent = formatDuration(Math.floor(audio.duration) || 0);
    };
  } else {
    audio.pause();
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path fill="white" d="M8 5v14l11-7z"/></svg>';
    wave.classList.remove('playing');
  }
};

/* ──────── Audio Speed Control ──────── */
window.changeAudioSpeed = function (audioId, btnId) {
  const audio = document.getElementById(audioId);
  const btn = document.getElementById(btnId);
  if (!audio || !btn) return;

  const speeds = [1, 1.5, 2];
  const labels = ['1×', '1.5×', '2×'];
  const cur = speeds.findIndex(s => Math.abs(s - audio.playbackRate) < 0.1);
  const next = (cur + 1) % speeds.length;
  audio.playbackRate = speeds[next];
  btn.textContent = labels[next];
  // Highlight when not at 1×
  btn.classList.toggle('active', next !== 0);
};

/* ─────────────────── IMAGE VIEWER ─────────────────── */
function openImageViewer(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  overlay.innerHTML = `<img src="${src}" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;" />`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

/* ─────────────────── MESSENGER EMOJI PICKER (Exact) ─────────────────── */

// Messenger category SVG icons — keyed to match EMOJI_CATEGORIES ids
const CAT_ICONS = {
  frequent: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>`,
  faces: `<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>`,
  gestures: `<svg viewBox="0 0 24 24"><path d="M21 7c0-1.1-.9-2-2-2h-2V3c0-1.1-.9-2-2-2s-2 .9-2 2v7.08A3.99 3.99 0 0 0 9 14v3c0 2.21 1.79 4 4 4h4c2.21 0 4-1.79 4-4V7zm-2 0v10c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2v-3a2 2 0 0 1 2-2c.55 0 1-.45 1-1V3h2v4.5c0 .28.22.5.5.5s.5-.22.5-.5V5h2z"/></svg>`,
  hearts: `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  celebration: `<svg viewBox="0 0 24 24"><path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/></svg>`,
  food: `<svg viewBox="0 0 24 24"><path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-3.5-3.37-4.99-7.54-4.99C4.34 10 1 11.49 1 14.99v1h15.03v-1z"/></svg>`,
  travel: `<svg viewBox="0 0 24 24"><path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/></svg>`,
  objects: `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 14h-4v-1h4v1zm0-3h-4v-1h4v1zm-2-3.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 2.5 12 2.5s3.5 1.57 3.5 3.5S13.93 9.5 12 9.5z"/></svg>`,
  symbols: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/></svg>`,
};

// Quick reactions (exactly like Messenger)
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function buildEmojiPicker() {
  emojiPicker.innerHTML = '';
  let currentCatIdx = 0;

  // ── 1. Search Bar (TOP) ──
  const header = document.createElement('div');
  header.className = 'ep-header';
  header.innerHTML = `
    <div class="ep-search-wrap">
      <svg class="ep-search-icon" viewBox="0 0 24 24" fill="none" stroke="#b0b3b8" stroke-width="2.2">
        <circle cx="11" cy="11" r="7.5"/>
        <path d="m20 20-4-4"/>
      </svg>
      <input class="ep-search-input" type="text" placeholder="بحث..." autocomplete="off" spellcheck="false">
    </div>`;
  emojiPicker.appendChild(header);

  // ── 2. Quick Reactions (exactly like Messenger) ──
  const reactionsRow = document.createElement('div');
  reactionsRow.className = 'ep-reactions';
  QUICK_REACTIONS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'ep-reaction-btn';
    btn.textContent = emoji;
    btn.title = emoji;
    btn.addEventListener('click', () => {
      insertAtCursor(msgInput, emoji);
      toggleSendMic();
      msgInput.focus();
      emojiPicker.classList.add('hidden');
      emojiBtn.classList.remove('emoji-btn-active');
    });
    reactionsRow.appendChild(btn);
  });
  emojiPicker.appendChild(reactionsRow);
  // Convert reactions to Twemoji (Messenger-style SVG emojis)
  applyTwemoji(reactionsRow);

  // ── 3. Scrollable Grid Area (MIDDLE) ──
  const gridArea = document.createElement('div');
  gridArea.className = 'ep-grid-area';
  gridArea.id = 'ep-grid-area';
  emojiPicker.appendChild(gridArea);

  // ── 4. Category Tabs (BOTTOM — like Messenger) ──
  const tabs = document.createElement('div');
  tabs.className = 'ep-tabs';

  EMOJI_CATEGORIES.forEach((cat, idx) => {
    const tab = document.createElement('button');
    tab.className = 'ep-tab' + (idx === 0 ? ' active' : '');
    tab.title = cat.label;
    tab.setAttribute('data-cat', cat.id);
    // Use SVG icon like Messenger does
    const iconSvg = CAT_ICONS[cat.id] || `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`;
    tab.innerHTML = iconSvg;

    tab.addEventListener('click', () => {
      document.querySelectorAll('.ep-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCatIdx = idx;
      // Scroll to section or reload
      renderAllCategories(idx);
      header.querySelector('.ep-search-input').value = '';
    });
    tabs.appendChild(tab);
  });
  emojiPicker.appendChild(tabs);

  // ── Search Logic ──
  const searchInput = header.querySelector('.ep-search-input');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (!q) {
      renderAllCategories(currentCatIdx);
      return;
    }
    // Search all emoji by char match
    const all = EMOJI_CATEGORIES.flatMap(c => c.emojis);
    const results = all.filter(e => e.startsWith(q) || e.includes(q));
    renderSearchResults(results.length ? results : QUICK_REACTIONS);
  });

  // ── Initial render: show all categories in one continuous scroll ──
  renderAllCategories(0);
}

// Render all categories as one continuous scrollable list (like Messenger)
function renderAllCategories(highlightIdx) {
  const gridArea = $('ep-grid-area');
  gridArea.innerHTML = '';

  EMOJI_CATEGORIES.forEach((cat, idx) => {
    // Section label
    const lbl = document.createElement('div');
    lbl.className = 'ep-section-label';
    lbl.textContent = cat.label;
    lbl.id = 'ep-sec-' + cat.id;
    gridArea.appendChild(lbl);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'ep-grid';
    cat.emojis.forEach(emoji => {
      grid.appendChild(makeEmojiBtn(emoji));
    });
    gridArea.appendChild(grid);
  });

  // Convert ALL emoji buttons to Twemoji (Messenger-style SVG)
  applyTwemoji(gridArea);

  // Scroll to highlighted category
  const targetSec = $('ep-sec-' + EMOJI_CATEGORIES[highlightIdx]?.id);
  if (targetSec && highlightIdx > 0) {
    setTimeout(() => { targetSec.scrollIntoView({ block: 'start' }); }, 50);
  } else {
    gridArea.scrollTop = 0;
  }
}

// Show search results
function renderSearchResults(emojis) {
  const gridArea = $('ep-grid-area');
  gridArea.innerHTML = '';

  const lbl = document.createElement('div');
  lbl.className = 'ep-section-label';
  lbl.textContent = 'نتائج البحث';
  gridArea.appendChild(lbl);

  const grid = document.createElement('div');
  grid.className = 'ep-grid';
  emojis.slice(0, 80).forEach(emoji => grid.appendChild(makeEmojiBtn(emoji)));
  gridArea.appendChild(grid);

  // Convert to Twemoji
  applyTwemoji(gridArea);
}

function makeEmojiBtn(emoji) {
  const btn = document.createElement('button');
  btn.className = 'ep-emoji';
  btn.textContent = emoji;
  btn.setAttribute('aria-label', emoji);
  btn.addEventListener('click', () => {
    insertAtCursor(msgInput, emoji);
    toggleSendMic();
    msgInput.focus();
    emojiPicker.classList.add('hidden');
    emojiBtn.classList.remove('emoji-btn-active');
  });
  return btn;
}

// Sync active tab when scrolling through sections
function syncTabOnScroll() {
  const gridArea = $('ep-grid-area');
  if (!gridArea) return;
  gridArea.addEventListener('scroll', () => {
    const scrollTop = gridArea.scrollTop;
    const sections = EMOJI_CATEGORIES.map(cat => ({
      id: cat.id,
      top: ($('ep-sec-' + cat.id)?.offsetTop || 0)
    }));
    let active = sections[0];
    for (const sec of sections) {
      if (scrollTop >= sec.top - 20) active = sec;
    }
    document.querySelectorAll('.ep-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.cat === active.id);
    });
  }, { passive: true });
}


function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.dispatchEvent(new Event('input'));
}

/* ─────────────────── BACKGROUND + THEME ─────────────────── */
function applyBackground(bg) {
  chatBg.className = '';
  if (bg === 'custom') return;
  chatBg.classList.add(bg + '-bg');
}
function handleCustomBg(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    chatBg.className = '';
    chatBg.style.backgroundImage = `url(${ev.target.result})`;
    chatBg.style.backgroundSize = 'cover';
    chatBg.style.backgroundPosition = 'center';
    bgOptions.forEach(o => o.classList.remove('active'));
    document.querySelector('[data-bg="custom"]').classList.add('active');
    localStorage.setItem('cf-bg', 'custom');
    localStorage.setItem('cf-custom-bg', ev.target.result);
  };
  reader.readAsDataURL(file);
}
function applyTheme(isDark) {
  document.body.classList.toggle('light-mode', !isDark);
}

/* ─────────────────── TYPING INDICATOR ─────────────────── */
function emitTyping() {
  if (!socket?.connected) return;
  clearTimeout(typingTimer);
  socket.emit('typing');
  typingTimer = setTimeout(() => { socket.emit('stop-typing'); }, 2000);
}
function emitStopTyping() {
  clearTimeout(typingTimer);
  if (socket?.connected) socket.emit('stop-typing');
}

/* ─────────────────── HELPERS ─────────────────── */
function toggleSendMic() {
  const hasText = msgInput.value.trim().length > 0;
  sendIcon.classList.toggle('hidden', !hasText);
  micIcon.classList.toggle('hidden', hasText);
}

function scrollToBottom(instant = false) {
  const delay = instant ? 0 : 30;
  setTimeout(() => { messagesArea.scrollTop = messagesArea.scrollHeight; }, delay);
}

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'system-msg';
  div.innerHTML = `<span>${text}</span>`;
  messagesList.appendChild(div);
  applyTwemoji(div);
  scrollToBottom();
}

function addDateSeparator(timestamp) {
  const div = document.createElement('div');
  div.className = 'date-sep';
  const today = new Date();
  const msgDate = new Date(timestamp);
  let label;
  if (msgDate.toDateString() === today.toDateString()) {
    label = 'اليوم';
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) {
      label = 'أمس';
    } else {
      label = msgDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  div.dataset.date = msgDate.toLocaleDateString('ar-EG');
  div.innerHTML = `<span>${label}</span>`;
  messagesList.appendChild(div);
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function playNotifySound() {
  try { notifySound.currentTime = 0; notifySound.play().catch(() => { }); } catch (e) { }
}
function showToast(msg, type = 'success') {
  if (!toastContainer) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
