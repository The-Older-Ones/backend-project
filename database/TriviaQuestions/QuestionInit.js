const Question = require("./QuestionModel");
const List = require("./CategoryListModel");
const Category = require("./CategoryModel");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../../logger");
const config = require("config");

const folderPath = __dirname + "/InitialQuestions";
const dbOwner = config.db.owner;
let catalog = [];
const categoryMapper = {};

const main = async () => {
    try {
        const sample = await Question.findOne();
        if (!sample) {
            await fileLoader();
            check();
            await categoryCreator();
            await questionCreator();
            await listCreator();
            logger.info("Database fully initialized.");
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

const check = () => {
    const diff = config.game.difficultys;
    const hashMap = {};

    catalog.forEach(q => {
        const category = q.category;
        if (!hashMap[category]) {
            hashMap[category] = [];
        }
        hashMap[category].push(q);
    });

    const givenCategories = Object.keys(hashMap).map(cat => {
        const checkingCategory = hashMap[cat].filter((obj, index, self) => {
            return index === self.findIndex((o) => {
                return o.difficulty == obj.difficulty;
            });
        });
        if (diff.length != checkingCategory.length) {
            logger.warn(`Category "${cat}" not initialized. Insufficient variety of questions.`);
            return null;
        };
        return cat;
    })
        .filter(Boolean);

    catalog = catalog.filter(q => {
        return givenCategories.includes(q.category);
    });
}

const categoryCreator = async () => {
    try {
        const categories = [];
        const savePromises = catalog.map(async (questionObject) => {
            const cat = questionObject.category;
            if (!categories.includes(cat)) {
                categories.push(cat);
                const obj = await Category.create({ category: cat })
                categoryMapper[cat] = obj._id.toString();
            }
        });
        await Promise.all(savePromises);
        logger.info("Database successfully initialized with Categories");
    } catch (err) {
        logger.error("Error saving Category:", err);
        throw err;
    }
}

const questionCreator = async () => {
    const savePromises = catalog.map(async (questionObject) => {
        try {
            questionObject.category = categoryMapper[questionObject.category];
            questionObject.owner = dbOwner;
            await Question.create(questionObject)
        } catch (err) {
            logger.error("Error saving question:", questionObject.question, err);
            throw err;
        }
    });
    await Promise.all(savePromises);
    logger.info("Database successfully initialized with Questions");
}

const listCreator = async () => {
    try {
        const allCategory = await Question.distinct("category");
        await List.create({ list: allCategory, owner: dbOwner });
        logger.info(`Database successfully initialized with ${dbOwner} List`);
    } catch (err) {
        logger.error("Error saving List:", err);
        throw err;
    }
}

module.exports = main;