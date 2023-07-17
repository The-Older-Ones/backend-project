const mongoose = require("mongoose");

const categoryListSchema = new mongoose.Schema({
    list: { type: Array, required: true },
},
    {
        timestamps: true,
    }
);

categoryListSchema.pre('save', async function (next) {
    const model = this.constructor;
    try {
        const count = await model.countDocuments({});
        if (count === 0){
            next();
        }else{
            next(new Error("Only one data can be stored in the database"));
        }
    } catch (err) {
        return next(err);
    }
});

const CategoryList = mongoose.model("category", categoryListSchema);

module.exports = CategoryList;