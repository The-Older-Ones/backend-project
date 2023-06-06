const Question = require("./QuestionModel");
const List = require("./CategoryListModel");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../../logger");

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
            logger.info("Database successfully initialized with categorylist");
        } else {
            logger.info("No initialization of the questions necessary");
        }
    } catch (err) {
        logger.error("Error initializing database:", err);
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
        logger.info("Files loaded successfully");
    } catch (err) {
        logger.error("Error loading files:", err);
        throw new Error("Error loading files" + err);
    }
}

const fillDB = async () => {
    const savePromises = catalog.map((questionObject) => {
        try {
            Question.create(questionObject)
        } catch (err) {
            logger.error("Error saving question:", questionObject.question, err);
        }
    });
    await Promise.all(savePromises);
    logger.info("Database successfully initialized with questions");
}

module.exports = main;