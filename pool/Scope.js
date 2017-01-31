//@flow
'use strict';
const {VariablePool} = require('./VariablePool');
class Scope extends VariablePool/*::<string>*/ {
  /*::
    parent: Scope | null;
  */
  constructor(name/*: string*/, parent/*: Scope | null*/ = null) {
    super(name);
    this.parent = parent;
  }
}
exports.Scope = Scope;
