const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");
const sharp = require("sharp");
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
      "image/webp"
    ];

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

app.post(
  "/api/generate",
  upload.single("image"),
  async (req, res) => {
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

      console.log("UPLOAD:", {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      });

      // تبدیل تصویر ورودی به PNG واقعی
      const pngBuffer = await sharp(req.file.buffer)
        .png()
        .toBuffer();

      console.log("PNG created:", pngBuffer.length, "bytes");

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const productType =
        req.body.type || "محصول هنری";

      const style =
        req.body.style ||
        "انتخاب هوشمند توسط نرم‌افزار";

      const extra =
        req.body.extra || "";

      const prompt = `
Create a professional advertising photograph using
the uploaded product.

PRODUCT TYPE:
${productType}

DESIGN STYLE:
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

Only create a beautiful realistic environment around
the product.

You may improve:
- interior/background
- lighting
- natural shadows
- reflections
- furniture
- decoration
- camera composition

Make the result look like a professional commercial
interior-design photograph.

The product must remain the main subject.

Do not add text.
Do not add logos.
Do not add watermarks.

EXTRA USER INSTRUCTIONS:
${extra}
`;

      // ساخت یک فایل واقعی با MIME صریح image/png
      // به جای Data URL یا Buffer خام
      const imageFile = await toFile(
        pngBuffer,
        "uploaded.png",
        { type: "image/png" }
      );

      console.log("OPENAI FILE:", {
        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size
      });

      const result = await client.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        size: "1024x1024"
      });

      const output = result.data?.[0]?.b64_json;

      if (!output) {
        throw new Error("تصویر خروجی ایجاد نشد");
      }

      console.log("Image generated successfully.");

      res.json({
        ok: true,
        image: "data:image/png;base64," + output,
        downloadName: "art-designer-result.png"
      });

    } catch (error) {
      console.error("GENERATION ERROR:", error);

      res.status(400).json({
        error:
          error?.message ||
          "خطا در تولید تصویر"
      });
    }
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log("Art Designer listening on " + PORT);
});
