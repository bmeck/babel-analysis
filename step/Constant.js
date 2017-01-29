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
class Constant {
  /*::
    type: string;
    value: PRIMITIVE;
  */
  constructor(type/*: string*/, value/*: PRIMITIVE*/) {
    this.type = type;
    this.value = value;
  }
}
exports.Constant = Constant;
