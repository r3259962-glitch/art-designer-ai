const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");

const OpenAI = require("openai");
const { toFile } = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("ART DESIGNER OPENAI SDK VERSION LOADED");

// --------------------------------------------------
// Upload configuration
// --------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

// --------------------------------------------------
// Static frontend
// --------------------------------------------------

app.use(express.static(path.join(__dirname, "public")));

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Art Designer Server Running"
  });
});

// --------------------------------------------------
// Image generation
// --------------------------------------------------

app.post(
  "/api/generate",
  upload.single("image"),
  async (req, res) => {
    try {

      // ----------------------------------------------
      // Check API key
      // ----------------------------------------------

      if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY IS MISSING");

        return res.status(500).json({
          error: "کلید OpenAI تنظیم نشده است"
        });
      }

      // ----------------------------------------------
      // Check uploaded image
      // ----------------------------------------------

      if (!req.file) {
        console.error("NO IMAGE RECEIVED");

        return res.status(400).json({
          error: "تصویر دریافت نشد"
        });
      }

      console.log("ORIGINAL FILE:", {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      });

      // ----------------------------------------------
      // Validate actual image bytes
      // Do NOT trust browser MIME type.
      // ----------------------------------------------

      const metadata = await sharp(req.file.buffer).metadata();

      console.log("DETECTED IMAGE:", {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height
      });

      if (
        !["jpeg", "png", "webp"].includes(
          metadata.format
        )
      ) {
        return res.status(400).json({
          error:
            "فرمت تصویر باید JPG یا PNG یا WEBP باشد"
        });
      }

      // ----------------------------------------------
      // Normalize everything to PNG
      // ----------------------------------------------

      const pngBuffer = await sharp(req.file.buffer)
        .png()
        .toBuffer();

      console.log(
        "PNG READY:",
        pngBuffer.length,
        "bytes"
      );

      // ----------------------------------------------
      // User options
      // ----------------------------------------------

      const productType =
        req.body.type || "اثر هنری";

      const style =
        req.body.style ||
        "انتخاب هوشمند توسط نرم افزار";

      const extra =
        req.body.extra || "";

      // ----------------------------------------------
      // Prompt
      // ----------------------------------------------

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

      // ----------------------------------------------
      // OpenAI client
      // ----------------------------------------------

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      console.log("CREATING OPENAI FILE...");

      // ----------------------------------------------
      // IMPORTANT:
      // Explicitly create a File with:
      // filename = uploaded.png
      // MIME = image/png
      //
      // This prevents application/octet-stream.
      // ----------------------------------------------

      const imageFile = await toFile(
        pngBuffer,
        "uploaded.png",
        {
          type: "image/png"
        }
      );

      console.log("OPENAI FILE READY:", {
        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size
      });

      // ----------------------------------------------
      // Send image edit request
      // ----------------------------------------------

      console.log("OPENAI IMAGE EDIT REQUEST");

      const result = await client.images.edit({
        model: "gpt-image-1",

        image: imageFile,

        prompt: prompt,

        size: "1024x1024"
      });

      console.log(
        "OPENAI RESPONSE RECEIVED"
      );

      // ----------------------------------------------
      // Extract generated image
      // ----------------------------------------------

      const output =
        result?.data?.[0]?.b64_json;

      if (!output) {

        console.error(
          "OPENAI RESPONSE WITHOUT IMAGE:",
          result
        );

        throw new Error(
          "تصویر خروجی ایجاد نشد"
        );
      }

      console.log(
        "IMAGE CREATED SUCCESSFULLY"
      );

      // ----------------------------------------------
      // Return image to frontend
      // ----------------------------------------------

      return res.json({
        ok: true,

        image:
          "data:image/png;base64," +
          output,

        downloadName:
          "art-designer-result.png"
      });

    } catch (error) {

      // ----------------------------------------------
      // Detailed error logging
      // ----------------------------------------------

      console.error(
        "GENERATION ERROR:"
      );

      console.error(error);

      if (error?.response) {
        console.error(
          "OPENAI RESPONSE:",
          error.response
        );
      }

      if (error?.error) {
        console.error(
          "OPENAI ERROR OBJECT:",
          error.error
        );
      }

      // ----------------------------------------------
      // Send readable error to frontend
      // ----------------------------------------------

      return res.status(
        error?.status || 500
      ).json({
        error:
          error?.error?.message ||
          error?.message ||
          "خطا در تولید تصویر"
      });
    }
  }
);

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "Art Designer listening on " +
      PORT
    );
  }
);
