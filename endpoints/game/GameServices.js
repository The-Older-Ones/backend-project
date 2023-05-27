const CategoryList = require ("../../database/TriviaQuestions/CategoryListModel");

async function getCategoryList() {
    try {
      const categoryList = await CategoryList.find();
      return categoryList[0].list;
    } catch (error) {
      throw new Error('Failed to retrieve category list:', error);
    }
  }

module.exports = {
    getCategoryList
}

//_________________________________________________Notes______________________________________________________________//
/*
- Funktion für Random Frage. Parameter category und difficulty. Rückgabe Objekt
*/