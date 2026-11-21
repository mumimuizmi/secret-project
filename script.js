'use strict';

(() => {
  const STORAGE_KEY = 'romantic_web_notes_v3';

  const DEFAULT_NOTES = [
    {
      content:
        'haiii sall, eumm aku mau minta maaf yaa soal kejadian kemarinn lusaa. akuu nyadar koo sebelumnya kamuu udaa perna bilang gasuka ditanya tanyaa soal hal yang kaya gituu, tapi kemarin aku malah nanyain lagii.\n\n' +
        'harusnyaa akuu bisa lebii ingett dan ngehargain hal² yang udaa pernaa kamu bilang ke akuu. aku tauu mungkin niatku cuma pengen tau keadaanmu, tapii akuu harusnya belajar mahamin kalo ga semua hal nyaman buat kamuu ceritainn.\n\n' +
        'makasii yaa kemarin kamu udaa mau jelasin semuanya ke akuu, bahkan kamuu masii sempet minta maaf atas responmu ke aku kemarinn:(( padahall kalo dipikir² aku yang salah kemarinn karna akuu belum bisaa ngertiin kamu sepenuhnya.\n\n' +
        'ke depannyaa aku bakal lebii ngertiin kamu lagii dan ga ngulangin hal yang samaa kaya kemarinn. kamu jugaa ga perluu ngerasa gaenakann buat nyampein kalo ada sikapku yang bikin kamu kurang nyaman yaaa.\n\n' +
        'sekali lagii aku minta maaf yaa, salll❤️'
    }
  ];

  // DOM Elements
  const envelopeView = document.getElementById('envelopeView');
  const envelopeTrigger = document.getElementById('envelopeTrigger');
  const noteView = document.getElementById('noteView');

  const noteContentDisplay = document.getElementById('noteContentDisplay');

  const notePager = document.getElementById('notePager');
  const prevNoteBtn = document.getElementById('prevNoteBtn');
  const nextNoteBtn = document.getElementById('nextNoteBtn');
  const noteCounter = document.getElementById('noteCounter');

  const noteReadMode = document.getElementById('noteReadMode');
  const noteEditMode = document.getElementById('noteEditMode');
  const noteActionsFooter = document.getElementById('noteActionsFooter');

  const noteContentInput = document.getElementById('noteContentInput');

  const closeEnvelopeBtn = document.getElementById('closeEnvelopeBtn');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const editNoteBtn = document.getElementById('editNoteBtn');
  const shareNoteBtn = document.getElementById('shareNoteBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const deleteNoteBtn = document.getElementById('deleteNoteBtn');

  const toastEl = document.getElementById('toast');
  const petalsCanvas = document.getElementById('petalsCanvas');

  // Application State
  let notes = [];
  let activeIndex = 0;
  let editingIndex = null; // null = not editing, -1 = new note, >= 0 = edit existing
  let isTransitioning = false;
  let toastTimer = null;

  // ========================================================================
  // Storage & URL Hash Sharing Utilities
  // ========================================================================

  function normalizeNotes(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((item) => item && typeof item.content === 'string' && item.content.trim().length > 0)
      .map((item) => ({ content: item.content }));
  }

  function encodePayload(data) {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodePayload(encoded) {
    try {
      let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      const normalized = normalizeNotes(JSON.parse(json));
      return normalized.length > 0 ? normalized : null;
    } catch (_) {
      return null;
    }
  }

  function loadInitialNotes() {
    const hash = window.location.hash || '';
    if (hash.startsWith('#note=')) {
      const shared = decodePayload(hash.slice(6));
      if (shared && shared.length > 0) {
        return shared;
      }
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const normalized = normalizeNotes(JSON.parse(saved));
        if (normalized.length > 0) {
          return normalized;
        }
      }
    } catch (_) {
      // Ignore storage access errors (e.g. restricted environments)
    }

    return DEFAULT_NOTES.map((item) => ({ ...item }));
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (_) {
      // Ignore storage errors gracefully
    }
  }

  // ========================================================================
  // Toast Helper
  // ========================================================================

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 2800);
  }

  // ========================================================================
  // Heart Burst Particles on Click
  // ========================================================================

  function spawnHeartBurst(originEl) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const symbols = ['♥', '♡', '❤', '✦'];
    const colors = ['#c84562', '#e46984', '#a8223f', '#cfa27e'];

    for (let i = 0; i < 16; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'burst-heart';
      particle.textContent = symbols[i % symbols.length];
      particle.style.left = `${cx}px`;
      particle.style.top = `${cy}px`;
      particle.style.color = colors[i % colors.length];
      particle.style.fontSize = `${0.85 + Math.random() * 0.9}rem`;

      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.35;
      const distance = 65 + Math.random() * 115;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 35;
      const rot = (Math.random() - 0.5) * 60;
      const dur = 0.85 + Math.random() * 0.55;

      particle.style.setProperty('--tx', `${tx.toFixed(1)}px`);
      particle.style.setProperty('--ty', `${ty.toFixed(1)}px`);
      particle.style.setProperty('--rot', `${rot.toFixed(1)}deg`);
      particle.style.setProperty('--dur', `${dur.toFixed(2)}s`);

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), dur * 1000 + 60);
    }
  }

  // ========================================================================
  // Envelope Open / Close Transitions
  // ========================================================================

  function openEnvelope() {
    if (isTransitioning || envelopeTrigger.classList.contains('is-opening')) return;
    isTransitioning = true;

    envelopeTrigger.classList.add('is-opening');
    envelopeTrigger.setAttribute('aria-expanded', 'true');
    spawnHeartBurst(envelopeTrigger);

    // Wait for flap flip + letter peek animation, then smoothly reveal full note
    setTimeout(() => {
      envelopeView.classList.add('is-fading-out');
    }, 940);

    setTimeout(() => {
      envelopeView.classList.add('is-hidden');
      envelopeView.classList.remove('is-fading-out');

      renderActiveNote();
      noteView.classList.remove('is-hidden');
      noteView.setAttribute('aria-hidden', 'false');
      isTransitioning = false;
    }, 1260);
  }

  function closeEnvelope() {
    if (isTransitioning) return;
    isTransitioning = true;

    exitEditMode();
    noteView.classList.add('is-hidden');
    noteView.setAttribute('aria-hidden', 'true');

    // Show envelope in open state briefly, then animate folding closed
    envelopeView.classList.remove('is-hidden', 'is-fading-out');
    envelopeTrigger.classList.add('is-opening');
    envelopeTrigger.setAttribute('aria-expanded', 'false');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        envelopeTrigger.classList.remove('is-opening');
        setTimeout(() => {
          isTransitioning = false;
          envelopeTrigger.focus({ preventScroll: true });
        }, 850);
      });
    });
  }

  // ========================================================================
  // Rendering & Editing Notes
  // ========================================================================

  function renderActiveNote() {
    if (notes.length === 0) {
      notes = DEFAULT_NOTES.map((item) => ({ ...item }));
    }
    activeIndex = Math.max(0, Math.min(activeIndex, notes.length - 1));
    const current = notes[activeIndex];

    // Render paragraphs safely without innerHTML injection
    noteContentDisplay.textContent = '';
    const paragraphs = (current.content || '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      paragraphs.push(current.content || '');
    }

    paragraphs.forEach((paragraphText, idx) => {
      const p = document.createElement('p');
      p.style.animationDelay = `${0.08 + idx * 0.12}s`;

      // Preserve single line breaks inside a paragraph
      const lines = paragraphText.split('\n');
      lines.forEach((line, lineIdx) => {
        p.appendChild(document.createTextNode(line));
        if (lineIdx < lines.length - 1) {
          p.appendChild(document.createElement('br'));
        }
      });

      noteContentDisplay.appendChild(p);
    });

    // Update pager visibility and counter
    noteCounter.textContent = `${activeIndex + 1} / ${notes.length}`;
    notePager.style.visibility = notes.length > 1 ? 'visible' : 'hidden';
  }

  function enterEditMode(isNew) {
    editingIndex = isNew ? -1 : activeIndex;

    if (isNew) {
      noteContentInput.value = '';
      deleteNoteBtn.classList.add('is-hidden');
    } else {
      const current = notes[activeIndex];
      noteContentInput.value = current.content || '';
      deleteNoteBtn.classList.toggle('is-hidden', notes.length <= 1);
    }

    noteReadMode.classList.add('is-hidden');
    noteActionsFooter.classList.add('is-hidden');
    notePager.style.visibility = 'hidden';
    noteEditMode.classList.remove('is-hidden');
    noteContentInput.focus();
  }

  function exitEditMode() {
    editingIndex = null;
    noteEditMode.classList.add('is-hidden');
    noteReadMode.classList.remove('is-hidden');
    noteActionsFooter.classList.remove('is-hidden');
    notePager.style.visibility = notes.length > 1 ? 'visible' : 'hidden';
  }

  function handleSaveNote(event) {
    event.preventDefault();

    const contentVal = noteContentInput.value.trim();

    if (!contentVal) {
      showToast('Mohon isi catatannya terlebih dahulu');
      noteContentInput.focus();
      return;
    }

    const updatedNote = { content: contentVal };

    if (editingIndex === -1) {
      notes.push(updatedNote);
      activeIndex = notes.length - 1;
      showToast('Catatan baru ditambahkan');
    } else if (editingIndex !== null && notes[editingIndex]) {
      notes[editingIndex] = updatedNote;
      showToast('Catatan berhasil diperbarui');
    }

    saveNotes();
    exitEditMode();
    renderActiveNote();
  }

  function handleDeleteNote() {
    if (notes.length <= 1) return;
    notes.splice(activeIndex, 1);
    activeIndex = Math.max(0, activeIndex - 1);
    saveNotes();
    exitEditMode();
    renderActiveNote();
    showToast('Catatan telah dihapus');
  }

  async function handleShareLink() {
    const encoded = encodePayload(notes);
    const baseUrl = window.location.href.split('#')[0];
    const shareUrl = `${baseUrl}#note=${encoded}`;

    try {
      window.history.replaceState(null, '', `#note=${encoded}`);
    } catch (_) {
      // Ignore if file:// restricts replaceState in certain browsers
    }

    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch (_) {
        copied = false;
      }
    }

    if (!copied) {
      const helper = document.createElement('textarea');
      helper.value = shareUrl;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      try {
        copied = document.execCommand('copy');
      } catch (_) {
        copied = false;
      }
      helper.remove();
    }

    if (copied) {
      showToast('Link disalin');
    } else {
      showToast('URL diperbarui');
    }
  }

  // ========================================================================
  // Ambient Rose Petals & Sparkles Canvas
  // ========================================================================

  function initPetalsCanvas() {
    if (!petalsCanvas) return;
    const ctx = petalsCanvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let petals = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      petalsCanvas.width = Math.floor(width * dpr);
      petalsCanvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createPetal(randomY) {
      const isSparkle = Math.random() < 0.25;
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : -20 - Math.random() * 60,
        size: isSparkle ? 1.8 + Math.random() * 2.2 : 6 + Math.random() * 8,
        speedY: 0.35 + Math.random() * 0.65,
        speedX: (Math.random() - 0.5) * 0.45,
        swayAmp: 0.3 + Math.random() * 0.6,
        swayFreq: 0.008 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.025,
        opacity: isSparkle ? 0.35 + Math.random() * 0.4 : 0.35 + Math.random() * 0.38,
        isSparkle,
        color:
          Math.random() < 0.5
            ? 'rgba(224, 114, 138, 1)'
            : 'rgba(244, 168, 184, 1)'
      };
    }

    function populate() {
      const count = Math.min(34, Math.max(14, Math.floor(width / 42)));
      petals = Array.from({ length: count }, () => createPetal(true));
    }

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;

      if (p.isSparkle) {
        ctx.fillStyle = 'rgba(224, 165, 130, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.bezierCurveTo(
          p.size * 0.85,
          -p.size * 0.65,
          p.size * 0.85,
          p.size * 0.65,
          0,
          p.size
        );
        ctx.bezierCurveTo(
          -p.size * 0.75,
          p.size * 0.55,
          -p.size * 0.65,
          -p.size * 0.65,
          0,
          -p.size
        );
        ctx.fill();
      }

      ctx.restore();
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < petals.length; i += 1) {
        const p = petals[i];
        p.phase += p.swayFreq;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.phase) * p.swayAmp;
        p.rot += p.rotSpeed;

        if (p.y > height + 24 || p.x < -30 || p.x > width + 30) {
          petals[i] = createPetal(false);
        }
        drawPetal(petals[i]);
      }

      requestAnimationFrame(frame);
    }

    resize();
    populate();

    if (prefersReducedMotion) {
      petals.forEach(drawPetal);
    } else {
      requestAnimationFrame(frame);
    }

    window.addEventListener('resize', () => {
      resize();
      populate();
      if (prefersReducedMotion) {
        ctx.clearRect(0, 0, width, height);
        petals.forEach(drawPetal);
      }
    });
  }

  // ========================================================================
  // Event Bindings & Init
  // ========================================================================

  notes = loadInitialNotes();
  initPetalsCanvas();

  envelopeTrigger.addEventListener('click', openEnvelope);
  closeEnvelopeBtn.addEventListener('click', closeEnvelope);

  prevNoteBtn.addEventListener('click', () => {
    activeIndex = (activeIndex - 1 + notes.length) % notes.length;
    renderActiveNote();
  });

  nextNoteBtn.addEventListener('click', () => {
    activeIndex = (activeIndex + 1) % notes.length;
    renderActiveNote();
  });

  addNoteBtn.addEventListener('click', () => enterEditMode(true));
  editNoteBtn.addEventListener('click', () => enterEditMode(false));
  cancelEditBtn.addEventListener('click', exitEditMode);
  deleteNoteBtn.addEventListener('click', handleDeleteNote);
  noteEditMode.addEventListener('submit', handleSaveNote);
  shareNoteBtn.addEventListener('click', handleShareLink);

  // Allow Escape key to exit edit mode or close note back to envelope
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!noteEditMode.classList.contains('is-hidden')) {
      exitEditMode();
    } else if (!noteView.classList.contains('is-hidden')) {
      closeEnvelope();
    }
  });
})();
