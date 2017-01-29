//@flow
'use strict';
const {BranchCompletion} = require('./completion/BranchCompletion');
exports.BranchCompletion = BranchCompletion;
const {BreakCompletion} = require('./completion/BreakCompletion');
exports.BreakCompletion = BreakCompletion;
const {ContinueCompletion} = require('./completion/ContinueCompletion');
exports.ContinueCompletion = ContinueCompletion;
const {MarkerCompletion} = require('./completion/MarkerCompletion');
exports.MarkerCompletion = MarkerCompletion;
const {NormalCompletion} = require('./completion/NormalCompletion');
exports.NormalCompletion = NormalCompletion;
/*::
  var Step = require('../step/Step').Step;

  type COMPLETION = 
    | BreakCompletion
    | BranchCompletion
    | ContinueCompletion
    | MarkerCompletion
    | NormalCompletion
    | null
    ;
  *//*
  TODO
    
    // To invoker, closure dying
    | {type: 'RETURN'}
    
    // To invoker, closure paused
    | {type: 'YIELD'}
    
    // To invoker, closure paused
    | {type: 'AWAIT'}
    
    // Always goes to guard
    | {type: 'THROW'}

    // Guard
    | {type: 'TRY', try: Block, catch: Block, finally: Block} 
    ;
*/
class Block {
  /*::
    name: string;
    phis: Map<string, Object>;
    steps: Step[];
    completion: COMPLETION;
    abrupt: Block | null;
  */
  constructor() {
    this.name = "";
    this.steps = [];
    this.completion = null;
  }

  setCompletion(completion/*: COMPLETION*/) {
    //if (this.completion !== null) {
    //  throw Error('Already have completion');
    //}
    if (completion && completion.origin !== this) {
      throw Error('Completion does not originate with this block');
    }
    this.completion = completion;
  }
}
exports.Block = Block;
