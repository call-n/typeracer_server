const sentences = require('../data/sentences.json');
const words = require('../data/words.json');

const _ = require('lodash');

module.exports = function shuffleList(type) {
  switch (type) {
    case 'words':
      return _.shuffle(words).slice(0, 30);
    case 'sentences':
      let sentencesArray = _.shuffle(sentences);
      sentencesArray = sentencesArray.slice(0, 3);
      return sentencesArray;
    default:
      return _.shuffle(words).slice(0, 30);
  }
};