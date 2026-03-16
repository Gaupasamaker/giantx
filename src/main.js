const app = document.getElementById('app');

let state = {
  currentScreen: 'role',
  role: '',
  favoritePlayer: '',
  photo: null,
  photoBase64: null,
  style: 'Painted Hype',
  email: '',
  consent: false,
  showInGallery: false,
  generatedImage: null,
  generatedImageName: null
};

// Configuración dinámica de la API (local vs producción)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocal 
  ? 'http://localhost:3001' 
  : 'https://giantx-fan-moment.onrender.com';

const PLAYERS = [
  { id: 'player1', name: 'Lot', role: 'Top', image: `${API_BASE}/api/players/player1.png` },
  { id: 'player2', name: 'Isma', role: 'Jungle', image: `${API_BASE}/api/players/player2.png` },
  { id: 'player3', name: 'Jackies', role: 'Mid', image: `${API_BASE}/api/players/player3.png` },
  { id: 'player4', name: 'Noah', role: 'ADC', image: `${API_BASE}/api/players/player4.png` },
  { id: 'player5', name: 'Jun', role: 'Support', image: `${API_BASE}/api/players/player5.png` }
];

// Header con logo Giantx que aparece en todas las pantallas
const headerComponent = () => `
  <header class="giantx-header">
    <img src="/giantx-logo.png" alt="Giantx" class="giantx-logo">
  </header>
`;

