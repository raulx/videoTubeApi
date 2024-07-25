import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import app from "./app.js";

import connectDb from "./db/index.js";

dotenv.config({ path: "./.env" });

// cloudinary service configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_SECRET,
  api_secret: process.env.CLOUDINARY_KEY,
});

connectDb()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
