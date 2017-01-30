'use strict';
/*::
  const Binding = require('./Binding');
*/
class VariablePool/*:<T>*/ extends Map/*<T, Binding>*/ {
  /*::
    name: string;
  */
  constructor(name/*: string*/) {
    super();
    this.name = name;
  }
}
exports.VariablePool = VariablePool;