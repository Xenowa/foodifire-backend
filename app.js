// =======
// imports
// =======
// setting up dotenv
require('dotenv').config()

// Setting up express
const express = require("express")
const app = express()
app.use(express.json({ "limit": "100mb" })) // increase image load

// setting up cors for specific addresses to prevent origin blocking
const cors = require("cors")
const whitelist = process.env.CORS_DOMAINS
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

app.use(cors(corsOptions))

// importing the database
const { client, database } = require("./db/db")

// importing tensorflowjs & Model
const tf = require("@tensorflow/tfjs-node")
const { loadGraphModel } = require("@tensorflow/tfjs-converter")

// ==========
// Home Route
// ==========
app.get("/", (req, res) => {
    res.send("<h1>Welcome to foodifire 🔥</h1>")
})

// =============
// ML Prediction (MobileNet V2)[81% Val_Accuracy]
// =============
// Food Classes
const classes = ['apple_pie', 'bread_pudding', 'carrot_cake', 'cheesecake', 'chocolate_cake', 'club_sandwich', 'cup_cakes', 'fish_and_chips', 'french_fries', 'fried_rice']

const predictFoodImage = async (image) => {
    // Validate the image passed

    // Recieve the buffer data of the image dataURL
    const imageBuffer = Buffer.from(image.split(",")[1], "base64")

    // Decode the image to a tensor
    const decodedImage = tf.node.decodeImage(imageBuffer)

    // Resize the image to 224x224
    const resizedImage = tf.image.resizeBilinear(decodedImage, [224, 224])

    // Expand the dimensitons to fit the input shape of the model
    const input = resizedImage.expandDims()

    // Load the model
    const model = await loadGraphModel("file://./mobilenetV2_tfjs/model.json")

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

// ================
// Get Report Route
// ================
let imgDataURL = "";

app.post("/getReport", async (req, res) => {
    console.log("User has requested a report using post")

    // Get the user image from the request body
    // imgDataURL = req.body.image
    const userImage = req.body.image

    // No Image Validation response
    if (!userImage) {
        return res.status(400).send({ message: "Error!, Empty inputs not allowed!" })
    }

    // Number validation response
    if (!isNaN(userImage)) {
        return res.status(400).send({ message: "Error!, Number inputs not allowed!" })
    }

    // String validation response
    if (userImage.split(",")[0] !== "data:image/jpeg;base64") {
        return res.status(400).send({ message: "Error!, Invalid format" })
    }

    // Pass the image to the machine learning model and get foodname
    let generatedFoodName = await predictFoodImage(userImage) // EX:- apple_pie

    // Convert the generated label to the actual food name format showed in the database
    generatedFoodName = generatedFoodName.split("_").join(" ")
    const foodName = generatedFoodName.charAt(0).toUpperCase() + generatedFoodName.slice(1) // Apple pie

    // Open database connection
    try {
        client.connect()
        const db = client.db(database)

        // Send food name and get relevant details
        const cursor = db.collection("food-disease")
        const foodAndDiseases = await cursor.findOne({ foodName: foodName })

        // get the diseases from the details
        const diseases = foodAndDiseases.diseases

        // Send back report data to the user
        const diseaseInformation = {
            foodName: foodName,
            relatedConditions: diseases
        }
        return res.send(diseaseInformation)
    } catch (error) {
        return res.send({
            foodName: foodName,
            message: `Error!, Database not functional!`
        })
    }
})

// ================
// Show Image Route
// ================
app.get("/userImage", (req, res) => {
    if (imgDataURL === undefined) {
        return res.status(403).send({ message: "Error Invalid Image" })
    }
    res.send(`<img src='${imgDataURL}' alt='Testing Image'></img>`)
})

// ======================
// Serving express server
// ======================
const port = process.env.PORT || 3000

// Server defined for testing using jest
const server = app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
})


module.exports = server