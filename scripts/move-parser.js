'use strict';

var fs = require('fs');

for (var i = 1; i <= 7; i++) {
    let srcFile = './../data/formats/gen' + i.toString() + '-formats-data.js';
    let formatsData = require(srcFile)['BattleFormatsData'];
    var randomBattleMoves = {};
    for (var pokemon in formatsData) {
        if ('randomBattleMoves' in formatsData[pokemon]) {
            randomBattleMoves[pokemon] = formatsData[pokemon]['randomBattleMoves'];
        }
    }
    let destFile = '../data/random-battle-moves/gen' + i.toString() + '-random-battle-moves.json';
    fs.writeFile(destFile, JSON.stringify(randomBattleMoves, null, 2), () => {});
}
