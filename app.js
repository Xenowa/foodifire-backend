// =======
// imports
// =======
// setting up dotenv
require('dotenv').config()

// Setting up express
const express = require("express")
const app = express()
app.use(express.json({ "limit": "100mb" })) // increase image load

// Importing authentication middleware
const auth = require("./middleware/auth")

// setting up cors for specific addresses to prevent origin blocking
const cors = require("cors")
const whitelist = process.env.CORS_DOMAINS
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

app.use(cors(corsOptions))

// importing tensorflowjs & Model
const tf = require("@tensorflow/tfjs-node")
const { loadGraphModel } = require("@tensorflow/tfjs-node")

// =============
// ML Prediction (MobileNet V2)[80% Val_Accuracy]
// =============
// Set the model
let model = ""

// Food Classes
const classes = ['apple_pie', 'bread_pudding', 'carrot_cake', 'cheesecake', 'chocolate_cake', 'club_sandwich', 'cup_cakes', 'fish_and_chips', 'french_fries', 'fried_rice']

const predictFoodImage = async (image) => {
    // Recieve the buffer data of the image dataURL
    const imageBuffer = Buffer.from(image.split(",")[1], "base64")

    // Decode the image to a tensor
    const decodedImage = tf.node.decodeImage(imageBuffer)

    // Resize the image to 224x224
    const resizedImage = tf.image.resizeBilinear(decodedImage, [224, 224])

    // Expand the dimensitons to fit the input shape of the model
    const input = resizedImage.expandDims()

    // Get the predictions for the image
    const prediction = model.predict(input)

    // Get the index of highest predicted class
    const topPrediction = prediction.argMax(axis = -1).arraySync()

    // Round off the best prediction to integer value
    const roundedPredicition = Math.round(topPrediction[0])

    // Get the prediction as a label
    const predictedFood = classes[roundedPredicition]

    // Return predicted output to the user
    return predictedFood
}

// ======================
// Serving express server
// ======================
// Loading the database
const mongoose = require("mongoose")
const foodDiseases = require("./models/foodDiseasesModel")
const port = process.env.PORT || 3000

app.listen(port, async () => {
    console.log(`Listening on port ${port}...`)

    // Load the ML Model
    model = await loadGraphModel("file://./mobilenetV2_tfjs/model.json")

    // Load the DB
    mongoose
        .connect(process.env.MONGODB_CON_URL)
        .then(() => {
            console.log("DB Server running...")
        }).catch((err) => {
            console.log("DB is not functional!")
            console.log(err)
        })
})

// ==========
// Home Route
// ==========
app.get("/", (req, res) => {
    console.log(`${req.hostname} | ${req.ip}: has requested for home page`)
    res.send("<h1>Welcome to foodifire 🔥</h1>")
})

// ================
// Get Report Route
// ================
let imgDataURL = "";

app.post("/getReport", auth, async (req, res) => {
    console.log(`${req.hostname} | ${req.ip}: has requested a report using post`)

    // Get the user image from the request body
    imgDataURL = req.body.image
    const userImage = req.body.image

    // No Image Validation response
    if (!userImage) {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Number validation response
    if (!isNaN(userImage)) {
        return res.status(403).send({ message: "Error!, Number inputs not allowed!" })
    }

    // String validation response
    if (userImage.split(",")[0] !== "data:image/jpeg;base64") {
        return res.status(403).send({ message: "Error!, Invalid format" })
    }

    // Pass the image to the machine learning model and get foodname
    let generatedFoodName = await predictFoodImage(userImage) // EX:- apple_pie

    // Convert the generated label to the actual food name format showed in the database
    generatedFoodName = generatedFoodName.split("_").join(" ")
    const foodName = generatedFoodName.charAt(0).toUpperCase() + generatedFoodName.slice(1) // Apple pie

    // DB Operation
    try {
        // Send food name and get relevant details
        const results = await foodDiseases.findOne({ foodName: foodName })

        // get the diseases from the details
        const diseases = results.diseases

        // Send back report data to the user
        res.status(200).send({
            foodName: foodName,
            relatedConditions: diseases
        })
    } catch (error) {
        console.log(error)

        res.status(200).send({
            foodName: foodName,
            message: "Error!, Database not functional!"
        })
    }
})

// ================
// Show Image Route
// ================
app.get("/userImage", auth, (req, res) => {
    console.log(`${req.hostname} | ${req.ip}: has requested the image to be predicted`)

    if (imgDataURL === undefined) {
        return res.status(403).send({ message: "Error Invalid Image" })
    }

    res.send(`<img src='${imgDataURL}' alt='Testing Image'></img>`)
})

// ==========
// Google SSO
// ==========
// Importing required modules
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");

// server.js
/**
 *  This function is used verify a google account
 */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const User = require("./models/userModel")

async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        return { payload: ticket.getPayload() };
    } catch (error) {
        return { error: "Invalid user detected. Please try again" };
    }
}

