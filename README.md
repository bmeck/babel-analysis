Run in iTerm2

```sh
for name in fixtures/* ; do
  echo $name;
  cat $name;
  echo;
  node index.js $name | dot -Tpng | imgcat
done
```