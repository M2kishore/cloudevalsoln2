const express = require("express");
const mysql = require("mysql");
const zipcodes = require("zipcodes");
const sqlops = require("./utils/sqlOps");
const { Storage } = require("@google-cloud/storage");
const app = express();
app.use(express.static("../frontend"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;

// Multer for file upload
const multer = require("multer");
const upload = multer({ dest: "uploadsHolding/" });

const destBucketName = "cbenu4cse19127bucket"; //Mention your bucket name
let destFileName = "";
const storageClient = new Storage({
  keyFilename: "./gcpkey/key.json", //Mention Your Key name
});
const bucket = storageClient.bucket(destBucketName);

app.post("/submit", upload.single("housePhoto"), async (req, res) => {
  const houseData = req.body;
  console.log(req.body, req.file);
  let errors = [];

  // Validation
  if (houseData.houseNo == undefined || houseData.houseNo.length < 2) {
    errors.push("House No. has to be entered with length atleast 2");
  }
  if (houseData.houseName == undefined || houseData.houseName.length < 4) {
    errors.push("House Name has to be entered with length atleast 4");
  }
  if (houseData.zipcode == undefined || houseData.zipcode.length != 5) {
    errors.push("Zipcode has to be entered with length exactly 5");
  }

  if (errors.length == 0) {
    try {
      destFileName = `./uploadsHolding/${req.file.filename}`;
      await bucket.upload(destFileName, {
        destination: req.file.filename + ".png",
      });
      console.log(
        `${destFileName} copied to gs://${destBucketName}/${destFileName}`
      );
    } catch (err) {
      console.error(err);
    }
    const zipcity = zipcodes.lookup(houseData.zipcode).city;

    // Insert to GCP MySQL Table
    const newHouse = {
      houseNo: houseData.houseNo,
      houseName: houseData.houseName,
      zipcode: houseData.zipcode,
      city: zipcity,
      housePhotoFileName: req.file.filename + ".png",
    };

    sqlops.insertData(newHouse);
    res.send("Success...");
  } else {
    // console.log(errors);
    let errString = "";
    errors.forEach((err) => (errString += `<h4>${err}</h4>`));
    // Show error page
    res.status(500)
      .send(`<div style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
        "Helvetica Neue", sans-serif;'>
                <h2>Errors present</h2>
                ${errString}
                <a href="/">Retry</a>
            </div>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server started on Port ${PORT}...`);
});
