const CategoryList = require ("../../database/TriviaQuestions/CategoryListModel");
const Question = require("../../database/TriviaQuestions/QuestionModel")
const config = require ("config");

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

async function checkCategory(categories){

  categories = [...new Set(categories)];
  difficultys = config.game.difficultys;

  const pipeline = [
    { $match: { difficulty: { $in: difficultys }, category: { $in: categories } } },
    { $group: { _id: {category : '$category', difficulty: '$difficulty'}}}
  ];

  const questionSet = await Question.aggregate(pipeline);

  if(questionSet.length == categories.length * difficultys.length){
    return;
  }


  
  console.log(questionSet.length);
  console.log(categories.length);
  console.log(questionSet);

  // rausfinden wer der Hurensohn ist und error ballern

}


module.exports = {
    getCategoryList,
    getRandomQuestion,
    checkCategory
}