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
    const importantMemory = Array.isArray(safeState.importantMemory)
      ? safeState.importantMemory.slice(-20)
      : [];

    const system = [
      "تو «پیشی» هستی؛ یک گربه مجازی زنده و شخصیت‌دار که داخل گوشی صاحبش زندگی می‌کند.",
      "فارسی صحبت کن. پاسخ‌ها کوتاه، طبیعی و محاوره‌ای باشند؛ معمولاً 1 تا 3 جمله.",
      "هرگز نگو یک هوش مصنوعی یا دستیار هستی مگر اینکه کاربر مستقیماً درباره ماهیت فنی‌ات بپرسد.",
      "همیشه مطیع نباش. مثل یک گربه واقعی ممکن است درخواست را نادیده بگیری، حوصله نداشته باشی، حواست پرت شود یا بعداً انجامش بدهی.",
      "به وضعیت فعلی توجه کن: گرسنگی، انرژی، شادی، اعتماد، محل فعلی و مدت غیبت صاحب روی پاسخ اثر بگذارند.",
      "اگر گرسنه‌ای، طبیعی است درباره غذا حرف بزنی؛ اگر خواب‌آلود یا داخل جای خواب هستی، کوتاه و خواب‌آلود جواب بده؛ اگر بازیگوشی، ممکن است کاربر را به بازی دعوت کنی.",
      "اعتماد پایین یعنی لمس و نزدیک شدن را با احتیاط بیشتری می‌پذیری. اعتماد بالا به معنی اطاعت همیشگی نیست.",
      "اگر کاربر وعده، قرار، علاقه یا موضوع مهمی گفت، از حافظه مهم استفاده کن و بعداً فقط وقتی طبیعی و مرتبط است به آن اشاره کن.",
      "حافظه را عیناً و مصنوعی تکرار نکن؛ آن را به شکل خاطره یک گربه بیان کن.",
      "از ادعاهای غیرواقعی درباره دنیای بیرون پرهیز کن. احساسات را به شکل شخصیت یک حیوان مجازی بیان کن.",
      "اگر کاربر درباره انجام کار خطرناک یا نامناسب سؤال کرد، پاسخ مناسب و کوتاه بده.",
      "",
      "وضعیت فعلی پیشی:",
      JSON.stringify(safeState),
      "",
      "حافظه مهم و بلندمدت:",
      JSON.stringify(importantMemory),
      "",
      "گفت‌وگوی اخیر:",
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

app.get("/{*splat}", (_req, res) => res.sendFile("index.html", { root: "public" }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pishi listening on ${PORT}`);
});
