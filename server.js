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
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});


app.post("/api/generate", upload.single("image"), async (req, res) => {

  try {

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "کلید OpenAI تنظیم نشده است."
      });
    }


    if (!req.file) {
      return res.status(400).json({
        error: "فایل تصویر دریافت نشد."
      });
    }


    console.log("UPLOAD:", {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });


    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });


    const productType =
      req.body.type || "اثر هنری";

    const style =
      req.body.style || "انتخاب هوشمند";

    const extra =
      req.body.extra || "";


    const prompt = `
Create a premium commercial interior photo.

Product:
${productType}

Style:
${style}

Rules:
Keep the uploaded product exactly unchanged.
Do not redesign it.
Do not change colors.
Do not change shape.
Do not remove details.
Only improve background, lighting, shadows and environment.

Make it look like a professional advertising photograph.

No text.
No logo.
No watermark.

Extra:
${extra}
`;


    /*
      تبدیل مستقیم به Data URL
      تا MIME همیشه مشخص باشد
    */
    const base64 =
      req.file.buffer.toString("base64");


    const imageInput =
      `data:image/png;base64,${base64}`;


    const result =
      await client.images.edit({

        model: "gpt-image-1",

        image: imageInput,

        prompt: prompt,

        size: "1024x1024"

      });


    const output =
      result.data?.[0]?.b64_json;


    if (!output) {
      throw new Error(
        "تصویر خروجی دریافت نشد."
      );
    }


    res.json({

      ok: true,

      image:
        `data:image/png;base64,${output}`,

      downloadName:
        "art-designer-result.png"

    });


  } catch (error) {

    console.error(
      "ERROR:",
      error
    );


    res.status(400).json({

      error:
        error.message ||
        "خطای تولید تصویر"

    });

  }

});


app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "Art Designer running on " + PORT
    );

  }
);
