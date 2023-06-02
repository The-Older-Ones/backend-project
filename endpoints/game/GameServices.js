const CategoryList = require ("../../database/TriviaQuestions/CategoryListModel");
const Question = require("../../database/TriviaQuestions/QuestionModel")

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
      return { error: 'No questions found for the given category and difficulty.' };
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const randomQuestion = questions[randomIndex];

    const questionObject = {
      "category": randomQuestion.category,
      "difficulty": randomQuestion.difficulty,
      "question": randomQuestion.question,
      "correct_answer": randomQuestion.correct_answer,
      "incorrect_answers": randomQuestion.incorrect_answers
    };

    return questionObject;
  } catch (error) {
    return { error: 'An error occurred while retrieving the question.' };
  }
}



module.exports = {
    getCategoryList,
    getRandomQuestion
}