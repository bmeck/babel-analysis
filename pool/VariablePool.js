//@flow
'use strict';
/*::
  const {Binding} = require('./Binding');
  const {Step} = require('../step/Step');
*/
class VariablePool/*::<T>*/ extends Map/*::<T, Binding>*/ {
  /*::
    name: string;
    dynamic: Map<Step, Binding>;
  */
  constructor(name/*: string*/) {
    super();
    this.name = name;
    // used for Object Scopes ala `window[navigator.lang] = 'foobar';`
    this.dynamic = new Map;
  }
}
exports.VariablePool = VariablePool;