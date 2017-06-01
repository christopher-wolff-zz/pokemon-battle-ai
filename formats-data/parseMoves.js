'use strict';
var fs = require('fs');
for (var i = 2; i < 8; i++) {
  var file = './formats-data' + i.toString();
  var prevdata = require(file)['BattleFormatsData'];
  var newdata = {};
  for (var poke in prevdata) {
    if ('randomBattleMoves' in prevdata[poke]) {
      newdata[poke] = prevdata[poke]['randomBattleMoves'];
    }
  }
  fs.writeFile('../data/randomMoves/gen' + i.toString() + 'ranbatMoves.json', JSON.stringify(newdata, null, 2));
}
