const mongoose = require("mongoose");

// Setting up the collection
const foodDiseasesSchema = new mongoose.Schema({
    foodName: String,
    diseases: Array
});

// Setting up a singular name for the collection
const collectionName = "food-disease"

const foodDiseases = new mongoose.model("food-disease", foodDiseasesSchema, collectionName)

module.exports = foodDiseases