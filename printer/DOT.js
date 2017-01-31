//@flow
'use strict';
/*::
  var CFGBuilder = require('../CFGBuilder').CFGBuilder;
*/
const {
  Block,
  NormalCompletion,
  MarkerCompletion,
  BranchCompletion,
  BreakCompletion,
  ContinueCompletion,
} = require('../block/Block');
const {Step} = require('../step/Step');
const {Stub} = require('../step/Stub');
const {Phi} = require('../step/ref/Phi');
const {Constant} = require('../step/ref/Constant');
const {Variable} = require('../step/ref/Variable');

exports.dump = (builder/*: CFGBuilder */) => {
  const visited/*: WeakSet<Block>*/ = new WeakSet;
  const ids/*: Map<any, string>*/ = new Map();
  let uid = 0;
  const setId = (thing, id = ++uid) => ids.set(thing, `${id}`);
  const hasId = (thing) => ids.has(thing);
  const id = (thing) => {
    //if (thing instanceof Constant) {
    //  thing = thing.value;
    //}
    if (!hasId(thing)) {
      console.error(thing);
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
    const block_root = `${block_node}`;
    setId(block, block_root);
    console.log(`${block_node} [label=<<table><tr><td port="root">${block.name}</td></tr>`);
    for (let i = 0; i < block.steps.length; i++) {
      let step = block.steps[i];
      let step_port = `${i}`
      let step_node = `${block_node}:${step_port}`;
      setId(step, step_node);
      if (step instanceof Stub) {
        // console.log(`${id(block)} -> ${id(step)} [label="step ${++i}"]`)
        console.log(`<tr><td port="${step_port}">${step.name}</td></tr>`);
        for (let arg_i = 0; arg_i < step.args.length; arg_i++) {
          const arg = step.args[arg_i];
          edges.push([`${step_node} -> $0 [label=${arg_i}]`,arg]);
        }
      }
      else if (step instanceof Constant) {
        console.log(`<tr><td port="${step_port}">${JSON.stringify(step.value)}</td></tr>`);
        edges.push([`${step_node} -> $0`, step.value]);
      }
      else if (step instanceof Phi) {
        console.log(`<tr><td port="${step_port}">${step.name}</td></tr>`);
        for (let arg_i = 0; arg_i < step.args.length; arg_i++) {
          const [block,index] = step.args[arg_i];
          edges.push([`${step_node} -> $0:${index} [label=${arg_i}]`, block])
        }
      }
      else if (step instanceof Variable) {
        console.log(`<tr><td port="${step_port}">${step.id}</td></tr>`);
        edges.push([`${step_node} -> $0`, step.scope]);
      }
      else {
        console.error(step);
        throw Error('unknown step');
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
      edges.push([`${test_node} -> $0:root [label=truthy]`, completion.consequent]);
      traverse(completion.consequent);
      edges.push([`${test_node} -> $0:root [label=falsey]`, completion.alternate]);
      traverse(completion.alternate);
    }
    else if (completion instanceof BreakCompletion) {
      edges.push([`${id(block)} -> $0:root [label=break]`, completion.join]);
      traverse(completion.join);
    }
    else if (completion instanceof ContinueCompletion) {
      edges.push([`${id(block)} -> $0:root [label=contine]`, completion.join]);
      traverse(completion.join);
    }
    else if (completion instanceof MarkerCompletion) {
      edges.push([`${id(block)} -> $0:root [label=mark]`, completion.next]);
      traverse(completion.next);
    }
    else if (completion instanceof NormalCompletion) {
      edges.push([`${id(block)} -> $0:root [label=normal]`, completion.join]);
      traverse(completion.join);
    }
    else {
      throw 'unknown completion : ' + completion.constructor.name;
    }
  }
  console.log('digraph {');
  console.log('node [shape=box]');
  dumpVariablePool(() => ++uid, ids, builder.constants);
  dumpVariablePool(() => ++uid, ids, builder.globals);
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
    console.log(str.replace(/\$(\$|\d+)/g, function (_, index) {
      if (index === '$') return '$';
      if (index > args.length) {
        throw new Error('missing arg');
      }
      return id(args[index]);
    }))
  }
  console.log('}');
};

function dumpVariablePool(getUID, ids, pool) {
  let table = '';
  const poolId = getUID();
  ids.set(pool, `${poolId}`);
  for (let [variableName, binding] of pool.entries()) {
    const port = getUID();
    ids.set(variableName, `${poolId}:${port}`);
    table += `<tr><td port="${port}">${variableName}</td></tr>`;
  }
  console.log(`${poolId} [label=<<table><tr><td>${pool.name}</td></tr>${table}</table>>]`);
}
