const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");
const sharp = require("sharp");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// ======================
// Upload Settings
// ======================

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
      cb(
        new Error(
          "فرمت تصویر باید JPG یا PNG یا WEBP باشد"
        )
      );
    }
  }
});

// ======================
// Static Website
// ======================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// ======================
// Health Check
// ======================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Art Designer Server Running"
  });
});

// ======================
// Generate Poster
// ======================

app.post(
  "/api/generate",
  upload.single("image"),

  async (req, res) => {
    try {

      // ----------------------
      // Check API Key
      // ----------------------

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "کلید OpenAI تنظیم نشده است"
        });
      }

      // ----------------------
      // Check uploaded image
      // ----------------------

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

      // ----------------------
      // Convert uploaded image
      // to real PNG
      // ----------------------

      console.log("Converting image to PNG...");

      const pngBuffer = await sharp(req.file.buffer)
        .png()
        .toBuffer();

      console.log(
        "PNG conversion successful. Size:",
        pngBuffer.length
      );

      // ----------------------
      // OpenAI Client
      // ----------------------

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // ----------------------
      // User options
      // ----------------------

      const productType =
        req.body.type ||
        "محصول هنری";

      const style =
        req.body.style ||
        "انتخاب هوشمند توسط نرم‌افزار";

      const extra =
        req.body.extra ||
        "";

      // ----------------------
      // Prompt
      // ----------------------

      const prompt = `
Create a premium professional advertising photograph
using the uploaded product image.

PRODUCT TYPE:
${productType}

DESIGN STYLE:
${style}

IMPORTANT PRODUCT PRESERVATION RULES:

- The uploaded product is the exact product that must appear in the final image.
- Preserve the product exactly as uploaded.
- Do NOT redesign the product.
- Do NOT change its shape.
- Do NOT change its proportions.
- Do NOT change its colors.
- Do NOT change its texture.
- Do NOT change its pattern.
- Do NOT change its materials.
- Do NOT add decorations to the product.
- Do NOT remove any part of the product.
- Do NOT create a different version of the product.
- Do NOT replace the product with a similar object.

The product itself must remain visually identical.

You may only create or improve:

- Interior/background
- Lighting
- Natural shadows
- Reflections when appropriate
- Camera composition
- Surrounding furniture
- Interior decoration
- Professional commercial atmosphere

Place the exact product naturally inside a beautiful,
realistic home or suitable interior environment.

The background should support the product and should
NOT distract from it.

Make the result look like a professional commercial
interior-design advertisement photographed by a
professional product photographer.

The final image should be realistic and elegant.

Do not put text on the image.
Do not add logos.
Do not add watermarks.

EXTRA USER INSTRUCTIONS:

${extra}
`;

      // ----------------------
      // Convert PNG buffer
      // to OpenAI file
      // ----------------------

      const imageFile = await toFile(
        pngBuffer,
        "uploaded-image.png",
        {
          type: "image/png"
        }
      );

      console.log(
        "Sending PNG image to OpenAI..."
      );

      // ----------------------
      // Generate image
      // ----------------------

      const result =
        await client.images.edit({
          model: "gpt-image-1",
          image: imageFile,
          prompt: prompt,
          size: "1024x1024"
        });

      // ----------------------
      // Get generated image
      // ----------------------

      const output =
        result.data?.[0]?.b64_json;

      if (!output) {
        throw new Error(
          "تصویر خروجی ایجاد نشد"
        );
      }

      console.log(
        "Image generated successfully."
      );

      // ----------------------
      // Send result
      // ----------------------

      res.json({
        ok: true,

        image:
          "data:image/png;base64," +
          output,

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
          "خطا در تولید تصویر"
      });
    }
  }
);

// ======================
// Start Server
// ======================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "Art Designer running on port " +
      PORT
    );
  }
);