const screens = {
  role: () => `
    <header class="home-header">
      <img src="/logo-roster-moment.png" alt="Roster Moment" class="main-logo-hero">
    </header>
    <div class="screen">
      <p class="subtitle">Join the Team</p>
      <h2>Select your Role</h2>
      <div class="role-grid">
        <button class="role-card" onclick="setRole('Top')">
          <div class="role-icon"><img src="/roles/top.png" alt="Top"></div>
          <div class="role-name">Top Lane</div>
          <div class="role-desc">The Frontline</div>
        </button>
        <button class="role-card" onclick="setRole('Jungle')">
          <div class="role-icon"><img src="/roles/jungle.png" alt="Jungle"></div>
          <div class="role-name">Jungler</div>
          <div class="role-desc">Map Controller</div>
        </button>
        <button class="role-card" onclick="setRole('Mid')">
          <div class="role-icon"><img src="/roles/mid.png" alt="Mid"></div>
          <div class="role-name">Mid Lane</div>
          <div class="role-desc">The Playmaker</div>
        </button>
        <button class="role-card" onclick="setRole('ADC')">
          <div class="role-icon"><img src="/roles/adc.png" alt="ADC"></div>
          <div class="role-name">ADC</div>
          <div class="role-desc">Damage Dealer</div>
        </button>
        <button class="role-card" onclick="setRole('Bot')">
          <div class="role-icon"><img src="/roles/bot.png" alt="Bot"></div>
          <div class="role-name">Bot Lane</div>
          <div class="role-desc">Carry Master</div>
        </button>
        <button class="role-card" onclick="setRole('Support')">
          <div class="role-icon"><img src="/roles/support.png" alt="Support"></div>
          <div class="role-name">Support</div>
          <div class="role-desc">Team Guardian</div>
        </button>
      </div>
    </div>
  `,
  player: () => {
    return `
    ${headerComponent()}
    <div class="screen">
      <h2>Select Your Teammate</h2>
      <p class="subtitle-dim">Who is joining your roster?</p>
      <div class="player-grid">
        ${PLAYERS.map(p => `
          <div class="player-card" onclick="window.setPlayer('${p.id}', '${p.name}')">
            <div class="player-photo">
              <img src="${p.image}" alt="${p.name}" onerror="this.src='https://giantx.gg/wp-content/uploads/2024/01/logo-header.png'">
            </div>
            <div class="player-name">${p.name}</div>
          </div>
        `).join('')}
      </div>
      <button class="secondary-btn" onclick="prevScreen()">Back to Role</button>
    </div>
  `;
  },
  photo: () => `
    ${headerComponent()}
    <div class="screen">
      <h2>Upload your Photo</h2>
      <p class="subtitle-dim">Show us your game face</p>
      <div style="position: relative;">
        <input type="file" accept="image/*" capture="user" id="photoInput" onchange="handlePhoto(event)" style="opacity: 0; position: absolute; z-index: -1;">
        <button onclick="document.getElementById('photoInput').click()" id="uploadBtn" class="upload-btn">📸 Take / Select Photo</button>
      </div>
      <div id="previewContainer"></div>
      <button onclick="nextScreen()" id="nextBtn" disabled class="primary-btn">Continue ➔</button>
      <button class="secondary-btn" onclick="prevScreen()">Back to Players</button>
    </div>
  `,
  style: () => {
    return `
    ${headerComponent()}
    <div class="screen">
      <h2>Finalize Your Poster</h2>
      <p class="subtitle-dim">Choose your artistic style</p>
      <div class="grid">
        <button class="style-btn ${state.style === 'Painted Hype' ? 'active' : ''}" 
                id="style-Painted-Hype" 
                onclick="window.handleStyleSelection('Painted Hype')">🎨 Painted Hype</button>
        <button class="style-btn ${state.style === 'Hype Match Day' ? 'active' : ''}" 
                id="style-Hype-Match-Day" 
                onclick="window.handleStyleSelection('Hype Match Day')">⚡ Match Day</button>
        <button class="style-btn ${state.style === 'Social Media Avatar' ? 'active' : ''}" 
                id="style-Social-Media-Avatar" 
                onclick="window.handleStyleSelection('Social Media Avatar')">👤 Pro Avatar</button>
      </div>
      
      <div class="email-input-container">
        <label for="emailInput" class="email-label">Where should we send your poster?</label>
        <input type="email" id="emailInput" placeholder="Enter your email address" value="${state.email}" oninput="handleEmail(event)">
        
        <label class="consent-label">
          <input type="checkbox" id="consentCheckbox" ${state.consent ? 'checked' : ''} onchange="handleConsent(event)">
          <span class="consent-text">I agree to receive my poster via email and communications from Giantx</span>
        </label>
      </div>
      
      <button onclick="nextScreen()" class="generate-btn" ${!state.consent ? 'disabled' : ''}>Generate Result 🏆</button>
      <button class="secondary-btn" onclick="prevScreen()">Change Photo</button>
    </div>
  `;
  },
  generating: () => `
    ${headerComponent()}
    <div class="screen generating-screen">
      <div class="loader-container">
        <img src="/giantx-logo.png" alt="Giantx" class="loader-logo">
        <div class="loader-ring"></div>
      </div>
      <div class="generating-text" id="generating-text">Initializing AI</div>
      <p class="subtitle-dim" id="generating-subtitle">Preparing your epic moment...</p>
      <div id="status-log" class="status-log">
        Establishing secure uplink...
      </div>
    </div>
  `,
  result: () => {
    const personality = {
      Top: "The unwavering fortress. Your team's first line.",
      Jungle: "Master of the shadows. You control the tempo.",
      Mid: "The playmaker. All eyes on you.",
      ADC: "Precision incarnate. Every shot counts.",
      Support: "The silent hero. You lift the whole team."
    };

    const roleEmojis = {
      Top: "🛡️",
      Jungle: "🌿",
      Mid: "🔮",
      ADC: "🏹",
      Support: "✨"
    };

    const qrUrl = state.generatedImage && !state.generatedImage.startsWith('data:')
      ? state.generatedImage
      : `${API_BASE}/generated/${state.generatedImageName || ''}`;

    const twitterText = encodeURIComponent(`🎮 Just joined the @GIANTX roster! Check out my Roster Moment! 🏆\n\n#GIANTX #Esports #RosterMoment`);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(qrUrl)}`;

    return `
    ${headerComponent()}
    <div class="screen">
      <h1 class="result-title">🏆 YOUR ROSTER MOMENT</h1>
      <div class="result-card">
        ${state.generatedImage
        ? `<img src="${state.generatedImage}" class="photo-preview-large" alt="Generated poster" onclick="window.zoomImage()">`
        : state.photo
          ? `<img src="${state.photo}" class="photo-preview-large" alt="Photo preview">`
          : '<div class="placeholder-img">No Photo</div>'}
        <h2 class="role-display">${roleEmojis[state.role] || ''} ${state.role.toUpperCase()}</h2>
        <p class="style-name">${state.style}</p>
        <p class="personality-msg">"${personality[state.role] || ''}"</p>
      </div>
      
      <!-- Modal para zoom -->
      <div id="imageModal" class="image-modal" onclick="window.closeZoom()">
        <img src="${state.generatedImage || ''}" class="modal-content" id="modalImg" alt="Full size poster">
        <button class="close-modal" onclick="window.closeZoom()">Close</button>
      </div>

      ${state.generatedImage ? `
        <!-- Acciones principales -->
        <div class="action-buttons">
          <button onclick="window.downloadImage()" class="action-btn download-btn">
            📥 Download
          </button>
          <a href="${twitterUrl}" target="_blank" class="action-btn twitter-btn">
            𝕏 Share on X
          </a>
          <button onclick="window.shareInstagram()" class="action-btn instagram-btn">
            📸 Instagram
          </button>
        </div>
      ` : ''}
      <button onclick="resetApp()" class="create-another-btn">🔄 Create Another</button>
    </div>
  `;
  }
};

function render() {
  const dots = document.querySelectorAll('.dot');
  const screenKeys = Object.keys(screens);
  const currentIndex = screenKeys.indexOf(state.currentScreen);

  app.innerHTML = screens[state.currentScreen]();

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentIndex);
  });
}

window.setRole = (role) => {
  state.role = role;
  nextScreen();
};

window.setPlayer = (playerId, playerName) => {
  state.favoritePlayer = playerName;
  nextScreen();
};

window.handlePhoto = (event) => {
  const file = event.target.files[0];
  if (file) {
    // Guardar URL para preview
    state.photo = URL.createObjectURL(file);
    const container = document.getElementById('previewContainer');
    container.innerHTML = `<img src="${state.photo}" class="photo-preview" alt="Preview">`;
    document.getElementById('nextBtn').disabled = false;

    // Convertir a base64 para enviar al servidor
    const reader = new FileReader();
    reader.onloadend = () => {
      // Guardar el base64 completo (incluye el prefijo data:image/...)
      state.photoBase64 = reader.result;
    };
    reader.readAsDataURL(file);
  }
};

window.setStyle = (style) => {
  state.style = style;
  nextScreen();
};

window.handleStyleSelection = (styleName) => {
  state.style = styleName;
  render(); // Re-render to update the active class on buttons
};

window.handleEmail = (event) => {
  state.email = event.target.value;
};

window.handleConsent = (event) => {
  state.consent = event.target.checked;
  // Actualizar el estado del botón sin re-renderizar toda la pantalla
  const generateBtn = document.querySelector('.generate-btn');
  if (generateBtn) {
    generateBtn.disabled = !state.consent;
  }
};

window.handleGalleryConsent = (event) => {
  state.showInGallery = event.target.checked;
};

window.zoomImage = () => {
  const modal = document.getElementById('imageModal');
  if (modal) modal.classList.add('active');
};

window.closeZoom = () => {
  const modal = document.getElementById('imageModal');
  if (modal) modal.classList.remove('active');
};

// Descargar imagen directamente
window.downloadImage = () => {
  if (!state.generatedImage) return;

  const link = document.createElement('a');
  link.href = state.generatedImage;
  link.download = `roster-moment-${state.role.toLowerCase()}-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Compartir en Instagram (copiar texto y mostrar instrucciones)
window.shareInstagram = () => {
  const instagramText = `🎮 Just joined the @giantx roster! Check out my Roster Moment! 🏆\n\n#Giantx #Esports #RosterMoment #Gaming`;

  navigator.clipboard.writeText(instagramText).then(() => {
    alert('✅ Caption copied to clipboard!\n\n1. Download your image using the Download button\n2. Open Instagram and create a new post\n3. Select your poster image\n4. Paste the caption (Ctrl+V / Cmd+V)');
  }).catch(() => {
    alert(`📋 Copy this caption for Instagram:\n\n${instagramText}`);
  });
};

// Configuración de la API
const API_URL = API_BASE;

// Mensajes dinámicos para la pantalla de carga
const LOADING_MESSAGES = [
  { text: 'Initializing AI', subtitle: 'Preparing your epic moment...' },
  { text: 'Mixing pixels', subtitle: 'Creating visual magic...' },
  { text: 'Adding Giantx energy', subtitle: 'Channeling team spirit...' },
  { text: 'Rendering your moment', subtitle: 'Almost there...' },
  { text: 'Final touches', subtitle: 'Perfecting your poster...' }
];

let loadingMessageInterval = null;

function startLoadingMessages() {
  let index = 0;
  const textEl = document.getElementById('generating-text');
  const subtitleEl = document.getElementById('generating-subtitle');

  if (textEl && subtitleEl) {
    loadingMessageInterval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      textEl.textContent = LOADING_MESSAGES[index].text;
      subtitleEl.textContent = LOADING_MESSAGES[index].subtitle;
    }, 2500);
  }
}

