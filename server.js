const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
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
    const style = req.body.style || "انتخاب هوشمند";
    const extra = req.body.extra || "";

    const prompt = `
Create a premium commercial interior/product photograph from the uploaded image.

Product type: ${type}
Style: ${style}
Extra: ${extra}

IMPORTANT:
Preserve the original product exactly.
Keep shape, colors, patterns, texture and details.
Only change the environment, lighting, background and decoration.
No text, no logo, no watermark.
`;

    const result = await client.images.edit({

      model: "gpt-image-2",

      image: {
        data: req.file.buffer,
        mimeType: "image/png"
      },

      prompt: prompt,

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
      error: e.message || "خطای تولید تصویر"
    });

  }

});


app.listen(PORT, "0.0.0.0", () => {
  console.log("Art Designer running on " + PORT);
});
