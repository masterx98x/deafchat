/**
 * DeafChat – Landing page logic.
 * Handles room creation and link sharing.
 */
(function () {
  'use strict';

  const form = document.getElementById('create-room-form');
  const createBtn = document.getElementById('create-btn');
  const resultSection = document.getElementById('room-result');
  const roomLinkInput = document.getElementById('room-link');
  const copyBtn = document.getElementById('copy-link-btn');
  const goToRoom = document.getElementById('go-to-room');
  const newRoomBtn = document.getElementById('new-room-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    createBtn.disabled = true;
    createBtn.textContent = 'Creazione in corso…';

    const roomName = form.room_name.value.trim();
    const roomType = form.room_type.value;
    const expiryMinutes = parseInt(form.expiry_minutes.value, 10) || 30;

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_name: roomName, room_type: roomType, expiry_minutes: expiryMinutes }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      roomLinkInput.value = data.link;
      goToRoom.href = `/chat/${data.room_id}`;
      resultSection.hidden = false;
      form.closest('.dc-hero').classList.add('dc-hero--collapsed');
    } catch (err) {
      alert('Errore nella creazione della stanza. Riprova.');
      console.error(err);
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = 'Crea stanza';
    }
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomLinkInput.value).then(() => {
      copyBtn.textContent = '✅ Copiato!';
      setTimeout(() => { copyBtn.textContent = '📋 Copia'; }, 2000);
    });
  });

  newRoomBtn.addEventListener('click', () => {
    resultSection.hidden = true;
    form.closest('.dc-hero').classList.remove('dc-hero--collapsed');
    form.reset();
  });
})();
