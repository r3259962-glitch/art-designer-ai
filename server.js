const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const sharp = require("sharp");
const path = require("path");
const { File } = require("buffer");

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


// Static website
app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// Health check
app.get("/health", (req, res) => {

  res.json({
    ok: true,
    message: "Art Designer Server Running"
  });

});


// Generate
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



      // Convert to real PNG

      const pngBuffer =
        await sharp(req.file.buffer)
          .png()
          .toBuffer();


      console.log(
        "PNG READY:",
        pngBuffer.length
      );



      const imageFile = new File(
        [pngBuffer],
        "uploaded.png",
        {
          type: "image/png"
        }
      );


      console.log("FILE CREATED:", {
        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size
      });



      const client = new OpenAI({

        apiKey:
          process.env.OPENAI_API_KEY

      });



      const productType =
        req.body.type ||
        "اثر هنری";


      const style =
        req.body.style ||
        "انتخاب هوشمند توسط نرم افزار";


      const extra =
        req.body.extra ||
        "";



      const prompt = `

Create a professional advertising photograph.

Product:
${productType}

Style:
${style}

The uploaded product must remain exactly unchanged.

Do not change:
- shape
- size
- colors
- texture
- materials
- details

Only improve:
- background
- lighting
- shadows
- interior
- composition

Make it look like a premium commercial photo.

No text.
No watermark.
No logo.

Extra instructions:

${extra}

`;



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
          "data:image/png;base64," + output,

        downloadName:
          "art-designer-result.png"

      });



    } catch(error) {


      console.error(
        "GENERATION ERROR:",
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



app.listen(

  PORT,

  "0.0.0.0",

  () => {

    console.log(
      "Art Designer listening on " + PORT
    );

  }

);
