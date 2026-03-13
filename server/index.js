import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import Database from 'better-sqlite3';

// Obtener IP local de la red
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Inicializar Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ==================== BASE DE DATOS SQLITE ====================
// Crear directorio de datos si no existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inicializar base de datos SQLite
const db = new Database(path.join(dataDir, 'emails.db'));

// Crear tabla de subscribers si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    consent BOOLEAN NOT NULL DEFAULT 0,
    consent_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    role TEXT,
    style TEXT,
    favorite_player TEXT,
    show_in_gallery BOOLEAN DEFAULT 0,
    image_name TEXT
  )
`);

console.log('📊 Base de datos SQLite inicializada');

// Función para guardar email con consentimiento
function saveEmailWithConsent(email, consent, ipAddress, role, style, favoritePlayer, showInGallery, imageName) {
  const CONSENT_TEXT = 'I agree to receive my poster via email and communications from Giantx';

  if (!consent) {
    console.log('⚠️ Usuario no dio consentimiento, email no guardado');
    return { saved: false, reason: 'no_consent' };
  }

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO subscribers (email, consent, consent_text, ip_address, role, style, favorite_player, show_in_gallery, image_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(email, 1, CONSENT_TEXT, ipAddress, role, style, favoritePlayer || null, showInGallery ? 1 : 0, imageName || null);

    if (result.changes > 0) {
      console.log(`✅ Email guardado en BD: ${email}, Gallery: ${showInGallery ? 'Yes' : 'No'}`);
      return { saved: true };
    } else {
      console.log(`ℹ️ Email ya existía en BD: ${email}`);
      return { saved: false, reason: 'already_exists' };
    }
  } catch (error) {
    console.error('❌ Error guardando email:', error.message);
    return { saved: false, reason: 'error', error: error.message };
  }
}

// Función para enviar email con el póster usando la API de Brevo (más estable en Render)
async function sendPosterEmail(toEmail, imageDataBase64) {
  console.log(`📧 DEBUG: Iniciando proceso de envío vía API a ${toEmail}`);

  const apiKey = process.env.SMTP_PASS; // Usamos la misma API Key que ya tienes
  const senderEmail = process.env.EMAIL_FROM;

  if (!apiKey || !senderEmail) {
    console.error('❌ ERROR: API Key o EMAIL_FROM no configurados');
    return false;
  }

  // Debug de la clave (enmascarada)
  console.log(`📧 DEBUG: API Key cargada. Longitud: ${apiKey.length}`);

  if (apiKey.length < 30) {
    console.warn('⚠️ WARNING: La clave de API es muy corta. Probablemente estés usando el SMTP Password en lugar de la API Key v3.');
    console.log('👉 Ve a Brevo -> SMTP & API -> API Keys para obtener la clave correcta.');
  }

  if (apiKey.length > 10) {
    console.log(`📧 DEBUG: Clave empieza por: ${apiKey.substring(0, 6)}... y termina en: ...${apiKey.substring(apiKey.length - 4)}`);
  } else {
    console.log(`📧 DEBUG: Clave sospechosamente corta: ${apiKey}`);
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "Roster Moment", email: senderEmail },
        to: [{ email: toEmail }],
        subject: "Your Giantx Roster Moment is here! 🏆",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0055ff;">Hi! Here is your epic Giantx poster.</h2>
            <p>We hope you like it! You can share this epic moment on your social media. Don't forget to tag <strong>@Giantx</strong> and use <strong>#RosterMoment</strong>!</p>
            <p>Thanks for your support!</p>
            <br>
            <p><strong>The Giantx Team</strong></p>
            <img src="https://giantx-roster-moment.onrender.com/giantx-logo.png" alt="Giantx" style="width: 100px; margin-top: 10px;">
          </div>
        `,
        attachment: [
          {
            name: "roster-moment.png",
            content: imageDataBase64
          }
        ]
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Email sent successfully via API:', result.messageId || 'Success');
      return true;
    } else {
      console.error('❌ Error in Brevo API:', JSON.stringify(result));
      return false;
    }
  } catch (error) {
    console.error('❌ CRITICAL ERROR SENDING EMAIL VIA API:', error.message);
    return false;
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Servir imágenes generadas - Usar ruta absoluta para mayor seguridad
const generatedDir = path.join(__dirname, '../public/generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

// Manual route to serve generated images (more robust than static for dynamic files on some hosts)
app.get('/generated/:filename', (req, res) => {
  const filepath = path.join(generatedDir, req.params.filename);
  // Prevent directory traversal
  if (!filepath.startsWith(generatedDir)) {
    return res.status(403).send('Forbidden');
  }

  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    console.error(`❌ Image not found: ${filepath}`);
    res.status(404).send('Not found');
  }
});

// Servir imágenes de jugadores
const playersDir = path.join(__dirname, 'assets', 'players');
app.use('/api/players', express.static(playersDir));

// Servir archivos públicos (dashboard, gallery)
// Servir archivos públicos (dashboard, gallery)
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  console.log('📁 Serving static files from:', publicDir);
}

