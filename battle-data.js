/**
 * An object storing information about a battle.
 */
'use strict';

/**
 * @typedef {Object} SideInfo
 * @property {string} name
 * @property {string} avatar
 * @property {number} teamSize
 * @property {Object[]} pokemon
 */

class BattleData {
    constructor() {
        /** @type {string} */
        this.myId = null;

        /** @type {string} */
        this.oppId = null;

        /** @type {string} */
        this.title = null;

        /** @type {string} */
        this.gameType = null;

        /** @type {string} */
        this.gen = null;

        /** @type {string} */
        this.tier = null;

        this.sides = {
            'p1': /** @type {SideInfo} */ null,
            'p2': /** @type {SideInfo} */ null,
        };
    }
}

module.exports = BattleData;
