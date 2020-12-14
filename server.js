require("dotenv").config();
var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var md5 = require("md5");
var myUrl = require("url");
var dns = require("dns");
var multer = require("multer");
var upload = multer({ dest: "uploads/" });
// var validate = require("valid-url");
var app = express();
var port = process.env.PORT || 5000;
var cors = require("cors");
const { url } = require("inspector");
const Nexmo = require("nexmo");

const nexmo = new Nexmo({
   apiKey: process.env.VONAGE_API_KEY,
   apiSecret: process.env.VONAGE_API_SECRET,
});
// app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204
app.use(cors());
// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));
app.use("/public", express.static(`${process.cwd()}/public`));

//using body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// databse connection
mongoose.connect(process.env.MONGO_URI, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
});
const userSchema = new mongoose.Schema({
   role: String,
   email: String,
   name: String,
   password: String,
   age: Number,
   gender: String,
   phone: String,
   dateOfBith: String,
   dateJoined: String,
   profileImage: String,
   Photos: [],
   location: {},
   relatives: [
      {
         name: String,
         relationship: String,
         location: {},
         profileImage: String,
      },
   ],
   frieds: [{ name: String, location: {}, profileImage: String }],
});
const user = mongoose.model("user", userSchema);
//home route
app.get("/", function (req, res) {
   res.sendFile(__dirname + "/views/index.html");
});

//DISTRESS CALL
app.post("/distress", function (req, res) {
   const ipaddress = req.connection.remoteAddress;
   const location = ""; //from database
   //use geolocation or ipaddress to calculate location and compare to the one in the database then send distress call to phone number whose location is neer and neerest police and family members
   const message = `this is a DISTRESS CALL from ${location} near you . SOMEONE IS IN TROUBLE`;
   nexmo.message.sendSms(
      "SecureMe",
      2348023767822,
      message,
      (err, responseData) => {
         if (err) {
            console.log(err);
         } else {
            if (responseData.messages[0]["status"] === "0") {
               console.log("Message sent successfully.");
            } else {
               console.log(
                  `Message failed with error: ${responseData.messages[0]["error-text"]}`
               );
            }
         }
      }
   );
   res.sendFile(__dirname + "/views/signal_sent.html");
   console.log("destress call sent");
});
//ANONYMOUS MESSAGE
app.post("/anon_msg", function (req, res) {
   const message = req.body.message.trim();
   const ipaddress = req.connection.remoteAddress;
   if (!message) {
      return res.status(400).json({
         status: "error",
         message: "Missing required email and password fields",
      });
   } else {
      //use geolocation or ipaddress to calculate location and compare to the one in the database then send distress call to phone number whose location is neer
      nexmo.message.sendSms(
         "SecureMe",
         2348023767822,
         message,
         (err, responseData) => {
            if (err) {
               console.log(err);
            } else {
               if (responseData.messages[0]["status"] === "0") {
                  console.log("Message sent successfully.");
               } else {
                  console.log(
                     `Message failed with error: ${responseData.messages[0]["error-text"]}`
                  );
               }
            }
         }
      );
      res.sendFile(__dirname + "/views/message_sent.html");
      console.log("sending anonymous message");
   }
});

//SIGNUP
app.post("/signup", function (req, res) {
   const { email, username, password1, password2 } = req.body;
   if (!email || !username || !password1 || !password2) {
      return res.status(400).json({
         status: "error",
         message: "Missing required email and password fields",
      });
   }
   if (password1.length <= 5) {
      return res.status(400).json({
         status: "error",
         message: "password fields should be greater than 5",
      });
   }
   if (password1 !== password2) {
      return res.status(400).json({
         status: "error",
         message: "the two password fields should match",
      });
   } else {
      user.findOne({ email: email }, (err, data) => {
         if (err) {
            return res.status(500).json({
               status: "error",
               message: "An error occurred trying to process your request",
            });
         } else {
            if (data) {
               return res.status(404).json({
                  status: "error",
                  message:
                     "User with the specified email already exists, try logging in",
               });
            } else {
               const newUser = new user({
                  email: email,
                  password: md5(password1),
                  name: username,
               });
               newUser.save((err, data) => {
                  if (err) {
                     return res.status(500).json({
                        status: "error",
                        message:
                           "An error occurred trying to process your request",
                     });
                  } else {
                     res.json({ signup_status: "succesful", ...data });
                  }
               });
            }
         }
      });
   }
});

//LOGIN
app.post("/login", function (req, res) {
   const { email, password } = req.body;
   if (!email || !password || email.length == 0 || password.length == 0) {
      return res.status(400).json({
         status: "error",
         message: "Missing required email and password fields",
      });
   } else {
      user.findOne({ email: email }, (err, data) => {
         if (err) {
            return res.status(500).json({
               status: "error",
               message: "An error occurred trying to process your request",
            });
         } else if (!data) {
            return res.status(404).json({
               status: "error",
               message: "User with the specified email does not exists",
            });
         } else if (data) {
            if (data.password !== md5(password)) {
               return res.status(404).json({
                  status: "error",
                  message: "invalid password provided",
               });
            } else if (data.password === md5(password)) {
               res.json({ login_status: "succesful", ...data });
            }
         }
      });
   }
});
//listener
var listener = app.listen(port, function () {
   console.log("Your app is listening on port " + listener.address().port);
});
