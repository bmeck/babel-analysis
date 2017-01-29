//@flow
'use strict';
/*::
  var CFGBuilder = require('../CFGBuilder').CFGBuilder;
*/
var Constant = require('../step/Constant').Constant;
const {
  Block,
  NormalCompletion,
  MarkerCompletion,
  BranchCompletion,
  BreakCompletion,
  ContinueCompletion,
} = require('../block/Block');
const {Step} = require('../step/Step');

exports.dump = (builder/*: CFGBuilder */) => {
  const visited/*: WeakSet<Block>*/ = new WeakSet;
  const ids/*: WeakMap<any, string>*/ = new WeakMap();
  let uid = 0;
  const setId = (thing, id = ++uid) => ids.set(thing, `${id}`);
  const hasId = (thing) => ids.has(thing);
  const id = (thing) => {
    if (!hasId(thing)) {
      throw new Error('thing does not have an id yet');
    }
    return ids.get(thing);
  }
  const edges = [];
  const traverse = (block) => {
    if (visited.has(block)) {
      return;
    }
    visited.add(block);
    // TODO: use Step class / tiling
    const block_node = `block_${++uid}`;
    const block_root = `${block_node}:root`;
    setId(block, block_root);
    console.log(`${block_node} [label=<<table><tr><td port="root">${block.name}</td></tr>`);
    for (let i = 0; i < block.steps.length; i++) {
      let step = block.steps[i];
      let step_port = `${i}`
      let step_node = `${block_node}:${step_port}`;
      if (step instanceof Step) {
        setId(step, step_node);
        // console.log(`${id(block)} -> ${id(step)} [label="step ${++i}"]`)
        console.log(`<tr><td port="${step_port}">${step.name}</td></tr>`);
        for (let arg_i = 0; arg_i < step.args.length; arg_i++) {
          const arg = step.args[arg_i];
          edges.push([`${step_node} -> $0 [label=${arg_i}]`,arg]);
        }
      }
      else if (step instanceof Constant) {
        console.log(`<tr><td port="${step_port}">${step.value}</td></tr>`);
        edges.push([`${step_node} -> $0`, step]);
      }
    }
    console.log(`</table>>]`);
    const completion = block.completion;
    // end of graph
    if (!completion) {
      if (block !== builder.exit) {
        throw 'Unexpected exit from graph';
      }
      return;
    }
    if (completion instanceof BranchCompletion) {
      const test_node = `${block_node}:${block.steps.length - 1}`
      edges.push([`${test_node} -> $0 [label=truthy]`, completion.consequent]);
      traverse(completion.consequent);
      edges.push([`${test_node} -> $0 [label=falsey]`, completion.alternate]);
      traverse(completion.alternate);
    }
    else if (completion instanceof BreakCompletion) {
      edges.push([`${id(block)} -> $0 [label=break]`, completion.join]);
      traverse(completion.join);
    }
    else if (completion instanceof ContinueCompletion) {
      edges.push([`${id(block)} -> $0 [label=contine]`, completion.join]);
      traverse(completion.join);
    }
    else if (completion instanceof MarkerCompletion) {
      edges.push([`${id(block)} -> $0 [label=mark]`, completion.next]);
      traverse(completion.next);
    }
    else if (completion instanceof NormalCompletion) {
      edges.push([`${id(block)} -> $0 [label=normal]`, completion.join]);
      traverse(completion.join);
    }
    else {
      throw 'unknown completion : ' + completion.constructor.name;
    }
  }
  console.log('digraph {');
  console.log('node [shape=box]');
  let table = '';
  for (let [type, values] of builder.constants.entries()) {
    table += `| ${type}`;
    for (let [value, constant] of values.entries()) {
      const port = uid++;
      setId(constant, `constants:${port}`);
      table += `| <${port}> ${value}`;
    }
    table += ' ';
  }
  if (table != '') {
    console.log(`constants [shape=record,label="{CONSTANTS${table}}"]`)
  }
  if (builder.unhandled.size) {
    for (const unhandled of builder.unhandled) {
      console.log(`// unhandled ${unhandled.type} ${JSON.stringify(unhandled.loc.start)}`);
    }
  }
  traverse(builder.root);
  for (let [origin, unreachable] of builder.unreachable) {
    const unreachable_node = `unreachable_${++uid}`;
    setId(unreachable, unreachable_node);
    edges.push([`${id(origin)} -> $0 [label=unreachable,style=dotted]`, unreachable]);
    traverse(unreachable);
  }
  for (let [str,...args] of edges) {
    console.log(str.replace(/\$(\$|\d+)/, function (_, index) {
      if (index === '$') return '$';
      if (index > args.length) {
        throw new Error('missing arg');
      }
      return id(args[index]);
    }))
  }
  console.log('}');
};
