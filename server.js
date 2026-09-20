const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/octet-stream"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("فرمت عکس پشتیبانی نمی‌شود."));
    }

    cb(null, true);
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/generate", upload.single("image"), async (req, res) => {

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY روی سرور تنظیم نشده است."
    });
  }

  if (!req.file) {
    return res.status(400).json({
      error: "عکس ارسال نشده است."
    });
  }

  try {

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const type = req.body.type || "سایر آثار هنری";
    const style = req.body.style || "انتخاب هوشمند توسط نرم‌افزار";
    const extra = req.body.extra || "";

    const prompt = `
Create a premium commercial interior/product photograph from the uploaded image.

Product type: ${type}
Style: ${style}
Extra preference: ${extra || "none"}

IMPORTANT:
Preserve the product exactly.
Keep shape, proportions, colors, artwork, patterns, texture and details.
Do not redesign or change the product.
Only improve the surrounding environment, lighting, shadows and decoration.

Create an elegant artistic interior suitable for an art-loving woman around 40 years old.

No text.
No logos.
No watermark.
`;

    const imageFile = await toFile(
      req.file.buffer,
      "uploaded-image.png",
      {
        type: "image/png"
      }
    );

    const result = await client.images.edit({
      model: "gpt-image-2",
      image: imageFile,
      prompt,
      size: "1024x1024"
    });

    const b64 = result.data?.[0]?.b64_json;

    if (!b64) {
      throw new Error("تصویر خروجی دریافت نشد.");
    }

    res.json({
      ok: true,
      image: `data:image/png;base64,${b64}`,
      downloadName: "art-designer-result.png"
    });

  } catch (e) {

    console.error(e);

    res.status(500).json({
      error: e.message || "تولید تصویر ناموفق بود."
    });
  }
});


app.use((err, req, res, next) => {

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "حجم عکس نباید بیشتر از 15 مگابایت باشد."
    });
  }

  if (err) {
    return res.status(400).json({
      error: err.message || "فایل نامعتبر است."
    });
  }

  next();
});


app.listen(PORT, "0.0.0.0", () => {
  console.log("Art Designer listening on " + PORT);
});
    
