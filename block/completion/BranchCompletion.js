//@flow
'use strict';
/*:: var Block = require('../Block').Block; */
// This represents a jump based upon the last value of the block.
// 
// For example:
//
// if (1) { <- location of .consequent
// }
// else { <- location of .alternate
// }
//
// Creation of these generally is coupled with some form of a join.
//
class BranchCompletion {
  /*::
    type: string;
    origin: Block;
    consequent: Block;
    alternate: Block;
  */
  constructor(origin/*: Block*/, consequent/*: Block*/, alternate/*: Block*/) {
    this.origin = origin;
    this.consequent = consequent;
    this.alternate = alternate;
  }
}
exports.BranchCompletion = BranchCompletion;
