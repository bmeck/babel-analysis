//@flow
'use strict';
/*::
  type PRIMITIVE =
    | boolean
    | number
    | string
    | null
    | void
    ;
*/
const {Step} = require('../Step');
class Constant extends Step {
  /*::
    value: PRIMITIVE;
  */
  constructor(value/*: PRIMITIVE*/) {
    super(`constant`);
    this.value = value;
  }
}
exports.Constant = Constant;
