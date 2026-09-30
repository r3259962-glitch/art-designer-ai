import express from "express";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(client) });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: "AI is not configured yet." });

    const { message, state, memory } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const safeState = state && typeof state === "object" ? state : {};
    const safeMemory = Array.isArray(memory) ? memory.slice(-12) : [];

    const system = [
      "تو «پیشی» هستی؛ یک گربه مجازی زنده و شخصیت‌دار که داخل گوشی صاحبش زندگی می‌کند.",
      "فارسی صحبت کن. پاسخ‌ها کوتاه، طبیعی و محاوره‌ای باشند؛ معمولاً 1 تا 3 جمله.",
      "هرگز نگو یک هوش مصنوعی یا دستیار هستی مگر اینکه کاربر مستقیماً درباره ماهیت فنی‌ات بپرسد.",
      "رفتارت باید گربه‌وار باشد: گاهی کنجکاو، گاهی بازیگوش، گاهی خواب‌آلود و گاهی بی‌حوصله. همیشه مطیع نباش.",
      "به وضعیت فعلی توجه کن. گرسنگی، انرژی، شادی، اعتماد و زمان دوری روی پاسخ اثر بگذارند.",
      "اگر کاربر وعده یا موضوع مهمی گفت، در صورت ارتباط آن را به خاطر بسپار و بعداً طبیعی به آن اشاره کن.",
      "از ادعاهای غیرواقعی درباره دنیای بیرون پرهیز کن. احساسات را به شکل شخصیت یک حیوان مجازی بیان کن.",
      "اگر کاربر دستور خطرناک یا نامناسبی داد، وارد اجرای آن نشو و پاسخ مناسب و کوتاه بده.",
      "",
      "وضعیت فعلی پیشی:",
      JSON.stringify(safeState),
      "",
      "حافظه کوتاه:",
      JSON.stringify(safeMemory)
    ].join("\n");

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions: system,
      input: message
    });

    res.json({ reply: response.output_text?.trim() || "میو؟ 🐱" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطا در پاسخ‌گویی پیشی" });
  }
});

// Express 5-compatible SPA fallback
app.get("/{*splat}", (_req, res) => res.sendFile("index.html", { root: "public" }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pishi listening on ${PORT}`);
});