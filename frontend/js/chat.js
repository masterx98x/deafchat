/**
 * DeafChat – Chat page logic.
 * Manages WebSocket connection, messages, member list.
 */
(function () {
  'use strict';

  // --- DOM refs ---
  const nicknameOverlay = document.getElementById('nickname-overlay');
  const nicknameForm = document.getElementById('nickname-form');
  const nicknameInput = document.getElementById('nickname-input');
  const overlayRoomName = document.getElementById('overlay-room-name');

  const chatApp = document.getElementById('chat-app');
  const chatRoomName = document.getElementById('chat-room-name');
  const membersCount = document.getElementById('members-count');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const messagesDiv = document.getElementById('messages');

  const shareBtn = document.getElementById('share-btn');
  const membersToggle = document.getElementById('members-toggle');
  const membersSidebar = document.getElementById('members-sidebar');
  const membersClose = document.getElementById('members-close');
  const membersList = document.getElementById('members-list');

  const toastContainer = document.getElementById('toast-container');
  const notifToggle = document.getElementById('notif-toggle');
  const countdownEl = document.getElementById('countdown');
  const micBtn = document.getElementById('mic-btn');
  const recordingBar = document.getElementById('recording-bar');
  const recTimerEl = document.getElementById('rec-timer');
  const recCancel = document.getElementById('rec-cancel');
  const recStop = document.getElementById('rec-stop');

  // --- State ---
  const roomId = window.location.pathname.split('/').pop();
  let ws = null;
  let nickname = '';
  let reconnectAttempts = 0;
  const MAX_RECONNECT = 5;
  let notificationsEnabled = false;
  let expiresAt = null;
  let countdownInterval = null;
  let roomExpiryMs = 30 * 60 * 1000; // default, updated from API
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStartTime = 0;
  let recTimerInterval = null;
  let _activeStream = null;
  const MAX_AUDIO_DURATION = 120;

  // --- Utils ---
  function showToast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `dc-toast dc-toast-${type}`;
    el.textContent = msg;
    toastContainer.appendChild(el);
    setTimeout(() => { el.classList.add('dc-toast-out'); }, 3000);
    setTimeout(() => { el.remove(); }, 3500);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // --- Notifications ---
  function canNotify() {
    return 'Notification' in window;
  }

  async function requestNotifPermission() {
    if (!canNotify()) {
      showToast('Il tuo browser non supporta le notifiche.', 'warning');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      showToast('Notifiche bloccate dal browser. Abilita dalle impostazioni.', 'warning');
      return false;
    }
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  function sendBrowserNotification(senderNick, content) {
    if (!notificationsEnabled || !canNotify() || Notification.permission !== 'granted') return;
    // Only notify when tab is not focused
    if (document.hasFocus()) return;
    try {
      const n = new Notification(senderNick, {
        body: content.length > 100 ? content.slice(0, 100) + '…' : content,
        icon: '/static/favicon.png',
        tag: 'deafchat-' + roomId,
        silent: false
      });
      n.addEventListener('click', () => {
        window.focus();
        n.close();
      });
      // Auto-close after 5s
      setTimeout(() => n.close(), 5000);
    } catch { /* some environments block new Notification() */ }
  }

  function updateNotifBtn() {
    if (!notifToggle) return;
    if (notificationsEnabled) {
      notifToggle.classList.add('dc-notif-active');
      notifToggle.setAttribute('aria-label', 'Disattiva notifiche');
      notifToggle.title = 'Notifiche attive';
    } else {
      notifToggle.classList.remove('dc-notif-active');
      notifToggle.setAttribute('aria-label', 'Attiva notifiche');
      notifToggle.title = 'Notifiche';
    }
  }

  // --- Audio Recording ---
  function canRecord() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined');
  }

  function formatRecTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updateRecTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    recTimerEl.textContent = formatRecTime(elapsed);
    if (elapsed >= MAX_AUDIO_DURATION) {
      stopRecording(true);
    }
  }

  async function startRecording() {
    if (!canRecord()) {
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        showToast('Gli audiomessaggi richiedono HTTPS. Chiedi all\'admin di abilitare SSL.', 'warning');
      } else {
        showToast('Il tuo browser non supporta la registrazione audio.', 'warning');
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _activeStream = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';
      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (_activeStream) {
          _activeStream.getTracks().forEach(t => t.stop());
          _activeStream = null;
        }
        if (audioChunks.length === 0) return; // cancelled

        const blob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
        const duration = Math.round((Date.now() - recordingStartTime) / 1000);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          if (!base64) return;
          if (base64.length > 1_500_000) {
            showToast('Audio troppo lungo. Riduci la durata.', 'error');
            return;
          }
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'audio',
              audio_data: base64,
              audio_duration: duration
            }));
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(250);
      recordingStartTime = Date.now();
      recordingBar.hidden = false;
      messageForm.style.display = 'none';
      recTimerEl.textContent = '0:00';
      recTimerInterval = setInterval(updateRecTimer, 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showToast('Permesso microfono negato. Abilita dalle impostazioni.', 'warning');
      } else {
        showToast("Errore accesso al microfono.", 'error');
      }
    }
  }

  function stopRecording(send = true) {
    if (recTimerInterval) { clearInterval(recTimerInterval); recTimerInterval = null; }
    recordingBar.hidden = true;
    messageForm.style.display = '';
    if (!send) audioChunks = [];
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    } else if (_activeStream) {
      _activeStream.getTracks().forEach(t => t.stop());
      _activeStream = null;
    }
    mediaRecorder = null;
  }

  // --- Load room info ---
  async function loadRoomInfo() {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) return;
      const data = await res.json();
      chatRoomName.textContent = data.room_name || 'Chat';
      overlayRoomName.textContent = data.room_name || 'Chat';
      document.title = `${data.room_name || 'Chat'} – DeafChat`;

      // Start countdown timer
      if (data.expires_at) {
        expiresAt = new Date(data.expires_at);
        roomExpiryMs = (data.expiry_minutes || 30) * 60 * 1000;
        startCountdown();
      }
    } catch {
      // ignore
    }
  }

  // --- Countdown timer ---
  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown(); // immediate first tick
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    if (!expiresAt || !countdownEl) return;
    const now = new Date();
    const diff = expiresAt - now;

    if (diff <= 0) {
      countdownEl.textContent = '💥 Scaduta';
      countdownEl.classList.add('dc-countdown-expired');
      clearInterval(countdownInterval);
      showToast('La stanza è scaduta. I messaggi sono stati cancellati.', 'warning');
      return;
    }

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;

    let label;
    if (h > 0) {
      label = `${h}h ${m.toString().padStart(2, '0')}m`;
    } else {
      label = `${m}:${secs.toString().padStart(2, '0')}`;
    }

    countdownEl.textContent = `⏳ ${label}`;

    // Visual warning when < 2 minutes
    if (diff < 120000) {
      countdownEl.classList.add('dc-countdown-warn');
    } else {
      countdownEl.classList.remove('dc-countdown-warn');
    }
  }

  // --- WebSocket ---
  function connectWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws/${roomId}`);

    ws.addEventListener('open', () => {
      reconnectAttempts = 0;
      // Send join
      ws.send(JSON.stringify({ type: 'join', nickname }));
    });

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      handleMessage(msg);
    });

    ws.addEventListener('close', (event) => {
      if (event.code === 4002) {
        showToast('Nickname già in uso. Ricarica e scegli un altro nome.', 'error');
        nicknameOverlay.hidden = false;
        chatApp.hidden = true;
        return;
      }
      if (event.code === 4004) {
        showToast('Stanza non trovata o scaduta.', 'error');
        return;
      }
      if (event.code === 4003) {
        showToast('Stanza piena.', 'error');
        return;
      }
      // Attempt reconnect
      if (reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        showToast(`Connessione persa. Riconnessione in ${Math.round(delay / 1000)}s…`, 'warning');
        setTimeout(connectWS, delay);
      } else {
        showToast('Impossibile riconnettersi. Ricarica la pagina.', 'error');
      }
    });

    ws.addEventListener('error', () => {
      // error fires before close, just ignore here
    });
  }

  function handleMessage(msg) {
    // Any activity means the server touched the room → reset countdown
    if (expiresAt && (msg.type === 'message' || msg.type === 'system')) {
      expiresAt = new Date(Date.now() + roomExpiryMs);
    }

    switch (msg.type) {
      case 'message':
        appendChatMessage(msg);
        break;
      case 'audio':
        appendAudioMessage(msg);
        break;
      case 'system':
        appendSystemMessage(msg.content, msg.timestamp);
        break;
      case 'members':
        updateMembers(msg.members || []);
        break;
      case 'error':
        showToast(msg.content, 'error');
        break;
    }
  }

  // --- Rendering ---
  function appendChatMessage(msg) {
    const isMe = msg.nickname === nickname;
    const wrapper = document.createElement('div');
    wrapper.className = `dc-msg ${isMe ? 'dc-msg-mine' : 'dc-msg-other'}`;

    wrapper.innerHTML = `
      <div class="dc-msg-bubble">
        ${!isMe ? `<span class="dc-msg-nick">${escapeHtml(msg.nickname)}</span>` : ''}
        <span class="dc-msg-text">${escapeHtml(msg.content)}</span>
        <span class="dc-msg-time">${formatTime(msg.timestamp)}</span>
      </div>
    `;
    messagesDiv.appendChild(wrapper);
    scrollToBottom();

    // Browser notification for messages from others
    if (!isMe) {
      sendBrowserNotification(msg.nickname, msg.content);
    }
  }

  function appendAudioMessage(msg) {
    const isMe = msg.nickname === nickname;
    const wrapper = document.createElement('div');
    wrapper.className = `dc-msg ${isMe ? 'dc-msg-mine' : 'dc-msg-other'}`;

    // Decode base64 → blob → object URL
    const raw = atob(msg.audio_data);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    const blob = new Blob([buf], { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);

    const dur = msg.audio_duration || 0;
    const durLabel = dur > 0
      ? `${Math.floor(dur / 60)}:${(dur % 60).toString().padStart(2, '0')}`
      : '';

    const bubble = document.createElement('div');
    bubble.className = 'dc-msg-bubble dc-msg-audio-bubble';

    if (!isMe) {
      const nickEl = document.createElement('span');
      nickEl.className = 'dc-msg-nick';
      nickEl.textContent = msg.nickname;
      bubble.appendChild(nickEl);
    }

    const player = document.createElement('div');
    player.className = 'dc-audio-player';
    const icon = document.createElement('span');
    icon.className = 'dc-audio-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '\uD83C\uDFA4';
    player.appendChild(icon);

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = url;
    player.appendChild(audio);

    if (durLabel) {
      const durEl = document.createElement('span');
      durEl.className = 'dc-audio-duration';
      durEl.textContent = durLabel;
      player.appendChild(durEl);
    }

    bubble.appendChild(player);

    const timeEl = document.createElement('span');
    timeEl.className = 'dc-msg-time';
    timeEl.textContent = formatTime(msg.timestamp);
    bubble.appendChild(timeEl);

    wrapper.appendChild(bubble);
    messagesDiv.appendChild(wrapper);
    scrollToBottom();

    if (!isMe) sendBrowserNotification(msg.nickname, '\uD83C\uDFA4 Audiomessaggio');
  }

  function appendSystemMessage(content, timestamp) {
    const el = document.createElement('div');
    el.className = 'dc-msg-system';
    el.innerHTML = `<span>${escapeHtml(content)}</span><span class="dc-msg-time">${formatTime(timestamp)}</span>`;
    messagesDiv.appendChild(el);
    scrollToBottom();
  }

  function updateMembers(members) {
    membersCount.textContent = `${members.length} partecipant${members.length === 1 ? 'e' : 'i'}`;
    membersList.innerHTML = '';
    members.forEach((name) => {
      const li = document.createElement('li');
      li.className = 'dc-member-item';
      li.innerHTML = `<span class="dc-member-dot"></span> ${escapeHtml(name)}${name === nickname ? ' <em>(tu)</em>' : ''}`;
      membersList.appendChild(li);
    });
  }

  // --- Event listeners ---
  nicknameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = nicknameInput.value.trim();
    if (!val) return;
    nickname = val.slice(0, 30);
    // Store nickname for convenience
    // S8: store with 24 h expiry
    try { localStorage.setItem('deafchat_nickname', JSON.stringify({ v: nickname, ts: Date.now() })); } catch {}
    nicknameOverlay.hidden = true;
    chatApp.hidden = false;
    messageInput.focus();
    connectWS();
  });

  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'message', content: text }));
    messageInput.value = '';
    messageInput.focus();
  });

  shareBtn.addEventListener('click', () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copiato negli appunti!', 'success');
    }).catch(() => {
      showToast(url, 'info');
    });
  });

  membersToggle.addEventListener('click', () => {
    membersSidebar.hidden = !membersSidebar.hidden;
  });

  membersClose.addEventListener('click', () => {
    membersSidebar.hidden = true;
  });

  // Mic / recording
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') return;
      startRecording();
    });
  }
  if (recCancel) {
    recCancel.addEventListener('click', () => stopRecording(false));
  }
  if (recStop) {
    recStop.addEventListener('click', () => stopRecording(true));
  }

  // Notification toggle
  if (notifToggle) {
    notifToggle.addEventListener('click', async () => {
      if (notificationsEnabled) {
        notificationsEnabled = false;
        showToast('Notifiche disattivate.', 'info');
      } else {
        const ok = await requestNotifPermission();
        if (ok) {
          notificationsEnabled = true;
          showToast('Notifiche attivate per questa sessione.', 'success');
        }
      }
      updateNotifBtn();
    });
  }

  // Handle keyboard: Escape closes sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !membersSidebar.hidden) {
      membersSidebar.hidden = true;
    }
  });

  // --- Init ---
  // Restore nickname if previously set
  // S8: nickname with 24 h expiry
  try {
    const raw = localStorage.getItem('deafchat_nickname');
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.ts && Date.now() - d.ts < 86_400_000) nicknameInput.value = d.v;
        else localStorage.removeItem('deafchat_nickname');
      } catch { localStorage.removeItem('deafchat_nickname'); }
    }
  } catch {}

  loadRoomInfo();
})();