// Función para generar el prompt según rol y estilo
function generatePrompt(role, style, hasPhoto = false, playersCount = 0) {

  // Instrucciones de MANDATO CRÍTICO (Para que no olvide al usuario)
  const mandatoryMandate = `
MANDATORY ROLE ASSIGNMENT:
- IMAGE 1 IS THE PRIMARY PROTAGONIST (The Fan). You MUST include this person as the central focus of the image. This is NON-NEGOTIABLE.
- IMAGES 2 to ${playersCount + 1} ARE THE SECONDARY TEAMMATES (The Pro Players).`;

  // Prompt base original adaptado para composición multimodal
  const basePrompt = `A high-impact esports poster composition featuring ${playersCount + 1} people total:
- THE FAN (Image 1): Central subject, foreground, largest scale. The entire poster revolves around this person.
- ${playersCount} PROFESSIONAL PLAYERS (Images 2 to ${playersCount + 1}): Arranged around the fan.

The fan is positioned at the exact center of the image, slightly forward, as the clear visual protagonist.
The players are arranged in a cinematic, staggered ensemble composition.

All subjects are fully integrated into the same visual style.
The fan is wearing an official Cloud9 esports jersey.
Vertical orientation, 4:5 aspect ratio.`;

  const stylePrompts = {
    'Painted Hype': `
STYLE: Masterpiece Esports Digital Illustration.
- Technique: Thick, expressive oil-painting style with visible palette knife textures and bold brush strokes.
- Color Palette: Dominant Giantx colors (deep black, crisp white, and electric blue), and cinematic warm orange/gold highlights for contrast.
- Lighting: Intense, dramatic "Rembrandt" lighting on faces. High-contrast chiaroscuro effect.
- Energy: Dynamic paint splashes, ethereal energy wisps, and motion-blurred paint fragments exploding from the subjects.
- Atmosphere: A fusion of a high-tech arena and a dreamlike artistic void. No flat backgrounds.
- Subjects: Faces must be recognizable but rendered with artistic soul. The fan should look heroic and integrated into the paint texture.`,

    'Hype Match Day': `
STYLE: Elite Esports Victory Celebration.
- Subjects: Intense, emotional expressions. Everyone is visibly excited, shouting in joy, or cheering. 
- Posture: Dynamic and triumphant—arms raised, fists pumped, leaning forward as if celebrating a championship point.
- Lighting: Aggressive neon rim lighting, cinematic lens flares, and volumetric spotlights dancing across the arena.
- Background: A high-tech futuristic esports arena stadium at the peak of a grand final. Holographic Giantx banners and digital confetti in the air.
- Visual Effects: Floating data particles, electrical sparks, and vibrant energy streaks that amplify the hype.
- Texture: Sharp, clean, and high-definition.
- Atmosphere: Pure victory, adrenaline, and hype.
- Colors: Electrified blue, deep night black, and brilliant white flashes.`,

    'Social Media Avatar': `
INDIVIDUAL PORTRAIT TASK:
- FOCUS ONLY ON IMAGE 1 (The Fan). Ignore all other player images.
- Subject: The Fan from Image 1, facing forward, confident posture with arms crossed.
- Clothing: Wearing a high-quality, realistic Giantx esports jersey.
- Style: Photorealistic, clean, sharp focus.
- Background: Neutral, studio-like professional background (blurred or solid clean color).
- Composition: Waist-up shot, centered, perfect for social media profile pictures.
- Likeness: Maximum fidelity to the fan's facial features.`
  };

  const selectedStyle = stylePrompts[style] || stylePrompts['Painted Hype'];

  const negativePrompt = `
AVOID:
- Generic faces
- More than 1 person if 'Social Media Avatar' is selected
- Photorealistic collage (unified artwork required)
- Text that is not "Giantx"
- Mismatched lighting`;

  return `CRITICAL: STRICT IDENTITY PRESERVATION MODE.
DO NOT USE ANY PRE-TRAINED KNOWLEDGE OF GIANTX PLAYERS.
ONLY USE THE PROVIDED IMAGES (Image 2 to ${playersCount + 1}) FOR THE PRO PLAYERS' FACES.
The faces in the final image MUST be exact artistic representations of the provided photos. 
IGNORE any famous faces you might know and stick ONLY to the visual blueprints provided in the input images.

${mandatoryMandate}

${style === 'Social Media Avatar' ? 'CREATE AN INDIVIDUAL PORTRAIT' : basePrompt}

STYLE INSTRUCTIONS:
${selectedStyle}

${negativePrompt}`;
}