function stopLoadingMessages() {
  if (loadingMessageInterval) {
    clearInterval(loadingMessageInterval);
    loadingMessageInterval = null;
  }
}

window.nextScreen = async () => {
  const screenKeys = Object.keys(screens);
  const currentIndex = screenKeys.indexOf(state.currentScreen);

  // El trigger ahora es la pantalla 'style' (donde está el botón "Ver Resultado")
  if (state.currentScreen === 'style') {
    state.currentScreen = 'generating';
    render();
    startLoadingMessages();

    const statusLog = document.getElementById('status-log');

    try {
      if (statusLog) statusLog.innerText = `Connecting to the AI server...`;

      console.log('DEBUG: Fetching from:', `${API_URL}/generate`);
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: state.role,
          favoritePlayer: state.favoritePlayer,
          style: state.style,
          email: state.email,
          consent: state.consent,
          showInGallery: state.showInGallery,
          photo: state.photoBase64
        })
      });

      if (statusLog) statusLog.innerText = 'Receiving AI response...';

      if (!response.ok) {
        throw new Error(`Request error: ${response.status}`);
      }

      const data = await response.json();
      if (statusLog) statusLog.innerText = 'Image generated successfully!';

      if (data.imageUrl) {
        state.generatedImage = data.imageUrl;
      }

      // Fallback: Si el servidor envía la imagen en Base64, usarla (más fiable en producción)
      if (data.imageBase64) {
        state.generatedImage = `data:image/jpeg;base64,${data.imageBase64}`;
      }

      if (data.imageName) {
        state.generatedImageName = data.imageName;
      }
    } catch (error) {
      console.error('Error detallado:', error);
      if (statusLog) statusLog.innerText = `❌ Error: ${error.message}`;
      alert(`Error de conexión: ${error.message}`);
    } finally {
      stopLoadingMessages();
      // Pequeña espera para que se vea el mensaje de éxito antes de cambiar
      setTimeout(() => {
        state.currentScreen = 'result';
        render();
      }, 1000);
    }
  } else if (currentIndex < screenKeys.length - 1) {
    state.currentScreen = screenKeys[currentIndex + 1];
    render();
  }
};

window.prevScreen = () => {
  const screenKeys = Object.keys(screens);
  const currentIndex = screenKeys.indexOf(state.currentScreen);
  if (currentIndex > 0) {
    state.currentScreen = screenKeys[currentIndex - 1];
    render();
  }
};

window.resetApp = () => {
  state = {
    currentScreen: 'role',
    role: '',
    favoritePlayer: '',
    photo: null,
    photoBase64: null,
    style: 'Painted Hype',
    email: '',
    consent: false,
    showInGallery: false,
    generatedImage: null,
    generatedImageName: null
  };
  render();
};

// Initial render
render();

// Registro del Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registrado'))
      .catch(err => console.log('Fallo al registrar Service Worker', err));
  });
}

// Lógica para el botón de instalación (PWA)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  console.log('App ready to be installed');
  // You could store the event here if you wanted to show a custom install button later
});
