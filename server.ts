import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cookieParser from "cookie-parser";
import OpenAI from "openai";
import { Dropbox, DropboxAuth } from 'dropbox';
import { google } from 'googleapis';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isAiEnabled = process.env.VITE_ENABLE_AI !== 'false';

const SYSTEM_PROMPT = `
You are a SelectPro assistant. Analyse the image and return ONLY valid JSON 
matching this exact schema — no markdown, no explanation:
{
  "compositionScore": 0-10,
  "lightingScore": 0-10,
  "subjectFocusScore": 0-10,
  "overallQuality": 0-10,
  "tags": ["string"],
  "issues": ["string"],
  "keep": true|false
}
`;

let openaiClient: OpenAI | null = null;

function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for AI features.");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'selectpro-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      httpOnly: true 
    }
  }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/analyze/openai", async (req, res) => {
    if (!isAiEnabled) {
      return res.status(403).json({ error: "AI features are disabled in this build." });
    }
    try {
      const { base64Data, filename } = req.body;
      const openai = getOpenAI();
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: SYSTEM_PROMPT
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const rawResult = JSON.parse(response.choices[0].message.content || "{}");
      
      // Map back to SelectionResult interface
      const result = {
        filename,
        isRejected: !rawResult.keep,
        reasons: rawResult.issues || [],
        scores: {
          focus: (rawResult.subjectFocusScore || 0) * 10,
          expression: 50,
          composition: (rawResult.compositionScore || 0) * 10,
          eyesOpen: 100,
          lighting: (rawResult.lightingScore || 0) * 10,
          overall: (rawResult.overallQuality || 0) * 10,
        },
        analysis: `AI analysis completed. Overall quality: ${rawResult.overallQuality}/10.`,
        isHeroPotential: (rawResult.overallQuality || 0) >= 9,
        tags: rawResult.tags || [],
        people: []
      };
      
      res.json(result);
    } catch (error: any) {
      console.error("OpenAI Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // OAuth URLs
  app.get("/api/auth/dropbox/url", (req, res) => {
    const clientId = process.env.DROPBOX_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/dropbox/callback`;
    const url = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
    res.json({ url });
  });

  app.get("/api/auth/google/url", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/drive.file';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`;
    res.json({ url });
  });

  // OAuth Callbacks
  app.get("/auth/dropbox/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/?error=no_code');

    try {
      const dbxAuth = new DropboxAuth({
        clientId: process.env.DROPBOX_CLIENT_ID,
        clientSecret: process.env.DROPBOX_CLIENT_SECRET
      });

      const redirectUri = `${req.protocol}://${req.get('host')}/auth/dropbox/callback`;
      const response = await dbxAuth.getAccessTokenFromCode(redirectUri, code as string);
      
      // Store tokens in session
      (req.session as any).dropboxTokens = response.result;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'dropbox' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Dropbox connected. Closing...</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Dropbox OAuth error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/?error=no_code');

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${req.protocol}://${req.get('host')}/auth/google/callback`
      );

      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store tokens in session
      (req.session as any).googleTokens = tokens;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Google Drive connected. Closing...</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Google OAuth error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