// Endpoint principal
app.post('/generate', async (req, res) => {
  const { role, style, email, photo, consent, favoritePlayer, showInGallery } = req.body;

  // Obtener IP del cliente para cumplimiento GDPR
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  console.log('=== New Request ===');
  console.log('Role:', role);
  console.log('Style:', style);
  console.log('Email:', email);
  console.log('Favorite Player:', favoritePlayer);
  console.log('Consent:', consent ? 'Yes' : 'No');
  console.log('Show in Gallery:', showInGallery ? 'Yes' : 'No');
  console.log('Photo received:', photo ? 'Yes' : 'No');

  // El email y la galería se guardarán después de generar la imagen para tener el nombre del archivo
  let imageName = null;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview'
    });

    // 1. Cargar fotos de los jugadores desde el servidor
    let contentParts = [];
    const playersDir = path.join(__dirname, 'assets', 'players');
    let playersCount = 0;

    if (fs.existsSync(playersDir)) {
      const playerFiles = fs.readdirSync(playersDir).filter(file =>
        ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file).toLowerCase())
      );

      // Si el estilo es 'Social Media Avatar', NO añadimos jugadores para evitar confusiones.
      // Solo añadimos jugadores para los estilos de composición grupal.
      const selectedPlayers = (style === 'Social Media Avatar') ? [] : playerFiles.slice(0, 5);
      playersCount = selectedPlayers.length;

      // El fan (la foto del usuario) DEBE ir primero según nuestro nuevo prompt
      if (photo && photo.startsWith('data:image')) {
        const base64Data = photo.split(',')[1];
        const mimeType = photo.split(';')[0].split(':')[1];
        contentParts.push({
          inlineData: { mimeType, data: base64Data }
        });
        console.log('User image added as primary subject');
      }

      // Añadir a los jugadores
      for (const file of selectedPlayers) {
        const filePath = path.join(playersDir, file);
        const fileData = fs.readFileSync(filePath);
        const extension = path.extname(file).substring(1);
        const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

        contentParts.push({
          inlineData: {
            mimeType: mimeType,
            data: fileData.toString('base64')
          }
        });
        console.log(`Player added: ${file}`);
      }
    } else if (photo && photo.startsWith('data:image')) {
      // Fallback si no hay carpeta de jugadores, solo usamos la del usuario
      const base64Data = photo.split(',')[1];
      const mimeType = photo.split(';')[0].split(':')[1];
      contentParts.push({
        inlineData: { mimeType, data: base64Data }
      });
    }

    const hasPhoto = photo && photo.startsWith('data:image');
    const prompt = generatePrompt(role, style, hasPhoto, playersCount);

    // El texto del prompt debe ser la primera parte o estar presente
    contentParts.unshift({ text: prompt });

    console.log('Prompt sent');
    console.log('Total images sent:', contentParts.length - 1);

    console.log('Sending request to Google AI...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: contentParts }],
      generationConfig: {
        responseModalities: ['image', 'text'],
      },
    });

    console.log('Response received from Google AI');
    const response = result.response;

    // Log detallado de la estructura de la respuesta
    console.log('Candidates structure:', JSON.stringify(response.candidates.map(c => ({
      index: c.index,
      parts: c.content.parts.map(p => Object.keys(p))
    })), null, 2));

    let imageUrl = null;

    // Buscar la imagen en la respuesta
    if (response.candidates && response.candidates[0] && response.candidates[0].content) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log('MIME Type received:', part.inlineData.mimeType);
          console.log('Base64 data length:', part.inlineData.data.length);

          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType;
          const extension = mimeType.split('/')[1] || 'png';

          const fileName = `roster_${Date.now()}.${extension}`;
          // Ensure directory exists securely
          const saveDir = path.resolve(__dirname, '../public/generated');
          if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
          }
          const filePath = path.join(saveDir, fileName);

          // Verificamos el buffer antes de escribir
          const buffer = Buffer.from(imageData, 'base64');
          console.log('Created buffer size:', buffer.length, 'bytes');

          try {
            fs.writeFileSync(filePath, buffer);
            console.log('✅ File written successfully to:', filePath);
          } catch (writeError) {
            console.error('❌ Error writing file to disk:', writeError);
            throw writeError; // Re-throw to trigger catch block
          }

          imageUrl = `https://giantx-roster-moment.onrender.com/generated/${fileName}`;
          console.log('Image saved and accessible at public URL:', imageUrl);

          // Enviar email automáticamente (SIN AWAIT para no bloquear la respuesta)
          if (email) {
            console.log('Starting background email send to:', email);
            // USAR EL BASE64 DIRECTAMENTE EN EL EMAIL PARA EVITAR ENOENT
            sendPosterEmail(email, imageData).then(success => {
              console.log(success ? '✅ Background email sent' : '❌ Background email failed');
            });
          }

          // Guardar email en BD con el nombre de imagen y opt-in de galería
          if (email && consent) {
            saveEmailWithConsent(email, consent, clientIP, role, style, favoritePlayer, showInGallery, fileName);
          }

          console.log('Sending response to frontend...');
          // USAR imageData directamente que está definido en el scope del for
          res.json({
            success: true,
            message: 'Roster Moment generated',
            imageUrl,
            imageName: fileName, // Enviamos el nombre del archivo para el QR
            imageBase64: imageData,
            role,
            style,
            email
          });
          return;
        }
      }
    }

    // SEGURIDAD: Si llegamos aquí sin haber enviado respuesta (ej. no hubo inlineData)
    console.warn('⚠️ No inlineData found in Google AI response');
    res.status(500).json({
      success: false,
      message: 'The AI did not generate a valid image. Try with another style.',
      error: 'Missing inlineData'
    });

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error generating image',
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint para exportar emails (protegido con token simple)
app.get('/emails', (req, res) => {
  const token = req.query.token || req.headers['x-api-token'];
  const expectedToken = process.env.ADMIN_TOKEN || 'cloud9-admin-2026';

  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized. Provide valid token.' });
  }

  try {
    const subscribers = db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all();

    // Si piden CSV
    if (req.query.format === 'csv') {
      const csv = [
        'id,email,consent,created_at,ip_address,role,style',
        ...subscribers.map(s => `${s.id},"${s.email}",${s.consent},"${s.created_at}","${s.ip_address}","${s.role}","${s.style}"`)
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
      return res.send(csv);
    }

    res.json({
      count: subscribers.length,
      subscribers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para estadísticas del dashboard (público, sin token)
app.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;

    const byRole = db.prepare(`
      SELECT role, COUNT(*) as count 
      FROM subscribers 
      WHERE role IS NOT NULL 
      GROUP BY role 
      ORDER BY count DESC
    `).all();

    const byStyle = db.prepare(`
      SELECT style, COUNT(*) as count 
      FROM subscribers 
      WHERE style IS NOT NULL 
      GROUP BY style 
      ORDER BY count DESC
    `).all();

    const byPlayer = db.prepare(`
      SELECT favorite_player as player, COUNT(*) as count 
      FROM subscribers 
      WHERE favorite_player IS NOT NULL 
      GROUP BY favorite_player 
      ORDER BY count DESC
    `).all();

    const byHour = db.prepare(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as count 
      FROM subscribers 
      GROUP BY hour 
      ORDER BY hour
    `).all();

    res.json({
      total,
      byRole,
      byStyle,
      byPlayer,
      byHour,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para la galería pública (solo muestra posters con opt-in)
app.get('/gallery', (req, res) => {
  try {
    const galleryItems = db.prepare(`
      SELECT role, style, favorite_player, image_name, created_at 
      FROM subscribers 
      WHERE show_in_gallery = 1 AND image_name IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    res.json({
      count: galleryItems.length,
      items: galleryItems.map(item => ({
        role: item.role,
        style: item.style,
        player: item.favorite_player,
        imageUrl: `/generated/${item.image_name}`,
        createdAt: item.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Roster Moment Backend running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${LOCAL_IP}:${PORT}`);
});
