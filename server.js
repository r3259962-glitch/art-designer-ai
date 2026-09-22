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


      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });


      const productType =
        req.body.type || "محصول";


      const style =
        req.body.style || "انتخاب هوشمند";


      const extra =
        req.body.extra || "";


      const prompt = `

Create a premium professional advertising photo.

Product:
${productType}

Style:
${style}

IMPORTANT RULES:

- Keep the uploaded product exactly unchanged.
- Do not redesign the product.
- Do not change its shape.
- Do not change its colors.
- Do not remove important details.
- Do not add fake details to the product.
- Preserve the exact identity and appearance of the uploaded product.

Only improve:

- Background
- Lighting
- Shadows
- Environment
- Professional composition

Place the product naturally inside a beautiful realistic interior suitable for advertising.

Make it look like a high-end professional commercial photography shot.

No text.
No logo.
No watermark.

Extra instructions:

${extra}

`;


      // ==========================================
      // تبدیل واقعی تصویر به PNG با Sharp
      // ==========================================

      console.log("Converting image to PNG...");


      const pngBuffer = await sharp(req.file.buffer)
        .png()
        .toBuffer();


      console.log(
        "PNG conversion successful:",
        pngBuffer.length,
        "bytes"
      );


      // ==========================================
      // ساخت فایل PNG استاندارد برای OpenAI
      // ==========================================

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


      // ==========================================
      // Generate Image
      // ==========================================

      const result =
        await client.images.edit({

          model: "gpt-image-1",

          image: imageFile,

          prompt: prompt,

          size: "1024x1024"

        });


      // ==========================================
      // دریافت تصویر خروجی
      // ==========================================

      const output =
        result.data?.[0]?.b64_json;


      if (!output) {

        throw new Error(
          "تصویر خروجی از OpenAI دریافت نشد"
        );

      }


      console.log(
        "Image generated successfully."
      );


      // ==========================================
      // ارسال نتیجه به مرورگر
      // ==========================================

      res.json({

        ok: true,

        image:
          "data:image/png;base64," +
          output,

        downloadName:
          "art-designer-result.png"

      });


    }

    catch (error) {

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
