var Pokemon = require('./mypokemon');

class MyBattle {
  /**
   * Keeps track of current battle state
   */
   constructor() {
     this.title = '';
     this.sides = {
       'self': {
         slot: '',
         name: '',
         avatar: '',
         team: [],
         sideConditions: {
           'Stealth Rock': false,
           'Spikes': 0,
           'Toxic Spikes': 0,
           'Sticky Web': false
         },
         activePokemon: ''
       },
       'opponent': {
         slot: '',
         name: '',
         avatar: '',
         team: [],
         sideConditions: {
           'Stealth Rock': false,
           'Spikes': 0,
           'Toxic Spikes': 0,
           'Sticky Web': false
         },
         activePokemon: ''
       }
     }
     this.tier = '';
     this.rated = false;
     this.turn = 0;
   }

   getSideBySlot(slot) {
     if (this.sides.self.slot == slot) return this.sides.self;
     else if (this.sides.opponent.slot == slot) return this.sides.opponent;
     else {
       log('Cannot find side for slot ' + slot, 'error');
       return false;
     }
   }

   hasPokemonName(slot, name) {
     for (let i = 0; i < this.getSideBySlot(slot).team.length; i++) {
       if (this.getSideBySlot(slot).team[i].set.name == name) {
         return true;
       }
     }
     return false;
   }

   hasPokemonSpecies(slot, species) {
     for (let i = 0; i < this.getSideBySlot(slot).team.length; i++) {
       if (this.getSideBySlot(slot).team[i].set.species == species) {
         return true;
       }
     }
     return false;
   }

   getPokemonByName(slot, name) {
     for (let i = 0; i < this.getSideBySlot(slot).team.length; i++) {
       if (this.getSideBySlot(slot).team[i].set.name == name) {
         return this.getSideBySlot(slot).team[i];
       }
     }
     log('Cannot get pokemon by name ' + name + ' for player ' + slot);
     return false;
   }

   getPokemonBySpecies(slot, species) {
     for (let i = 0; i < this.getSideBySlot(slot).team.length; i++) {
       if (this.getSideBySlot(slot).team[i].set.species == species) {
         return this.getSideBySlot(slot).team[i];
       }
     }
     log('Cannot get pokemon by species ' + species + ' for player ' + slot);
     return false;
   }

   setHP(slot, pokemon, hp) {
     if (slot == this.sides['self'].slot) {
       this.getPokemonByName(slot, pokemon).hp = hp;
       log('Set hp of ' + pokemon + ' to ' + hp, 'status');
     }
     else {
       this.getPokemonByName(slot, pokemon).hpPercent = hp;
       log('Set hp of ' + pokemon + ' to ' + hp + '%', 'status');
     }
   }

}

module.exports = MyBattle;
