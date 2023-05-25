const Question = require("./QuestionModel");
const List = require("./CategoryListModel");
const fs = require("fs").promises;
const path = require("path");

const folderPath = __dirname + "/InitialQuestions";
const catalog = [];

const main = async () => {
    try {
        const sample = await Question.findOne();
        if (!sample) {
            await fileLoader();
            await fillDB();
            const allCategory = await Question.distinct("category");
            await List.create({ list: allCategory });
            console.log("Database successfully initialized with categorylist")
        } else {
            console.log("No initialization of the questions necessary");
        }
    } catch (err) {
        throw err;
    }
}

const fileLoader = async () => {
    try {
        const files = await fs.readdir(folderPath);
        const jsonFiles = files.filter((file) =>
            file.toLowerCase().endsWith(".json")
        );
        const fileReadPromises = jsonFiles.map(async (filename) => {
            const filePath = path.join(folderPath, filename);
            const data = await fs.readFile(filePath, "utf8");
            const jsonData = JSON.parse(data);
            jsonData.forEach((questionObject) => {
                catalog.push(questionObject);
            })
        });

        await Promise.all(fileReadPromises);
        console.log("Files loaded successfully");
    } catch (err) {
        throw new Error("Error loading files" + err);
    }
}

const fillDB = async () => {
    const savePromises = catalog.map((questionObject) => {
        try {
            Question.create(questionObject)
        } catch {
            console.log("Error saving question : " + questionObject.question)
        }
    });
    await Promise.all(savePromises);
    console.log("Database successfully initialized with questions");
}

module.exports = main;