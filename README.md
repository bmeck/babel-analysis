Run in iTerm2

```sh
for name in fixtures/* ; do
  echo $name;
  cat $name;
  echo;
  node index.js $name | dot -Tpng | imgcat
done
```

Testing your own code

```sh
node index.js example.js
```

Will dump a [DOT Language](https://en.wikipedia.org/wiki/DOT_(graph_description_language)) graph that will have comments on any nodes that were skipped.

# Project Organization

## index.js

Testing CLI while rest is fleshed out.

## Block.js

All the types for CFG blocks.

## CFGBuilder.js

Our state manager for most operations.