const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const { toFile } = require("openai");
const sharp = require("sharp");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;


// Upload
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


// Website
app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// Health
app.get("/health", (req, res) => {

  res.json({
    ok: true,
    message: "Art Designer Server Running"
  });

});


// Generate Image
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


      console.log("ORIGINAL FILE:", {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      });



      // تبدیل اجباری تصویر به PNG واقعی

      const pngBuffer =
        await sharp(req.file.buffer)
          .png()
          .toBuffer();


      console.log(
        "PNG READY:",
        pngBuffer.length
      );



      const client = new OpenAI({

        apiKey:
          process.env.OPENAI_API_KEY

      });



      const productType =
        req.body.type ||
        "اثر هنری";


      const style =
        req.body.style ||
        "انتخاب هوشمند";



      const extra =
        req.body.extra ||
        "";



      const prompt = `

Create a premium professional advertising photograph.

Product:
${productType}

Style:
${style}


IMPORTANT:

Keep the uploaded product exactly unchanged.

Do not change:
- shape
- colors
- size
- texture
- pattern
- materials
- details


Do not redesign the product.

Only improve:

- background
- lighting
- shadows
- interior environment
- composition


Make it look like a high-end commercial photo.

No text.
No logo.
No watermark.


Extra instructions:

${extra}

`;



      // ساخت فایل PNG با MIME مشخص

      const imageFile =
        await toFile(

          pngBuffer,

          "uploaded.png",

          {
            type: "image/png"
          }

        );



      console.log("OPENAI FILE:", {

        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size

      });



      const result =
        await client.images.edit({

          model: "gpt-image-1",

          image: imageFile,

          prompt: prompt,

          size: "1024x1024"

        });



      const output =
        result.data?.[0]?.b64_json;



      if (!output) {

        throw new Error(
          "تصویر خروجی ایجاد نشد"
        );

      }



      console.log(
        "IMAGE CREATED SUCCESSFULLY"
      );



      res.json({

        ok: true,

        image:
          "data:image/png;base64," +
          output,


        downloadName:
          "art-designer-result.png"

      });



    }

    catch(error) {


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



// Start

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
