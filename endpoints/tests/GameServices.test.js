const {
    getCategoryList,
    getRandomQuestion,
    checkCategory
} = require('../game/GameServices');

const CategoryList = require('../../database/TriviaQuestions/CategoryListModel');
const Question = require('../../database/TriviaQuestions/QuestionModel');
const config = require('config');

jest.mock('../../database/TriviaQuestions/CategoryListModel', () => ({
    find: jest.fn().mockResolvedValue([{ list: ['Category 1', 'Category 2'] }])
}));


const questionSet = [
    { _id: { category: 'Category 1', difficulty: 'Easy' } },
    { _id: { category: 'Category 1', difficulty: 'Medium' } },
    { _id: { category: 'Category 2', difficulty: 'Hard' } }
];

jest.mock('../../database/TriviaQuestions/QuestionModel', () => ({
    find: jest.fn().mockImplementation(({ category, difficulty }) => {
        const filteredQuestions = [
            {
                category: 'Category 1',
                difficulty: '100',
                question: 'Question 1',
                incorrect_answers: ['Answer 1', 'Answer 2'],
                correct_answer: 'Answer 3'
            },
            {
                category: 'Category 1',
                difficulty: '200',
                question: 'Question 2',
                incorrect_answers: ['Answer 4', 'Answer 5'],
                correct_answer: 'Answer 6'
            },
            {
                category: 'Category 1',
                difficulty: '300',
                question: 'Question 2',
                incorrect_answers: ['Answer 4', 'Answer 5'],
                correct_answer: 'Answer 6'
            },
            {
                category: 'Category 1',
                difficulty: '500',
                question: 'Question 2',
                incorrect_answers: ['Answer 4', 'Answer 5'],
                correct_answer: 'Answer 6'
            },
            {
                category: 'Category 1',
                difficulty: '1000',
                question: 'Question 2',
                incorrect_answers: ['Answer 4', 'Answer 5'],
                correct_answer: 'Answer 6'
            },
            {
                category: 'Category 2',
                difficulty: '200',
                question: 'Question 3',
                incorrect_answers: ['Answer 7', 'Answer 8'],
                correct_answer: 'Answer 9'
            }
        ];

        return Promise.resolve(filteredQuestions.filter(q => q.category === category && q.difficulty === difficulty));
    }),
    aggregate: jest.fn().mockResolvedValue(questionSet)
}));


jest.mock('config', () => ({
    game: {
        difficultys: ['100', '200', '300', '600', '1000']
    }
}));

describe('Trivia Game Functions', () => {
    describe('getCategoryList', () => {
        it('should retrieve the category list', async () => {
            const categoryList = await getCategoryList();
            expect(categoryList).toEqual(['Category 1', 'Category 2']);
        });

        it('should throw an error if category list retrieval fails', async () => {
            CategoryList.find.mockRejectedValueOnce(new Error('Failed to retrieve category list'));

            await expect(getCategoryList()).rejects.toThrow('Failed to retrieve category list');
        });
    });

    describe('getRandomQuestion', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        it('should retrieve a random question based on category and difficulty', async () => {
            const question = await getRandomQuestion('Category 1', '100');

            expect(Question.find).toHaveBeenCalledWith({
                category: 'Category 1',
                difficulty: '100'
            });

            expect(question).toHaveProperty('category', 'Category 1');
            expect(question).toHaveProperty('difficulty', '100');
            expect(question).toHaveProperty('question', 'Question 1');
            expect(question.allAnswers).toHaveLength(3);
            expect(question.allAnswers).toContain('Answer 1');
            expect(question.allAnswers).toContain('Answer 2');
            expect(question.allAnswers).toContain('Answer 3');
            expect(question).toHaveProperty('correct_answer', 'Answer 3');
        });

        it('should throw an error if question retrieval fails', async () => {
            Question.find.mockRejectedValueOnce(new Error('Failed to retrieve questions'));

            await expect(getRandomQuestion('Category 1', 'Easy')).rejects.toThrow(
                'An error occurred while retrieving the question. Failed to retrieve questions'
            );
        });
    });

    it('should throw an error if a category does not have enough questions for all difficulties', async () => {
        const categories = ['Category 1', 'Category 2', 'Category 3'];

        try {
            await checkCategory(categories);
            fail('Expected checkCategory to throw an error');
        } catch (error) {
            expect(error.message).toContain('does not have enough questions for all difficulties');
        }
    });

    it('should throw an error if category check fails', async () => {
        Question.aggregate.mockRejectedValueOnce(new Error('Failed to aggregate questions'));

        const categories = ['Category 1', 'Category 2'];

        try {
            await checkCategory(categories);
            fail('Expected checkCategory to throw an error');
        } catch (error) {
            expect(error.message).toContain('Failed to aggregate questions');
        }
    });
});
