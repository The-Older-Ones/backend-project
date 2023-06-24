const CategoryList = require("../../database/TriviaQuestions/CategoryListModel");
const Question = require("../../database/TriviaQuestions/QuestionModel")
const config = require("config");

async function getCategoryList() {
  try {
    const categoryList = await CategoryList.find();
    return categoryList[0].list;
  } catch (error) {
    throw new Error('Failed to retrieve category list');
  }
}

async function getRandomQuestion(categoryQuestion, difficultyQuestion) {
  try {
    const questions = await Question.find({ category: categoryQuestion, difficulty: difficultyQuestion });

    if (questions.length === 0) {
      throw new Error('No questions found for the given category and difficulty.');
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const randomQuestion = questions[randomIndex];

    const correctAnswerIndex = Math.floor(Math.random() * (randomQuestion.incorrect_answers.length + 1))
    const allAnswers = [...randomQuestion.incorrect_answers];
    allAnswers.splice(correctAnswerIndex, 0, randomQuestion.correct_answer);

    const questionObject = {
      category : randomQuestion.category,
      difficulty: randomQuestion.difficulty,
      question: randomQuestion.question,
      allAnswers: allAnswers,
      correct_answer: randomQuestion.correct_answer
    };

    return questionObject;
  } catch (error) {
    throw new Error(`An error occurred while retrieving the question. ${error.message}`);
  }
}

async function checkCategory(categories) {
  try {

    categories = [...new Set(categories)];
    difficultys = config.game.difficultys;

    const pipeline = [
      { $match: { difficulty: { $in: difficultys }, category: { $in: categories } } },
      { $group: { _id: { category: '$category', difficulty: '$difficulty' } } }
    ];

    const questionSet = await Question.aggregate(pipeline);

    if (questionSet.length == categories.length * difficultys.length) {
      return;
    }

    const questionSetMapped = questionSet.map(obj => {
      return {
        category: obj._id.category,
        difficulty: obj._id.difficulty
      }
    });

    let missing;

    categories.find(category => {
      const missingDifficulty = difficultys.find(difficulty => {
        return !questionSetMapped.some(question => (
          question.category === category && question.difficulty === difficulty
        ));
      });

      if (missingDifficulty) {
        missing = { category, difficulty: missingDifficulty };
        return true;
      }
    });

    throw new Error(`${missing.category} does not have enough questions for all difficulties`);

  } catch (error) {
    throw new Error(`An error occurred while checking the category. + ${error.message}`);
  }
}

module.exports = {
  getCategoryList,
  getRandomQuestion,
  checkCategory
}