const mongoose = require("mongoose");

const categoryListSchema = new mongoose.Schema({
    list: { type: Array, required: true },
    owner: { type: String, required: true, unique: true }
},
    {
        timestamps: true,
    }
);

const CategoryList = mongoose.model("List", categoryListSchema);

module.exports = CategoryList;