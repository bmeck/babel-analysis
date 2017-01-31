Steps are their own graphs. They are ~= the computations to create a value.

IE.

```js
1 + 2
```

Is actually 3 "Steps" composed of multiple values.

```js
Constant(1);
Constant(2);
Stub('$0 + $1');
```

In compiler terminology this is a form of "Tiling".

## Stub

These may sometimes be called *intrinsics*.

By convention all `Stub` names start with `%`; this is enforced by the `Stub` class.

## Ref

Refs are different ways to get a hold of values that do not require computation.

### Constant

;)

### Phi (&phi;)

A `Phi` is a specialized `Step` that has the result of the latest form of a different set of `Step`s.

```js
1||2
```

Would produce a `Phi` that could be the `1` or the `2`.

Compilers often implement these by ensuring that all the `Step`s that compose a `Phi` have the same memory under the hood.

### Variable

A reference to a `VariablePool`. Even if a `Phi` refers to this, it may have to pull the value of the `Binding` out due to potential mutation from things like function calls.