// Google SSO - Sign In | Log In
app.post("/login", async (req, res) => {
    try {
        // console.log({ verified: verifyGoogleToken(req.body.credential) });
        if (req.body.credential) {
            // Validate if the user has google account
            const verificationResponse = await verifyGoogleToken(req.body.credential);

            if (verificationResponse.error) {
                return res.status(401).json({
                    message: verificationResponse.error,
                });
            }

            // Get the user data
            const profile = verificationResponse?.payload;

            // Cross check user data email with db stored email
            const existsInDB = await User.findOne({ "userSSO.email": profile.email });

            // If no user exists create a new user
            if (!existsInDB) {
                console.log(`${req.hostname} | ${req.ip}: has registered to foodifire!`)
                // Create a user object with the data
                const newUser = new User({
                    userSSO: profile,
                    diseases: [],
                    savedReports: []
                })

                // Create a new user in the database
                await newUser.save().then(() => {
                    console.log("New user has registered!")
                }).catch((err) => {
                    console.log(err)
                })

                return res.json({
                    message: "Signup was successful",
                    user: {
                        firstName: profile?.given_name,
                        lastName: profile?.family_name,
                        picture: profile?.picture,
                        email: profile?.email,
                        token: jwt.sign({ email: profile?.email }, process.env.JWT_SECRET, {
                            expiresIn: "1d",
                        }),
                    },
                    diseases: newUser.diseases,
                    savedReports: newUser.savedReports
                });
            }

            // If user exists, send back token
            console.log(`${req.hostname} | ${req.ip}: has Attempted a login!`)
            res.json({
                message: "Login was successful",
                user: {
                    firstName: profile?.given_name,
                    lastName: profile?.family_name,
                    picture: profile?.picture,
                    email: profile?.email,
                    token: jwt.sign({ email: profile?.email }, process.env.JWT_SECRET, {
                        expiresIn: "1d",
                    }),
                },
                diseases: existsInDB.diseases,
                savedReports: existsInDB.savedReports
            });
        }
    } catch (error) {
        res.status(500).json({
            message: "An error occurred. Registration failed.",
        });
    }
})

// Delete user
app.delete("/user", auth, async (req, res) => {
    console.log(`${req.hostname} | ${req.ip}: has deleted his user account!`)

    // Get the user email
    const userEmail = req.body.userEmail

    // No email Validation response
    if (!userEmail) {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Number validation response
    if (!isNaN(userEmail)) {
        return res.status(403).send({ message: "Error!, Number inputs not allowed!" })
    }

    // Empty string response
    if (userEmail === "") {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Check if user exists and delete
    try {
        // Perform deletion
        await User.findOneAndDelete({ "userSSO.email": userEmail })

        // Send back the confirmation message
        res.send({ message: "User account deleted successfully!" })
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "An error occured. account deletion failed!"
        })
    }
})

// =======================
// MongoDB Crud Operations
// =======================
// Add disease
app.post("/disease", auth, async (req, res) => {
    console.log(`${req.hostname} | ${req.ip}: has Entered a disease condition!`)

    // get the disease
    const { userEmail, condition } = req.body
    // No Image Validation response
    if (!condition) {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Number validation response
    if (!isNaN(condition)) {
        return res.status(403).send({ message: "Error!, Number inputs not allowed!" })
    }

    // Empty string response
    if (condition === "") {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Check if user exists and update diseases
    try {
        // Filter by email
        const filter = { "userSSO.email": userEmail }
        // Push to array
        const update = { $push: { diseases: condition } }

        // Perform update
        await User.findOneAndUpdate(filter, update)

        // Send back the confirmation message
        res.send({ message: "Disease inserted successfully!" })
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "An error occured. disease adding failed!"
        })
    }
})

// Delete disease
app.delete("/disease", auth, async (req, res) => {
    console.log(`${req.hostname} | ${req.ip}: has deleted a disease!`)

    // get the disease
    const { userEmail, condition } = req.body
    // No Image Validation response
    if (!condition) {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Number validation response
    if (!isNaN(condition)) {
        return res.status(403).send({ message: "Error!, Number inputs not allowed!" })
    }

    // Empty string response
    if (condition === "") {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Check if user exists and delete diseases
    try {
        // Filter by email
        const filter = { "userSSO.email": userEmail }
        // delete from array
        const update = { $pull: { diseases: condition } }

        // Perform update
        await User.findOneAndUpdate(filter, update)

        // Send back the confirmation message
        res.send({ message: "Disease deleted successfully!" })
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "An error occured. disease deleting failed!"
        })
    }
})

// Add report
app.post("/report", auth, async (req, res) => {
    console.log(`${req.hostname} | ${req.ip}: has saved a report!`)

    // get the data
    const { userEmail, report } = req.body

    // No Image Validation response
    if (!report.imgURL) {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Number validation response
    if (!isNaN(report.imgURL)) {
        return res.status(403).send({ message: "Error!, Number inputs not allowed!" })
    }

    // String validation response
    if (report.imgURL.split(",")[0] !== "data:image/jpeg;base64") {
        return res.status(403).send({ message: "Error!, Invalid format" })
    }

    // Check if user exists and update reports
    try {
        // Filter by email
        const filter = { "userSSO.email": userEmail }
        // Push to array
        const update = { $push: { savedReports: report } }

        // Perform update
        await User.findOneAndUpdate(filter, update)

        // Send back the confirmation message
        res.send({ message: "Report inserted successfully!" })
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "An error occured. report adding failed!"
        })
    }
})

// Delete report
app.delete("/report", auth, async (req, res) => {
    console.log(`${req.hostname} | ${req.ip}: has deleted a report!`)

    // get the data
    const { userEmail, report } = req.body

    // No Image Validation response
    if (!report.imgURL) {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Number validation response
    if (!isNaN(report.imgURL)) {
        return res.status(403).send({ message: "Error!, Number inputs not allowed!" })
    }

    // Empty string response
    if (report.imgURL === "") {
        return res.status(403).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Check if user exists and update diseases
    try {
        // Filter by email
        const filter = { "userSSO.email": userEmail }
        // delete from array
        const update = { $pull: { savedReports: report } }

        // Perform update
        await User.findOneAndUpdate(filter, update)

        // Send back the confirmation message
        res.send({ message: "Report deleted successfully!" })
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "An error occured. report deleting failed!"
        })
    }
})