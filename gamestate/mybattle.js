var Pokemon = require('./mypokemon');

class MyBattle {
  /**
   * Keeps track of current battle state
   */
   constructor() {
    /** @type {Sim.Side[]} */
    this.sides = [null, null]; // p1 and p2 in that order
    this.rated = rated;
    this.weatherData = {id:''};
    this.terrainData = {id:''};
    this.pseudoWeather = {};

    this.format = toId(format);
    this.formatData = {id:this.format};
    Dex.mod(format.mod).getBanlistTable(format); // fill in format ruleset
    this.ruleset = format.ruleset;

    this.effect = {id:''};
    this.effectData = {id:''};
    this.event = {id:''};

    this.queue = [];
    this.faintQueue = [];

    this.turn = 0;
    /** @type {Sim.Side} */
    this.p1 = null;
    /** @type {Sim.Side} */
    this.p2 = null;
    this.lastUpdate = 0;
    this.weather = '';
    this.terrain = '';
    this.ended = false;
    this.started = false;
    this.active = false;
    this.eventDepth = 0;
    this.lastMove = '';
    this.activeMove = null;
    this.activePokemon = null;
    this.activeTarget = null;
    this.midTurn = false;
    this.currentRequest = '';
    this.lastMoveLine = 0;
    this.events = null;

    this.abilityOrder = 0;
   }

   //TODOS: functions called in bot.js
   hasPokemonName(slot, name) {
    return;
   }

   getPokemonBySpecies(slot, species) {
     return;
   }

   getSideBySlot(slot) {
     if (slot == "p1") {
       return this.sides[0];
     }
     return this.sides[1];
   }

   setHP(slot, pokemon, hp) {
     return;
   }

   getPokemon(slot, pokemon) {
     return;
   }
 }

module.exports = MyBattle;
