const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("ART DESIGNER DIRECT API VERSION LOADED");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("فرمت تصویر باید JPG یا PNG یا WEBP باشد"));
    }
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Art Designer Server Running"
  });
});

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "کلید OpenAI تنظیم نشده است"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "تصویر دریافت نشد"
      });
    }

    console.log("ORIGINAL FILE:", {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    const pngBuffer = await sharp(req.file.buffer)
      .png()
      .toBuffer();

    console.log("PNG READY:", pngBuffer.length, "bytes");

    const productType = req.body.type || "اثر هنری";
    const style = req.body.style || "انتخاب هوشمند توسط نرم افزار";
    const extra = req.body.extra || "";

    const prompt = `
Create a professional advertising photograph using the uploaded product.

Product type:
${productType}

Design style:
${style}

The uploaded product must remain exactly the same.

Do NOT change:
- shape
- proportions
- colors
- texture
- pattern
- materials
- details

Do NOT redesign the product.
Do NOT replace it with another object.
Do NOT add decorations to the product.
Do NOT remove any part of the product.

Only create a beautiful realistic environment around the product.

You may improve:
- interior/background
- lighting
- natural shadows
- reflections
- furniture
- decoration
- camera composition

Make the result look like a professional commercial interior-design photograph.

The product must remain the main subject.

Do not add text.
Do not add logos.
Do not add watermarks.

EXTRA USER INSTRUCTIONS:
${extra}
`;

    const form = new FormData();

    form.append("model", "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", "1024x1024");

    const imageBlob = new Blob(
      [pngBuffer],
      { type: "image/png" }
    );

    form.append(
      "image",
      imageBlob,
      "uploaded.png"
    );

    console.log("DIRECT OPENAI REQUEST:", {
      mime: imageBlob.type,
      size: pngBuffer.length
    });

    const response = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: form
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OPENAI ERROR:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "خطا از طرف OpenAI"
      });
    }

    const output = data?.data?.[0]?.b64_json;

    if (!output) {
      console.error("OPENAI RESPONSE WITHOUT IMAGE:", data);

      throw new Error("تصویر خروجی ایجاد نشد");
    }

    console.log("IMAGE CREATED SUCCESSFULLY");

    res.json({
      ok: true,
      image: "data:image/png;base64," + output,
      downloadName: "art-designer-result.png"
    });

  } catch (error) {
    console.error("GENERATION ERROR:", error);

    res.status(500).json({
      error: error?.message || "خطا در تولید تصویر"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Art Designer listening on " + PORT);
});
