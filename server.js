const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const { InferenceClient } = require("@huggingface/inference");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("ART DESIGNER FREE HF VERSION LOADED");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Art Designer Server Running",
    provider: process.env.IMAGE_PROVIDER || "huggingface"
  });
});

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "تصویر دریافت نشد"
      });
    }

    if (!process.env.HF_TOKEN) {
      return res.status(500).json({
        error: "توکن رایگان Hugging Face تنظیم نشده است. متغیر HF_TOKEN را در Railway اضافه کنید."
      });
    }

    console.log("ORIGINAL FILE:", {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    const metadata = await sharp(req.file.buffer).metadata();

    console.log("DETECTED IMAGE:", {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height
    });

    if (!["jpeg", "png", "webp"].includes(metadata.format)) {
      return res.status(400).json({
        error: "فرمت تصویر باید JPG یا PNG یا WEBP باشد"
      });
    }

    const pngBuffer = await sharp(req.file.buffer)
      .png()
      .toBuffer();

    const productType = req.body.type || "اثر هنری";
    const style = req.body.style || "انتخاب هوشمند توسط نرم افزار";
    const extra = req.body.extra || "";

    const prompt = `
Create a professional advertising photograph using the uploaded product.

Product type:
${productType}

Design style:
${style}

The uploaded product is the reference product and must remain the same recognizable physical object.

Preserve the product's:
- shape
- proportions
- colors
- texture
- pattern
- materials
- construction
- important details

Do not redesign, replace, duplicate, remove, or merge the product.

Only transform the environment around it:
- interior/background
- lighting
- natural shadows
- reflections
- furniture
- decoration
- camera composition

Create a realistic professional commercial interior-design photograph.
Keep the uploaded product as the main subject.

Do not add text, logos, or watermarks.

EXTRA USER INSTRUCTIONS:
${extra}
`;

    console.log("HF IMAGE EDIT REQUEST");

    const client = new InferenceClient({
      apiKey: process.env.HF_TOKEN
    });

    // Qwen Image Edit is designed specifically for instruction-based image editing.
    // Hugging Face currently documents it with the fal-ai inference provider.
    const resultBlob = await client.imageToImage({
      model: "Qwen/Qwen-Image-Edit",
      inputs: new Blob([pngBuffer], { type: "image/png" }),
      prompt
    }, {
      provider: "fal-ai"
    });

    const outputBuffer = Buffer.from(
      await resultBlob.arrayBuffer()
    );

    console.log(
      "HF IMAGE CREATED SUCCESSFULLY:",
      outputBuffer.length,
      "bytes"
    );

    return res.json({
      ok: true,
      image:
        "data:image/png;base64," +
        outputBuffer.toString("base64"),
      downloadName: "art-designer-result.png"
    });

  } catch (error) {
    console.error("HF GENERATION ERROR:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "خطا در تولید تصویر با Hugging Face"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Art Designer listening on " + PORT);
});
