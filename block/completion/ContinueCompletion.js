//@flow
'use strict';
/*:: var Block = require('../Block').Block; */
class ContinueCompletion {
  /*::
    type: string;
    origin: Block;
    join: Block;
  */
  constructor(origin/*: Block*/, join/*: Block*/) {
    this.origin = origin;
    this.join = join;
  }
}
exports.ContinueCompletion = ContinueCompletion;