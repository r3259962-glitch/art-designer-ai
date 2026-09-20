const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/*
  دریافت فایل در حافظه
*/
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },

  /*
    بعضی موبایل‌ها MIME را به صورت
    application/octet-stream
    ارسال می‌کنند.
    بنابراین فعلاً آن را هم قبول می‌کنیم
    و پایین‌تر نوع واقعی فایل را تشخیص می‌دهیم.
  */
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/octet-stream"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error(
          "فرمت عکس پشتیبانی نمی‌شود. فقط JPG، PNG یا WEBP مجاز است."
        )
      );
    }

    cb(null, true);
  }
});

/*
  فایل‌های سایت
*/
app.use(express.static(path.join(__dirname, "public")));

/*
  تست سلامت سرور
*/
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Art Designer AI"
  });
});


/*
  تشخیص MIME واقعی فایل از روی محتوای آن
*/
function detectImageMime(buffer) {

  if (!buffer || buffer.length < 12) {
    return null;
  }

  /*
    JPEG
    FF D8 FF
  */
  if (
    buffer[0] === 0xFF &&
    buffer[1] === 0xD8 &&
    buffer[2] === 0xFF
  ) {
    return "image/jpeg";
  }

  /*
    PNG
    89 50 4E 47 0D 0A 1A 0A
  */
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return "image/png";
  }

  /*
    WEBP
    RIFF .... WEBP
  */
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}


/*
  تولید تصویر
*/
app.post(
  "/api/generate",
  upload.single("image"),
  async (req, res) => {

    /*
      بررسی API Key
    */
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY روی سرور تنظیم نشده است."
      });
    }

    /*
      بررسی فایل
    */
    if (!req.file) {
      return res.status(400).json({
        error: "عکس ارسال نشده است."
      });
    }

    try {

      /*
        تشخیص MIME واقعی تصویر
      */
      const detectedMime = detectImageMime(req.file.buffer);

      if (!detectedMime) {
        return res.status(400).json({
          error:
            "نوع واقعی فایل قابل تشخیص نیست. لطفاً یک عکس JPG، PNG یا WEBP انتخاب کنید."
        });
      }

      console.log(
        "Original MIME:",
        req.file.mimetype
      );

      console.log(
        "Detected MIME:",
        detectedMime
      );


      /*
        انتخاب پسوند صحیح
      */
      let extension = "png";

      if (detectedMime === "image/jpeg") {
        extension = "jpg";
      }

      if (detectedMime === "image/webp") {
        extension = "webp";
      }


      /*
        نام فایل صحیح
      */
      const fileName =
        "uploaded-image." + extension;


      /*
        ساخت فایل برای OpenAI
        با MIME واقعی تشخیص داده شده
      */
      const imageFile = await toFile(
        req.file.buffer,
        fileName,
        {
          type: detectedMime
        }
      );


      /*
        اتصال به OpenAI
      */
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });


      /*
        اطلاعات فرم
      */
      const type =
        req.body.type ||
        "سایر آثار هنری";

      const style =
        req.body.style ||
        "انتخاب هوشمند توسط نرم‌افزار";

      const extra =
        req.body.extra ||
        "";


      /*
        دستور طراحی
      */
      const prompt = `
Create a premium commercial advertising photograph
from the uploaded artwork/product.

Product type:
${type}

Preferred style:
${style}

Additional preference:
${extra || "none"}

IMPORTANT PRODUCT PRESERVATION RULES:

Preserve the original product as faithfully as possible.

Do NOT redesign the product.

Do NOT repaint the product.

Do NOT replace the product.

Do NOT change its shape.

Do NOT change its proportions.

Do NOT change its colors.

Do NOT change its artwork.

Do NOT change its patterns.

Do NOT change its texture.

Do NOT remove distinctive details.

Do NOT invent new details on the product.

Keep the original product clearly visible
and make it the main visual focus.

Only create or change:

- surrounding environment
- background
- table or surface
- interior decoration
- lighting
- realistic shadows
- tasteful decorative context
- professional composition

Create a sophisticated,
elegant,
artistic interior suitable for
an art-loving woman around 40.

Make the final image look like
a professional commercial product photograph
suitable for an advertising poster.

No added text.

No logos.

No watermark.

No captions.

No artificial writing inside the image.
`;


      /*
        ارسال تصویر به OpenAI
      */
      const result = await client.images.edit({
        model: "gpt-image-2",
        image: imageFile,
        prompt: prompt,
        size: "1024x1024"
      });


      /*
        دریافت تصویر خروجی
      */
      const b64 =
        result.data?.[0]?.b64_json;


      if (!b64) {
        throw new Error(
          "تصویر خروجی از OpenAI دریافت نشد."
        );
      }


      /*
        ارسال نتیجه به مرورگر
      */
      res.json({
        ok: true,

        image:
          `data:image/png;base64,${b64}`,

        downloadName:
          "art-designer-result.png"
      });

    } catch (e) {

      console.error(
        "IMAGE GENERATION ERROR:",
        e
      );

      res.status(500).json({
        error:
          e.message ||
          "تولید تصویر ناموفق بود."
      });
    }
  }
);


/*
  مدیریت خطاهای Multer
*/
app.use(
  (err, req, res, next) => {

    if (err?.code === "LIMIT_FILE_SIZE") {

      return res.status(400).json({
        error:
          "حجم عکس نباید بیشتر از 15 مگابایت باشد."
      });
    }

    if (err) {

      return res.status(400).json({
        error:
          err.message ||
          "فایل نامعتبر است."
      });
    }

    next();
  }
);


/*
  اجرای سرور
*/
app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "Art Designer listening on " + PORT
    );
  }
);
