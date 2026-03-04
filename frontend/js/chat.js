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
  const MAX_RECONNECT = 20;
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
  let _swRegistration = null;
  let _wakeLockRef = null;

  // --- Video call state ---
  const videocallBtn = document.getElementById('videocall-btn');
  const callIncoming = document.getElementById('call-incoming');
  const callFromNick = document.getElementById('call-from-nick');
  const callAcceptBtn = document.getElementById('call-accept-btn');
  const callRejectBtn = document.getElementById('call-reject-btn');
  const videocallOverlay = document.getElementById('videocall-overlay');
  const remoteVideo = document.getElementById('remote-video');
  const localVideo = document.getElementById('local-video');
  const videocallStatus = document.getElementById('videocall-status');
  const vcallToggleAudio = document.getElementById('vcall-toggle-audio');
  const vcallToggleVideo = document.getElementById('vcall-toggle-video');
  const vcallHangup = document.getElementById('vcall-hangup');

  let peerConnection = null;
  let localStream = null;
  let isInCall = false;
  let isCaller = false;
  let roomIsPrivate = false;
  let audioEnabled = true;
  let videoEnabled = true;

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  // --- Service Worker registration ---
  async function registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        _swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch { /* SW not supported or failed */ }
    }
  }
  registerSW();

  // --- Web Lock: keeps page alive in background ---
  function acquireWebLock() {
    if (navigator.locks) {
      navigator.locks.request('deafchat-keepalive-' + roomId, { mode: 'exclusive', ifAvailable: false }, () => {
        // This promise never resolves → lock is held for the lifetime of the page
        return new Promise(() => {});
      }).catch(() => {});
    }
  }

  // --- Wake Lock: prevents screen/CPU sleep on mobile ---
  async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        _wakeLockRef = await navigator.wakeLock.request('screen');
        _wakeLockRef.addEventListener('release', () => { _wakeLockRef = null; });
      } catch { /* wake lock not available */ }
    }
  }
  // Re-acquire wake lock when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !_wakeLockRef) {
      acquireWakeLock();
    }
  });

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

    // Prefer Service Worker notifications (work better in background / screen off)
    if (_swRegistration && _swRegistration.active) {
      _swRegistration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: senderNick,
        body: content.length > 100 ? content.slice(0, 100) + '…' : content,
        tag: 'deafchat-' + roomId,
        url: window.location.pathname,
      });
      return;
    }

    // Fallback: direct Notification API
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
              audio_duration: duration,
              audio_mime: mimeType || 'audio/webm'
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

      // Enable video call button for private rooms
      if (data.room_type === 'private') {
        roomIsPrivate = true;
        if (videocallBtn) videocallBtn.hidden = false;
      }

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
      // --- WebRTC video call signaling ---
      case 'call_request':
        handleCallRequest(msg);
        break;
      case 'call_accept':
        handleCallAccept(msg);
        break;
      case 'call_reject':
        handleCallReject(msg);
        break;
      case 'call_offer':
        handleCallOffer(msg);
        break;
      case 'call_answer':
        handleCallAnswer(msg);
        break;
      case 'call_ice':
        handleCallIce(msg);
        break;
      case 'call_end':
        handleCallEnd(msg);
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
    const audioMime = msg.audio_mime || 'audio/webm';
    const raw = atob(msg.audio_data);
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    const blob = new Blob([buf], { type: audioMime });
    const url = URL.createObjectURL(blob);

    const dur = msg.audio_duration || 0;

    function fmtDur(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    const bubble = document.createElement('div');
    bubble.className = 'dc-msg-bubble dc-msg-audio-bubble';

    if (!isMe) {
      const nickEl = document.createElement('span');
      nickEl.className = 'dc-msg-nick';
      nickEl.textContent = msg.nickname;
      bubble.appendChild(nickEl);
    }

    // Custom audio player
    const player = document.createElement('div');
    player.className = 'dc-audio-player';

    const playBtn = document.createElement('button');
    playBtn.className = 'dc-audio-play-btn';
    playBtn.setAttribute('aria-label', 'Play audio');
    playBtn.innerHTML = `<svg class="dc-audio-icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>`;
    player.appendChild(playBtn);

    const trackWrap = document.createElement('div');
    trackWrap.className = 'dc-audio-track-wrap';

    // Waveform bars (decorative)
    const waveform = document.createElement('div');
    waveform.className = 'dc-audio-waveform';
    const barHeights = [35,55,40,70,50,80,45,65,55,75,40,60,50,70,45,55,65,50,40,60,55,70,45,50,35];
    barHeights.forEach(h => {
      const bar = document.createElement('div');
      bar.className = 'dc-audio-bar';
      bar.style.height = h + '%';
      waveform.appendChild(bar);
    });
    trackWrap.appendChild(waveform);

    // Progress overlay
    const progress = document.createElement('div');
    progress.className = 'dc-audio-progress';
    trackWrap.appendChild(progress);

    player.appendChild(trackWrap);

    const durEl = document.createElement('span');
    durEl.className = 'dc-audio-duration';
    durEl.textContent = fmtDur(dur);
    player.appendChild(durEl);

    bubble.appendChild(player);

    const timeEl = document.createElement('span');
    timeEl.className = 'dc-msg-time';
    timeEl.textContent = formatTime(msg.timestamp);
    bubble.appendChild(timeEl);

    wrapper.appendChild(bubble);
    messagesDiv.appendChild(wrapper);
    scrollToBottom();

    // Hidden audio element for playback
    const audio = new Audio(url);
    audio.preload = 'metadata';
    let playing = false;

    playBtn.addEventListener('click', () => {
      if (playing) {
        audio.pause();
      } else {
        audio.play();
      }
    });

    audio.addEventListener('play', () => {
      playing = true;
      playBtn.innerHTML = `<svg class="dc-audio-icon-pause" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>`;
      playBtn.classList.add('dc-audio-playing');
    });

    audio.addEventListener('pause', () => {
      playing = false;
      playBtn.innerHTML = `<svg class="dc-audio-icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>`;
      playBtn.classList.remove('dc-audio-playing');
    });

    audio.addEventListener('ended', () => {
      playing = false;
      playBtn.innerHTML = `<svg class="dc-audio-icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>`;
      playBtn.classList.remove('dc-audio-playing');
      progress.style.width = '0%';
      durEl.textContent = fmtDur(dur);
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        progress.style.width = pct + '%';
        durEl.textContent = fmtDur(audio.currentTime);
      }
    });

    // Click on waveform to seek
    trackWrap.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = trackWrap.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pct * audio.duration;
      if (!playing) audio.play();
    });

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
  // --- WebRTC Video Call ---

  async function getLocalStream() {
    if (localStream) return localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
      audioEnabled = true;
      videoEnabled = true;
      updateVcallControls();
      return localStream;
    } catch (err) {
      showToast('Impossibile accedere a camera/microfono.', 'error');
      return null;
    }
  }

  function createPeerConnection() {
    peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_ice',
          ice: JSON.stringify(event.candidate),
        }));
      }
    };

    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
      videocallStatus.textContent = 'In chiamata';
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        videocallStatus.textContent = 'In chiamata';
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        endCall(false);
      }
    };

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    return peerConnection;
  }

  function showCallUI() {
    isInCall = true;
    videocallOverlay.hidden = false;
    videocallStatus.textContent = 'Connessione...';
  }

  function hideCallUI() {
    isInCall = false;
    videocallOverlay.hidden = true;
    callIncoming.hidden = true;
  }

  function cleanupCall() {
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    hideCallUI();
    isCaller = false;
    audioEnabled = true;
    videoEnabled = true;
  }

  function endCall(notify = true) {
    if (notify && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'call_end' }));
    }
    cleanupCall();
  }

  // Caller: initiate call request
  async function initiateCall() {
    if (isInCall) return;
    const stream = await getLocalStream();
    if (!stream) return;

    isCaller = true;
    showCallUI();
    videocallStatus.textContent = 'In attesa di risposta...';

    // Send call request to the other user
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'call_request' }));
    }
  }

  // Callee: received a call request
  function handleCallRequest(msg) {
    if (isInCall) return; // busy
    callFromNick.textContent = msg.nickname + ' ti sta chiamando...';
    callIncoming.hidden = false;
    sendBrowserNotification(msg.nickname, '📹 Videochiamata in arrivo');
  }

  // Callee: accept the call
  async function acceptCall() {
    callIncoming.hidden = true;
    const stream = await getLocalStream();
    if (!stream) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'call_reject' }));
      }
      return;
    }
    isCaller = false;
    showCallUI();

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'call_accept' }));
    }
    // Wait for caller to send offer
  }

  // Callee: reject the call
  function rejectCall() {
    callIncoming.hidden = true;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'call_reject' }));
    }
  }

  // Caller: other user accepted → create offer
  async function handleCallAccept(msg) {
    if (!isCaller) return;
    videocallStatus.textContent = 'Connessione in corso...';

    createPeerConnection();

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_offer',
          sdp: JSON.stringify(offer),
        }));
      }
    } catch (err) {
      showToast('Errore nella creazione della chiamata.', 'error');
      endCall();
    }
  }

  // Caller: other user rejected
  function handleCallReject(msg) {
    showToast(msg.nickname + ' ha rifiutato la chiamata.', 'warning');
    cleanupCall();
  }

  // Callee: received SDP offer → create answer
  async function handleCallOffer(msg) {
    if (isCaller) return;

    createPeerConnection();

    try {
      const offer = JSON.parse(msg.sdp);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_answer',
          sdp: JSON.stringify(answer),
        }));
      }
    } catch (err) {
      showToast('Errore nella risposta alla chiamata.', 'error');
      endCall();
    }
  }

  // Caller: received SDP answer
  async function handleCallAnswer(msg) {
    if (!peerConnection) return;
    try {
      const answer = JSON.parse(msg.sdp);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      showToast('Errore nella connessione.', 'error');
      endCall();
    }
  }

  // Both: received ICE candidate
  async function handleCallIce(msg) {
    if (!peerConnection) return;
    try {
      const candidate = JSON.parse(msg.ice);
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore ICE errors (non-critical)
    }
  }

  // Other user ended the call
  function handleCallEnd(msg) {
    showToast(msg.nickname + ' ha terminato la chiamata.', 'info');
    cleanupCall();
  }

  // Toggle audio/video
  function updateVcallControls() {
    if (vcallToggleAudio) vcallToggleAudio.textContent = audioEnabled ? '🎤' : '🔇';
    if (vcallToggleVideo) vcallToggleVideo.textContent = videoEnabled ? '📹' : '📷';
  }

  // Video call button event listeners
  if (videocallBtn) {
    videocallBtn.addEventListener('click', initiateCall);
  }
  if (callAcceptBtn) {
    callAcceptBtn.addEventListener('click', acceptCall);
  }
  if (callRejectBtn) {
    callRejectBtn.addEventListener('click', rejectCall);
  }
  if (vcallHangup) {
    vcallHangup.addEventListener('click', () => endCall(true));
  }
  if (vcallToggleAudio) {
    vcallToggleAudio.addEventListener('click', () => {
      if (!localStream) return;
      audioEnabled = !audioEnabled;
      localStream.getAudioTracks().forEach(t => { t.enabled = audioEnabled; });
      updateVcallControls();
    });
  }
  if (vcallToggleVideo) {
    vcallToggleVideo.addEventListener('click', () => {
      if (!localStream) return;
      videoEnabled = !videoEnabled;
      localStream.getVideoTracks().forEach(t => { t.enabled = videoEnabled; });
      updateVcallControls();
    });
  }

  // --- Original Event listeners ---
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
    acquireWebLock();
    acquireWakeLock();
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

  // --- Reconnect when tab becomes visible again ---
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && nickname) {
      // If WS is closed or closing, reconnect
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        reconnectAttempts = 0;
        showToast('Riconnessione in corso…', 'info');
        connectWS();
      }
    }
  });

  // --- Keep-alive ping to prevent idle disconnection ---
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Send a no-op to keep the connection alive
      try { ws.send(JSON.stringify({ type: 'message', content: '' })); } catch {}
    }
  }, 25000);

  loadRoomInfo();
})();
