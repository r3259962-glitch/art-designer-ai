const express=require("express");
const multer=require("multer");
const OpenAI=require("openai");
const fs=require("fs");
const path=require("path");
const app=express();
const PORT=process.env.PORT||3000;
const upload=multer({dest:"/tmp/art-designer",limits:{fileSize:15*1024*1024}});
app.use(express.static(path.join(__dirname,"public")));
app.get("/health",(req,res)=>res.json({ok:true}));
app.post("/api/generate",upload.single("image"),async(req,res)=>{
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"OPENAI_API_KEY روی سرور تنظیم نشده است."});
  if(!req.file)return res.status(400).json({error:"عکس ارسال نشده است."});
  try{
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const type=req.body.type||"سایر آثار هنری";
    const style=req.body.style||"انتخاب هوشمند توسط نرم‌افزار";
    const extra=req.body.extra||"";
    const prompt=`Create a premium commercial interior/product photograph from the uploaded image.
Product type: ${type}. Style: ${style}. Extra preference: ${extra||"none"}.
PRESERVE THE PRODUCT: keep its shape, proportions, colors, artwork, patterns, texture, edges and distinctive details as faithfully as possible. Do not redesign, repaint, replace, simplify or invent details on the product. Change only the surrounding environment, surface, lighting, shadows and tasteful decorative context. Keep the product clearly visible and the visual focus. Use a mature, artistic, elegant interior suitable for an art-loving woman around 40. No added text, logos or watermarks.`;
    const result=await client.images.edit({model:"gpt-image-2",image:fs.createReadStream(req.file.path),prompt,size:"1024x1024"});
    const b64=result.data?.[0]?.b64_json;
    if(!b64)throw new Error("تصویر خروجی دریافت نشد.");
    res.json({ok:true,image:`data:image/png;base64,${b64}`,downloadName:"art-designer-result.png"});
  }catch(e){console.error(e);res.status(500).json({error:e.message||"تولید تصویر ناموفق بود."});}
  finally{fs.promises.unlink(req.file.path).catch(()=>{});}
});
app.listen(PORT,"0.0.0.0",()=>console.log("Art Designer listening on "+PORT));