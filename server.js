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
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});


app.post("/api/generate", upload.single("image"), async (req, res) => {

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY تنظیم نشده است."
    });
  }

  if (!req.file) {
    return res.status(400).json({
      error: "عکس دریافت نشد."
    });
  }


  try {

    console.log("FILE INFO:", {
      name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });


    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });


    const type = req.body.type || "اثر هنری";
    const style = req.body.style || "انتخاب هوشمند";
    const extra = req.body.extra || "";


    const prompt = `
Create a professional commercial interior advertisement image.

Product type: ${type}
Design style: ${style}

Important:
Keep the uploaded product exactly the same.
Do not change shape, colors, texture, details, artwork or proportions.
Only improve the environment, lighting, background and presentation.

Create an elegant home interior suitable for an artistic woman around 40 years old.
No text.
No watermark.
No logo.
The product must remain the main focus.

Extra request:
${extra}
`;


    // تبدیل قطعی فایل به PNG استاندارد
    const imageFile = await toFile(
      req.file.buffer,
      "uploaded-image.png",
      {
        type: "image/png"
      }
    );


    const result = await client.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: prompt,
      size: "1024x1024"
    });


    const image = result.data?.[0]?.b64_json;


    if (!image) {
      throw new Error("تصویر خروجی دریافت نشد.");
    }


    res.json({
      ok: true,
      image: `data:image/png;base64,${image}`,
      downloadName: "art-designer-result.png"
    });


  } catch (error) {

    console.error("ERROR:", error);

    res.status(400).json({
      error: error.message
    });

  }

});


app.use((err, req, res, next) => {

  console.error(err);

  res.status(400).json({
    error: err.message || "خطای ناشناخته"
  });

});


app.listen(PORT, "0.0.0.0", () => {
  console.log(
    "Art Designer running on port " + PORT
  );
});
