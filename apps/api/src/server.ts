import crypto from "node:crypto";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { ensureDatabaseSchema, pool } from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const mistralApiKey = process.env.MISTRAL_API_KEY;
const mistralModel = process.env.MISTRAL_MODEL || "mistral-small-latest";

app.use(cors());
app.use(express.json());

type ChatRole = "user" | "assistant";

const INITIAL_PROMPT =
  "Hi! I am your LLP registration assistant. Let's begin with your applicant details. What is your full name? <!--FORM:applicant_name-->";
const FORM_MARKER_REGEX = /<!--FORM:[a-z_]+-->/gi;
const FORM_MARKER_CAPTURE_REGEX = /<!--FORM:([a-z_]+)-->/i;
const MARKER_FALLBACK_QUESTION: Record<string, string> = {
  applicant_name: "What is your full name?",
  email: "Please share your email address.",
  phone: "What is your mobile number?",
  llp_name_preferences: "What LLP name do you want to register?",
  business_activity: "What is the main business activity of the LLP?",
  registered_office_details: "Please share the registered office details.",
  total_partners: "How many total partners will the LLP have?",
  designated_partners: "How many designated partners will there be?",
  partner_details:
    "Enter partner names separated by commas. (Example: Aisha Khan, Raj Mehta)",
  capital_contribution: "What is the expected total capital contribution amount (INR)?",
  agreement_required: "Do you need help drafting the LLP agreement?",
  notes: "Any additional notes or requirements? If none, type 'None'.",
};

const stripFormMarkers = (content: string): string => {
  return content.replace(FORM_MARKER_REGEX, "").trim();
};

const extractFormMarker = (content: string): string | null => {
  const match = content.match(FORM_MARKER_CAPTURE_REGEX);
  return match?.[1] ? match[1] : null;
};

const getStoredAssistantText = (content: string): string => {
  const marker = extractFormMarker(content);
  const cleaned = stripFormMarkers(content);

  if (cleaned) {
    return cleaned;
  }

  if (marker && MARKER_FALLBACK_QUESTION[marker]) {
    return MARKER_FALLBACK_QUESTION[marker];
  }

  return "Please continue with the next detail.";
};

const normalizeContent = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text: unknown }).text || "");
        }

        return "";
      })
      .join(" ")
      .trim();
  }

  return "";
};

const callMistral = async (args: {
  systemPrompt: string;
  messages: Array<{ role: ChatRole; content: string }>;
}): Promise<string> => {
  if (!mistralApiKey) {
    throw new Error("MISTRAL_API_KEY is not configured on the API server.");
  }

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mistralApiKey}`,
    },
    body: JSON.stringify({
      model: mistralModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: args.systemPrompt,
        },
        ...args.messages,
      ],
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: {
            content?: unknown;
          };
        }>;
        message?: string;
      }
    | null;

  if (!response.ok) {
    const message = payload?.message || `Mistral request failed (${response.status})`;
    throw new Error(message);
  }

  const firstChoice = payload?.choices?.[0]?.message?.content;
  const content = normalizeContent(firstChoice);

  if (!content) {
    throw new Error("Mistral returned an empty response.");
  }

  return content;
};

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "mistral",
    model: mistralModel,
    keyConfigured: Boolean(mistralApiKey),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  });
});

app.post("/api/providers/mistral/chat/start", async (_req, res) => {
  const sessionId = crypto.randomUUID();
  const initialMarker = extractFormMarker(INITIAL_PROMPT);
  const storedInitialPrompt = getStoredAssistantText(INITIAL_PROMPT);

  try {
    await pool.query("INSERT INTO chat_sessions (id) VALUES ($1)", [sessionId]);
    await pool.query(
      "INSERT INTO chat_messages (session_id, role, content, metadata) VALUES ($1, $2, $3, $4::jsonb)",
      [
        sessionId,
        "assistant",
        storedInitialPrompt,
        initialMarker ? JSON.stringify({ form_marker: initialMarker }) : null,
      ],
    );

    res.json({
      session_id: sessionId,
      question: INITIAL_PROMPT,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start chat.";
    res.status(500).json({ message });
  }
});

app.post("/api/providers/mistral/chat/answer", async (req, res) => {
  const sessionId = String(req.body?.session_id || "").trim();
  const answer = String(req.body?.answer || "").trim();
  const systemPrompt = String(req.body?.system_prompt || "").trim();

  if (!sessionId || !answer) {
    res.status(400).json({ message: "session_id and answer are required." });
    return;
  }

  if (!systemPrompt) {
    res.status(400).json({ message: "system_prompt is required." });
    return;
  }

  try {
    const sessionResult = await pool.query("SELECT id FROM chat_sessions WHERE id = $1", [
      sessionId,
    ]);

    if (sessionResult.rowCount === 0) {
      res.status(404).json({ message: "Session not found. Start a new chat." });
      return;
    }

    await pool.query(
      "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)",
      [sessionId, "user", answer],
    );

    const historyResult = await pool.query<{
      role: ChatRole;
      content: string;
    }>(
      "SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC, id ASC",
      [sessionId],
    );

    const reply = await callMistral({
      systemPrompt,
      messages: historyResult.rows,
    });

    // --- LOG AI RESPONSE, USER INPUT, SESSION ID, TIMESTAMP ---
    console.log("[AI LOG]", {
      timestamp: new Date().toISOString(),
      sessionId,
      userInput: answer,
      aiRawResponse: reply,
      aiCleaned: getStoredAssistantText(reply),
    });
    // ---------------------------------------------------------

    const replyMarker = extractFormMarker(reply);
    const storedReply = getStoredAssistantText(reply);

    await pool.query(
      "INSERT INTO chat_messages (session_id, role, content, metadata) VALUES ($1, $2, $3, $4::jsonb)",
      [
        sessionId,
        "assistant",
        storedReply,
        replyMarker ? JSON.stringify({ form_marker: replyMarker }) : null,
      ],
    );

    res.json({
      question: reply,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to call Mistral.";
    res.status(500).json({ message });
  }
});

app.get("/api/chat/:sessionId/messages", async (req, res) => {
  const sessionId = String(req.params?.sessionId || "").trim();

  if (!sessionId) {
    res.status(400).json({ message: "sessionId is required." });
    return;
  }

  try {
    const sessionResult = await pool.query("SELECT id FROM chat_sessions WHERE id = $1", [
      sessionId,
    ]);

    if (sessionResult.rowCount === 0) {
      res.status(404).json({ message: "Session not found." });
      return;
    }

    const messagesResult = await pool.query<{
      role: ChatRole;
      content: string;
    }>(
      "SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC, id ASC",
      [sessionId],
    );

    res.json({
      session_id: sessionId,
      messages: messagesResult.rows.map((row) => ({
        sender: row.role === "assistant" ? "bot" : "user",
        text: row.role === "assistant" ? stripFormMarkers(row.content) : row.content,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chat history.";
    res.status(500).json({ message });
  }
});

app.post("/api/llp/submit", (req, res) => {
  const payload = req.body;

  if (!payload || typeof payload !== "object" || !payload.data) {
    res.status(400).json({ message: "Invalid LLP submission payload." });
    return;
  }

  const submissionId = `LLP-${Date.now()}`;

  res.json({
    success: true,
    id: submissionId,
    message: "LLP details submitted successfully.",
  });
});

const startServer = async (): Promise<void> => {
  await ensureDatabaseSchema();

  app.listen(port, () => {
    console.log(`LLP API listening on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  const message = error instanceof Error ? error.message : "Failed to start API server.";
  console.error(message);
  process.exit(1);
});
