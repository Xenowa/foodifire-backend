const mongoose = require("mongoose");

// Setting up the collection
const userSchema = new mongoose.Schema({
    userSSO: mongoose.Schema.Types.Mixed,
    diseases: Array,
    savedReports: Array
});

const User = new mongoose.model("user", userSchema)

module.exports = User