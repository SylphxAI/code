# Lens Optimistic Updates - Final Design

**Date:** 2024-12-22
**Status:** ✅ Design Complete - Ready for Implementation

---

## 🎯 核心理念

### Design Principles

1. **Draft-Based API** - Immer-style mutation syntax（直觀）
2. **Declarative Transforms** - Language-agnostic primitives（可序列化）
3. **Type-Safe** - 完整 TypeScript 推導（DX 最佳）
4. **Multi-Language** - 任何語言都能實作 client（可擴展）
5. **Zero-Config** - Client 自動處理 optimistic updates（簡單）

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Server: Mutation Definition                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  lens                                                       │
│    .input(InputSchema)                                      │
│    .output(OutputSchema)                                    │
│    .mutation(async (input, ctx) => { ... })                 │
│    .optimistic((opt) => opt                                 │
│      .entity('Session')                                     │
│      .id($ => $.sessionId)                                  │
│      .apply((draft, input, t) => {                          │
│        draft.title = input.newTitle;                        │
│        draft.updatedAt = t.now();                           │
│      })                                                     │
│    )                                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
              Record Operations (Proxy)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Serializable Operations (JSON)                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  {                                                          │
│    entity: 'Session',                                       │
│    id: { type: 'field', path: ['sessionId'] },             │
│    operations: [                                            │
│      {                                                      │
│        op: 'set',                                           │
│        path: ['title'],                                     │
│        value: { type: 'field', path: ['newTitle'] }        │
│      },                                                     │
│      {                                                      │
│        op: 'set',                                           │
│        path: ['updatedAt'],                                 │
│        value: { type: 'transform', name: 'now' }           │
│      }                                                      │
│    ]                                                        │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
              Transmit to Client (Any Language)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Client: Execute Operations                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TypeScript / Rust / Swift / Kotlin / ...                  │
│                                                             │
│  1. Parse operations                                        │
│  2. Resolve descriptors (fields, transforms)                │
│  3. Apply to normalized cache                               │
│  4. Merge with server state                                 │
│  5. Update UI                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Builder API Design

### Complete API Surface

```typescript
lens
  .input(schema)
  .output(schema)
  .mutation(resolver)
  .optimistic((opt) => opt
    // Specify entity type
    .entity(name: string)

    // Specify entity ID field
    .id(accessor: (input: Proxy<TInput>) => any)

    // Apply optimistic updates with draft pattern
    .apply((
      draft: TOutput,      // Proxy - records all mutations
      input: TInput,       // Proxy - records all accesses
      t: TransformUtils    // Declarative transform builders
    ) => void)
  )
```

---

## 🛠️ TransformUtils Complete API

### Categories

1. **Conditional Logic**
2. **Math Operations**
3. **String Operations**
4. **Array Operations**
5. **Object Operations**
6. **Time Operations**
7. **Crypto Operations**
8. **JSON Operations**

---

### 1. Conditional Logic

```typescript
interface ConditionalOps<TInput> {
  /**
   * If-else conditional
   * @example t.if(input.isActive, 'active', 'idle')
   */
  if<T>(condition: any, ifTrue: T, ifFalse: T): Descriptor;

  /**
   * Switch statement
   * @example
   * t.switch(input.status, {
   *   'pending': 1,
   *   'active': 2,
   *   'done': 3
   * }, 0)
   */
  switch<T>(
    value: any,
    cases: Record<string, T>,
    defaultCase: T
  ): Descriptor;

  /**
   * First non-null value
   * @example t.coalesce(input.name, input.id, 'Unknown')
   */
  coalesce(...values: any[]): Descriptor;

  /**
   * Default value if null/undefined
   * @example t.default(input.name, 'Anonymous')
   */
  default(value: any, defaultValue: any): Descriptor;
}
```

**Serialization:**
```json
{
  "type": "transform",
  "name": "if",
  "condition": { "type": "field", "path": ["isActive"] },
  "ifTrue": { "type": "literal", "value": "active" },
  "ifFalse": { "type": "literal", "value": "idle" }
}
```

---

### 2. Math Operations

```typescript
interface MathOps<TInput> {
  /**
   * Addition
   * @example t.add(input.price, input.tax)
   * @example t.add(10, 20, 30) // 60
   */
  add(...values: any[]): Descriptor;

  /**
   * Subtraction
   * @example t.subtract(input.total, input.discount)
   */
  subtract(a: any, b: any): Descriptor;

  /**
   * Multiplication
   * @example t.multiply(input.price, input.quantity)
   */
  multiply(...values: any[]): Descriptor;

  /**
   * Division
   * @example t.divide(input.total, input.count)
   */
  divide(a: any, b: any): Descriptor;

  /**
   * Modulo
   * @example t.mod(input.value, 10)
   */
  mod(a: any, b: any): Descriptor;

  /**
   * Maximum value
   * @example t.max(input.a, input.b, 100)
   */
  max(...values: any[]): Descriptor;

  /**
   * Minimum value
   * @example t.min(input.a, input.b, 0)
   */
  min(...values: any[]): Descriptor;

  /**
   * Absolute value
   * @example t.abs(input.delta)
   */
  abs(value: any): Descriptor;

  /**
   * Round to integer
   * @example t.round(input.price)
   */
  round(value: any): Descriptor;

  /**
   * Floor
   * @example t.floor(input.value)
   */
  floor(value: any): Descriptor;

  /**
   * Ceiling
   * @example t.ceil(input.value)
   */
  ceil(value: any): Descriptor;
}
```

---

### 3. String Operations

```typescript
interface StringOps<TInput> {
  /**
   * Concatenate strings
   * @example t.concat(input.firstName, ' ', input.lastName)
   */
  concat(...values: any[]): Descriptor;

  /**
   * Join array with separator
   * @example t.join(input.tags, ', ')
   */
  join(array: any, separator: string): Descriptor;

  /**
   * Uppercase
   * @example t.uppercase(input.text)
   */
  uppercase(value: any): Descriptor;

  /**
   * Lowercase
   * @example t.lowercase(input.email)
   */
  lowercase(value: any): Descriptor;

  /**
   * Trim whitespace
   * @example t.trim(input.text)
   */
  trim(value: any): Descriptor;

  /**
   * Substring
   * @example t.substring(input.text, 0, 10)
   */
  substring(value: any, start: number, end?: number): Descriptor;

  /**
   * Replace
   * @example t.replace(input.text, 'old', 'new')
   */
  replace(value: any, search: string, replacement: string): Descriptor;

  /**
   * Template string
   * @example
   * t.template('Hello {{name}}, you have {{count}} messages', {
   *   name: input.userName,
   *   count: input.messageCount
   * })
   */
  template(template: string, vars: Record<string, any>): Descriptor;

  /**
   * String length
   * @example t.length(input.text)
   */
  length(value: any): Descriptor;
}
```

---

### 4. Array Operations

```typescript
interface ArrayOps<TInput> {
  /**
   * Concatenate arrays
   * @example t.concat(input.tags, input.newTags)
   */
  concat(...arrays: any[]): Descriptor;

  /**
   * Spread array (copy)
   * @example t.spread(input.items)
   */
  spread(array: any): Descriptor;

  /**
   * Map with predefined transform
   * @example t.map(input.tags, 'uppercase')
   */
  map(array: any, transformName: string): Descriptor;

  /**
   * Filter with predefined predicate
   * @example t.filter(input.items, 'isActive')
   */
  filter(array: any, predicateName: string): Descriptor;

  /**
   * Flatten nested arrays
   * @example t.flatten(input.nestedArrays)
   */
  flatten(array: any): Descriptor;

  /**
   * Slice array
   * @example t.slice(input.items, 0, 10)
   */
  slice(array: any, start: number, end?: number): Descriptor;

  /**
   * Array length
   * @example t.length(input.items)
   */
  length(array: any): Descriptor;

  /**
   * First element
   * @example t.first(input.items)
   */
  first(array: any): Descriptor;

  /**
   * Last element
   * @example t.last(input.items)
   */
  last(array: any): Descriptor;
}
```

---

### 5. Object Operations

```typescript
interface ObjectOps<TInput> {
  /**
   * Merge objects (shallow)
   * @example t.merge(draft.metadata, input.newMetadata)
   */
  merge(...objects: any[]): Descriptor;

  /**
   * Deep merge objects
   * @example t.deepMerge(draft.config, input.configUpdates)
   */
  deepMerge(...objects: any[]): Descriptor;

  /**
   * Pick fields
   * @example t.pick(input.user, ['id', 'name', 'email'])
   */
  pick(object: any, keys: string[]): Descriptor;

  /**
   * Omit fields
   * @example t.omit(input.user, ['password', 'token'])
   */
  omit(object: any, keys: string[]): Descriptor;

  /**
   * Object keys
   * @example t.keys(input.metadata)
   */
  keys(object: any): Descriptor;

  /**
   * Object values
   * @example t.values(input.metadata)
   */
  values(object: any): Descriptor;
}
```

---

### 6. Time Operations

```typescript
interface TimeOps {
  /**
   * Current timestamp (milliseconds)
   * @example t.now()
   */
  now(): Descriptor;

  /**
   * ISO 8601 timestamp
   * @example t.timestamp()
   */
  timestamp(): Descriptor;

  /**
   * Unix timestamp (seconds)
   * @example t.unixTimestamp()
   */
  unixTimestamp(): Descriptor;
}
```

---

### 7. Crypto Operations

```typescript
interface CryptoOps<TInput> {
  /**
   * UUID v4
   * @example t.uuid()
   */
  uuid(): Descriptor;

  /**
   * Hash value (SHA-256)
   * @example t.hash(input.content)
   */
  hash(value: any): Descriptor;

  /**
   * MD5 hash
   * @example t.md5(input.content)
   */
  md5(value: any): Descriptor;
}
```

---

### 8. JSON Operations

```typescript
interface JSONOps<TInput> {
  /**
   * JSON stringify
   * @example t.json(input.metadata)
   */
  json(value: any): Descriptor;

  /**
   * JSON parse
   * @example t.parse(input.jsonString)
   */
  parse(jsonString: any): Descriptor;
}
```

---

## 📋 Serialization Format

### Descriptor Types

```typescript
type Descriptor =
  | FieldDescriptor
  | TransformDescriptor
  | LiteralDescriptor;

interface FieldDescriptor {
  type: 'field';
  path: string[];  // Path to field in input
}

interface TransformDescriptor {
  type: 'transform';
  name: string;    // Transform name (e.g., 'if', 'add', 'concat')
  [key: string]: any;  // Transform-specific parameters
}

interface LiteralDescriptor {
  type: 'literal';
  value: any;      // Static value
}
```

### Operation Types

```typescript
type Operation =
  | SetOperation
  | ArrayPushOperation
  | ArraySpliceOperation;

interface SetOperation {
  op: 'set';
  path: string[];      // Path in draft (e.g., ['user', 'name'])
  value: Descriptor;   // Value descriptor
}

interface ArrayPushOperation {
  op: 'array-push';
  path: string[];      // Path to array
  items: Descriptor[]; // Items to push
}

interface ArraySpliceOperation {
  op: 'array-splice';
  path: string[];      // Path to array
  start: number;
  deleteCount: number;
  items: Descriptor[]; // Items to insert
}
```

### Complete Config

```typescript
interface OptimisticConfig {
  entity: string;           // Entity type (e.g., 'Session')
  id: FieldDescriptor;      // How to extract entity ID
  operations: Operation[];  // List of operations to apply
}
```

---

## 🌍 Client Implementation Guide

### TypeScript Client

```typescript
class OptimisticExecutor {
  private transforms: Record<string, (...args: any[]) => any> = {
    // Conditional
    if: (condition: any, ifTrue: any, ifFalse: any) =>
      condition ? ifTrue : ifFalse,

    switch: (value: any, cases: Record<string, any>, defaultCase: any) =>
      cases[value] ?? defaultCase,

    coalesce: (...values: any[]) =>
      values.find(v => v != null),

    default: (value: any, defaultValue: any) =>
      value ?? defaultValue,

    // Math
    add: (...values: number[]) =>
      values.reduce((sum, n) => sum + n, 0),

    subtract: (a: number, b: number) => a - b,

    multiply: (...values: number[]) =>
      values.reduce((prod, n) => prod * n, 1),

    divide: (a: number, b: number) => a / b,

    max: (...values: number[]) => Math.max(...values),

    min: (...values: number[]) => Math.min(...values),

    // String
    concat: (...values: string[]) => values.join(''),

    join: (array: string[], separator: string) => array.join(separator),

    uppercase: (value: string) => value.toUpperCase(),

    lowercase: (value: string) => value.toLowerCase(),

    trim: (value: string) => value.trim(),

    template: (template: string, vars: Record<string, any>) => {
      let result = template;
      Object.entries(vars).forEach(([key, value]) => {
        result = result.replace(`{{${key}}}`, String(value));
      });
      return result;
    },

    // Array
    spread: (array: any[]) => [...array],

    flatten: (array: any[][]) => array.flat(),

    // Object
    merge: (...objects: any[]) => Object.assign({}, ...objects),

    pick: (obj: any, keys: string[]) => {
      const result: any = {};
      keys.forEach(key => {
        if (key in obj) result[key] = obj[key];
      });
      return result;
    },

    omit: (obj: any, keys: string[]) => {
      const result = { ...obj };
      keys.forEach(key => delete result[key]);
      return result;
    },

    // Time
    now: () => Date.now(),

    timestamp: () => new Date().toISOString(),

    // Crypto
    uuid: () => crypto.randomUUID(),

    hash: (value: string) => {
      // SHA-256 implementation
    },

    // JSON
    json: (value: any) => JSON.stringify(value),

    parse: (str: string) => JSON.parse(str)
  };

  execute(config: OptimisticConfig, input: any): OptimisticUpdate {
    // Extract entity ID
    const entityId = this.resolveDescriptor(config.id, input);

    // Apply operations
    const data: any = {};

    config.operations.forEach(op => {
      if (op.op === 'set') {
        const value = this.resolveDescriptor(op.value, input);
        this.setPath(data, op.path, value);
      }

      if (op.op === 'array-push') {
        const arr = this.getPath(data, op.path) || [];
        const items = op.items.map(item => this.resolveDescriptor(item, input));
        arr.push(...items);
        this.setPath(data, op.path, arr);
      }

      if (op.op === 'array-splice') {
        const arr = this.getPath(data, op.path) || [];
        const items = op.items.map(item => this.resolveDescriptor(item, input));
        arr.splice(op.start, op.deleteCount, ...items);
        this.setPath(data, op.path, arr);
      }
    });

    return {
      entity: config.entity,
      id: entityId,
      data
    };
  }

  private resolveDescriptor(descriptor: Descriptor, input: any): any {
    if (descriptor.type === 'field') {
      return this.getPath(input, descriptor.path);
    }

    if (descriptor.type === 'literal') {
      return descriptor.value;
    }

    if (descriptor.type === 'transform') {
      const transform = this.transforms[descriptor.name];
      if (!transform) {
        throw new Error(`Unknown transform: ${descriptor.name}`);
      }

      // Resolve all descriptor values in transform params
      const params = this.resolveTransformParams(descriptor, input);
      return transform(...params);
    }

    throw new Error(`Unknown descriptor type: ${(descriptor as any).type}`);
  }

  private resolveTransformParams(descriptor: TransformDescriptor, input: any): any[] {
    // Transform-specific parameter resolution
    const { name, ...params } = descriptor;

    // Recursively resolve nested descriptors
    const resolveValue = (value: any): any => {
      if (value && typeof value === 'object' && 'type' in value) {
        return this.resolveDescriptor(value, input);
      }
      if (Array.isArray(value)) {
        return value.map(resolveValue);
      }
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, resolveValue(v)])
        );
      }
      return value;
    };

    return Object.values(params).map(resolveValue);
  }

  private getPath(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }

  private setPath(obj: any, path: string[], value: any): void {
    const last = path[path.length - 1];
    const parent = path.slice(0, -1).reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    parent[last] = value;
  }
}
```

---

### Rust Client

```rust
use std::collections::HashMap;
use serde_json::Value;

pub struct OptimisticExecutor {
    transforms: HashMap<String, Box<dyn Fn(Vec<Value>) -> Value>>
}

impl OptimisticExecutor {
    pub fn new() -> Self {
        let mut transforms: HashMap<String, Box<dyn Fn(Vec<Value>) -> Value>> = HashMap::new();

        // Conditional
        transforms.insert("if".to_string(), Box::new(|params| {
            let condition = params[0].as_bool().unwrap_or(false);
            if condition { params[1].clone() } else { params[2].clone() }
        }));

        // Math
        transforms.insert("add".to_string(), Box::new(|params| {
            let sum: f64 = params.iter()
                .filter_map(|v| v.as_f64())
                .sum();
            Value::from(sum)
        }));

        transforms.insert("multiply".to_string(), Box::new(|params| {
            let product: f64 = params.iter()
                .filter_map(|v| v.as_f64())
                .product();
            Value::from(product)
        }));

        // String
        transforms.insert("concat".to_string(), Box::new(|params| {
            let result: String = params.iter()
                .filter_map(|v| v.as_str())
                .collect();
            Value::from(result)
        }));

        transforms.insert("uppercase".to_string(), Box::new(|params| {
            let s = params[0].as_str().unwrap_or("");
            Value::from(s.to_uppercase())
        }));

        // Time
        transforms.insert("now".to_string(), Box::new(|_| {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis();
            Value::from(now as u64)
        }));

        // ... all other transforms

        OptimisticExecutor { transforms }
    }

    pub fn execute(&self, config: &OptimisticConfig, input: &Value) -> OptimisticUpdate {
        // Same logic as TypeScript implementation
        // ...
    }

    fn resolve_descriptor(&self, descriptor: &Descriptor, input: &Value) -> Value {
        // Same logic as TypeScript implementation
        // ...
    }
}
```

---

### Swift Client

```swift
class OptimisticExecutor {
    private let transforms: [String: ([Any]) -> Any] = [
        // Conditional
        "if": { params in
            let condition = params[0] as? Bool ?? false
            return condition ? params[1] : params[2]
        },

        // Math
        "add": { params in
            params.compactMap { $0 as? Double }.reduce(0, +)
        },

        "multiply": { params in
            params.compactMap { $0 as? Double }.reduce(1, *)
        },

        // String
        "concat": { params in
            params.compactMap { $0 as? String }.joined()
        },

        "uppercase": { params in
            (params[0] as? String)?.uppercased() ?? ""
        },

        // Time
        "now": { _ in
            Date().timeIntervalSince1970 * 1000
        },

        // ... all other transforms
    ]

    func execute(config: OptimisticConfig, input: [String: Any]) -> OptimisticUpdate {
        // Same logic as TypeScript implementation
        // ...
    }

    private func resolveDescriptor(_ descriptor: Descriptor, input: [String: Any]) -> Any {
        // Same logic as TypeScript implementation
        // ...
    }
}
```

---

## 📚 Usage Examples

### Example 1: Simple Field Updates

```typescript
lens
  .input(z.object({
    sessionId: z.string(),
    newTitle: z.string(),
    newStatus: z.string()
  }))
  .output(SessionSchema)
  .mutation(async (input, ctx) => {
    return await ctx.db.session.update(input.sessionId, {
      title: input.newTitle,
      status: input.newStatus
    });
  })
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      draft.title = input.newTitle;
      draft.status = input.newStatus;
      draft.updatedAt = t.now();
    })
  );
```

---

### Example 2: Nested Fields

```typescript
lens
  .input(z.object({
    sessionId: z.string(),
    userId: z.string(),
    userName: z.string(),
    userEmail: z.string()
  }))
  .output(SessionSchema)
  .mutation(async (input, ctx) => { ... })
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      draft.user.id = input.userId;
      draft.user.name = input.userName;
      draft.user.email = input.userEmail;
      draft.updatedAt = t.now();
    })
  );
```

---

### Example 3: Conditional Logic

```typescript
lens
  .input(z.object({
    sessionId: z.string(),
    isActive: z.boolean(),
    level: z.enum(['high', 'medium', 'low'])
  }))
  .output(SessionSchema)
  .mutation(async (input, ctx) => { ... })
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      // If-else
      draft.status = t.if(input.isActive, 'active', 'idle');

      // Switch
      draft.priority = t.switch(input.level, {
        'high': 1,
        'medium': 2,
        'low': 3
      }, 0);
    })
  );
```

---

### Example 4: Math Operations

```typescript
lens
  .input(z.object({
    sessionId: z.string(),
    price: z.number(),
    quantity: z.number(),
    tax: z.number(),
    discount: z.number()
  }))
  .output(SessionSchema)
  .mutation(async (input, ctx) => { ... })
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      draft.subtotal = t.multiply(input.price, input.quantity);
      draft.discounted = t.subtract(draft.subtotal, input.discount);
      draft.total = t.add(draft.discounted, input.tax);
    })
  );
```

---

### Example 5: String Operations

```typescript
lens
  .input(z.object({
    sessionId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
  }))
  .output(SessionSchema)
  .mutation(async (input, ctx) => { ... })
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      draft.fullName = t.concat(input.firstName, ' ', input.lastName);
      draft.email = t.lowercase(input.email);
      draft.greeting = t.template('Hello, {{name}}!', {
        name: input.firstName
      });
    })
  );
```

---

### Example 6: Array Operations

```typescript
lens
  .input(z.object({
    sessionId: z.string(),
    tags: z.array(z.string()),
    newTags: z.array(z.string()),
    newTag: z.string()
  }))
  .output(SessionSchema)
  .mutation(async (input, ctx) => { ... })
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      // Concat arrays
      draft.allTags = t.concat(input.tags, input.newTags);

      // Map with transform
      draft.upperTags = t.map(input.tags, 'uppercase');

      // Push to array
      draft.tags.push(input.newTag);
    })
  );
```

---

### Example 7: Object Operations

```typescript
lens
  .input(z.object({
    sessionId: z.string(),
    metadata: z.object({ ... }),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      password: z.string()
    })
  }))
  .output(SessionSchema)
  .mutation(async (input, ctx) => { ... })
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      // Merge objects
      draft.metadata = t.merge(draft.metadata, input.metadata);

      // Pick fields
      draft.userInfo = t.pick(input.user, ['id', 'name', 'email']);

      // Omit sensitive fields
      draft.safeUser = t.omit(input.user, ['password']);
    })
  );
```

---

### Example 8: Complex Scenario

```typescript
lens
  .input(z.object({
    sessionId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    isActive: z.boolean(),
    price: z.number(),
    quantity: z.number(),
    tags: z.array(z.string()),
    metadata: z.object({ ... })
  }))
  .output(SessionSchema)
  .mutation(async (input, ctx) => { ... })
  .optimistic((opt) => opt
    .entity('Session')
    .id($ => $.sessionId)
    .apply((draft, input, t) => {
      // String operations
      draft.fullName = t.concat(input.firstName, ' ', input.lastName);
      draft.displayName = t.uppercase(draft.fullName);

      // Conditional
      draft.status = t.if(input.isActive, 'active', 'idle');

      // Math
      draft.total = t.multiply(input.price, input.quantity);

      // Array
      draft.upperTags = t.map(input.tags, 'uppercase');

      // Object
      draft.metadata = t.merge(draft.metadata, input.metadata);

      // Time
      draft.updatedAt = t.now();

      // JSON
      draft.metadataJson = t.json(input.metadata);

      // Template
      draft.summary = t.template(
        '{{name}} ({{status}}) - Total: {{total}}',
        {
          name: draft.fullName,
          status: draft.status,
          total: draft.total
        }
      );
    })
  );
```

---

## 🚀 Implementation Plan

### Phase 1: Core Infrastructure

**Goal:** Implement draft-based API with operation recording

**Tasks:**
1. Create `OptimisticBuilder` class
2. Implement draft proxy (records mutations)
3. Implement input proxy (records accesses)
4. Create `TransformUtils` class with all primitives
5. Operation serialization

**Files:**
- `lens-core/src/builder/optimistic.ts` - NEW
- `lens-core/src/builder/transform-utils.ts` - NEW
- `lens-core/src/builder/types.ts` - Add optimistic types

**Success Criteria:**
- Can define `.optimistic()` on mutations
- Operations recorded correctly
- Serializes to JSON

---

### Phase 2: Lens Builder Integration

**Goal:** Integrate optimistic builder into lens mutation builder

**Tasks:**
1. Add `.optimistic()` method to `LensMutationBuilder`
2. Store optimistic config in mutation metadata
3. Serialize config with mutation definition
4. Type-safe integration with input/output schemas

**Files:**
- `lens-core/src/builder/mutation.ts` - Add `.optimistic()`
- `lens-core/src/schema/types.ts` - Add `OptimisticConfig` to `LensMutation`

**Success Criteria:**
- Can define optimistic updates on mutations
- Config stored in mutation metadata
- Full TypeScript inference

---

### Phase 3: Client Executor (TypeScript)

**Goal:** Implement client-side executor for TypeScript

**Tasks:**
1. Create `OptimisticExecutor` class
2. Implement all transform executors
3. Operation execution (set, array-push, array-splice)
4. Descriptor resolution
5. Integration with normalized cache

**Files:**
- `lens-client/src/optimistic/executor.ts` - NEW
- `lens-client/src/optimistic/transforms.ts` - NEW
- `lens-client/src/optimistic/cache.ts` - NEW (normalized cache)

**Success Criteria:**
- Can execute optimistic operations
- All transforms work correctly
- Integrates with cache

---

### Phase 4: Mutation Lifecycle Integration

**Goal:** Auto-apply optimistic updates on mutations

**Tasks:**
1. Hook into mutation lifecycle (before/success/error)
2. Extract optimistic config from mutation metadata
3. Auto-execute optimistic update before server call
4. Auto-confirm on success
5. Auto-rollback on error

**Files:**
- `lens-client/src/index.ts` - Add mutation lifecycle hooks
- `lens-client/src/optimistic/manager.ts` - Optimistic manager integration

**Success Criteria:**
- Mutations automatically optimistic
- No manual confirm/rollback needed
- UI updates immediately

---

### Phase 5: Subscription State Merging

**Goal:** Merge server state + optimistic layer in subscriptions

**Tasks:**
1. Integrate optimistic cache with subscription system
2. Merge server state with pending optimistic updates
3. Update `useLensSessionSubscription` to return merged state
4. Reconciliation when server events arrive

**Files:**
- `code/src/hooks/client/useLensSessionSubscription.ts` - Merge logic
- `lens-client/src/subscription.ts` - Optimistic subscription wrapper

**Success Criteria:**
- Subscriptions reflect optimistic updates
- Merged state correct
- Reconciliation works

---

### Phase 6: Testing & Documentation

**Goal:** Comprehensive testing and documentation

**Tasks:**
1. Unit tests for all transforms
2. Integration tests for full optimistic flow
3. Multi-client tests (TypeScript, Rust, Swift)
4. Documentation and examples
5. Migration guide

**Files:**
- `lens-core/src/builder/__tests__/optimistic.test.ts` - NEW
- `lens-client/src/optimistic/__tests__/executor.test.ts` - NEW
- `docs/optimistic-updates.md` - NEW

**Success Criteria:**
- >90% test coverage
- All examples work
- Documentation complete

---

## 📊 Success Metrics

### Implementation Complete When:

1. ✅ Can define optimistic updates with `.apply()` syntax
2. ✅ All transforms implemented and tested
3. ✅ TypeScript client executor works
4. ✅ Mutations automatically optimistic
5. ✅ Subscriptions reflect merged state
6. ✅ Rollback works on error
7. ✅ Type-safe end-to-end
8. ✅ Documentation complete

---

### DX Goals:

- Define once (server), works everywhere (client)
- Type-safe (full autocomplete)
- Zero manual config (automatic)
- Intuitive (Immer-style API)

---

### Performance Goals:

- <1ms operation execution (client)
- <10ms optimistic update (UI)
- Minimal memory overhead

---

## 🔮 Future Enhancements

### Post-MVP Features:

1. **More Transforms** - Add as needed (community requests)
2. **Custom Transforms** - Allow user-defined transforms
3. **Validation** - Validate optimistic updates against schema
4. **Conflict Resolution** - Handle concurrent optimistic updates
5. **Undo/Redo** - Track optimistic update history
6. **Debugging Tools** - DevTools for optimistic updates

---

## 📝 Notes

### Design Decisions:

1. **Why draft-based?** - Most intuitive DX (Immer-proven)
2. **Why declarative transforms?** - Language-agnostic, serializable
3. **Why not eval?** - Security + multi-language support
4. **Why normalized cache?** - Automatic merging, no custom handlers

### Trade-offs:

1. ✅ **Pro:** Simple DX, multi-language, type-safe
2. ⚠️ **Con:** Limited to declarative operations (no arbitrary JS)
3. ✅ **Mitigation:** 90% of cases covered, client-override for edge cases

---

## 🎯 Ready for Implementation

This design is complete and ready for implementation. All edge cases considered, all APIs designed, serialization format defined, and multi-language support planned.

**Let's build it!** 🚀
