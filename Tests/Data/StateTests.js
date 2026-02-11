/**
 * State and Binding Tests
 * Tests for reactive state management
 */

import { describe, it, expect } from '../TestUtils.js';
import { State, createState } from '../../src/Data/State.js';
import { Binding } from '../../src/Data/Binding.js';
import { flushSync } from '../../src/Core/Scheduler.js';

describe('State', () => {
  describe('Constructor', () => {
    it('should initialize with a value', () => {
      const state = new State(42);
      expect(state.value).toBe(42);
    });

    it('should initialize with null', () => {
      const state = new State(null);
      expect(state.value).toBeNull();
    });

    it('should initialize with an object', () => {
      const obj = { name: 'test' };
      const state = new State(obj);
      expect(state.value).toEqual(obj);
    });

    it('should initialize with an array', () => {
      const arr = [1, 2, 3];
      const state = new State(arr);
      expect(state.value).toEqual(arr);
    });
  });

  describe('value property', () => {
    it('should get the current value', () => {
      const state = new State('hello');
      expect(state.value).toBe('hello');
    });

    it('should set a new value', () => {
      const state = new State(0);
      state.value = 10;
      expect(state.value).toBe(10);
    });
  });

  describe('wrappedValue property', () => {
    it('should be an alias for value getter', () => {
      const state = new State(100);
      expect(state.wrappedValue).toBe(100);
    });

    it('should be an alias for value setter', () => {
      const state = new State(0);
      state.wrappedValue = 50;
      expect(state.value).toBe(50);
    });
  });

  describe('subscribe()', () => {
    it('should call subscriber when value changes', () => {
      const state = new State(0);
      let received = null;
      state.subscribe((value) => { received = value; });

      state.value = 5;
      flushSync(); // Flush scheduled notification
      expect(received).toBe(5);
    });

    it('should not call subscriber if value is the same', () => {
      const state = new State(10);
      let callCount = 0;
      state.subscribe(() => { callCount++; });

      state.value = 10; // Same value
      flushSync();
      expect(callCount).toBe(0);
    });

    it('should support multiple subscribers', () => {
      const state = new State(0);
      let count1 = 0;
      let count2 = 0;

      state.subscribe(() => { count1++; });
      state.subscribe(() => { count2++; });

      state.value = 1;
      flushSync();
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });

    it('should return unsubscribe function', () => {
      const state = new State(0);
      let callCount = 0;
      const unsubscribe = state.subscribe(() => { callCount++; });

      state.value = 1;
      flushSync();
      expect(callCount).toBe(1);

      unsubscribe();
      state.value = 2;
      flushSync();
      expect(callCount).toBe(1); // Should not increment
    });
  });

  describe('binding property', () => {
    it('should return a Binding', () => {
      const state = new State(0);
      expect(state.binding).toBeInstanceOf(Binding);
    });

    it('should return the same binding on multiple calls', () => {
      const state = new State(0);
      const binding1 = state.binding;
      const binding2 = state.binding;
      expect(binding1).toBe(binding2);
    });

    it('should read value through binding', () => {
      const state = new State(42);
      expect(state.binding.value).toBe(42);
    });

    it('should write value through binding', () => {
      const state = new State(0);
      state.binding.value = 100;
      expect(state.value).toBe(100);
    });

    it('should notify subscribers when set through binding', () => {
      const state = new State(0);
      let received = null;
      state.subscribe((value) => { received = value; });

      state.binding.value = 25;
      flushSync();
      expect(received).toBe(25);
    });
  });

  describe('projectedValue property', () => {
    it('should be an alias for binding', () => {
      const state = new State(0);
      expect(state.projectedValue).toBe(state.binding);
    });
  });

  describe('update()', () => {
    it('should update value using function', () => {
      const state = new State(10);
      state.update((current) => current * 2);
      expect(state.value).toBe(20);
    });

    it('should notify subscribers', () => {
      const state = new State(5);
      let received = null;
      state.subscribe((value) => { received = value; });

      state.update((current) => current + 1);
      flushSync();
      expect(received).toBe(6);
    });
  });

  describe('createState factory', () => {
    it('should create a State instance', () => {
      const state = createState(0);
      expect(state).toBeInstanceOf(State);
    });

    it('should work like new State()', () => {
      const state = createState(42);
      expect(state.value).toBe(42);
    });
  });
});

describe('Binding', () => {
  describe('Constructor', () => {
    it('should create binding with getter and setter', () => {
      let value = 0;
      const binding = new Binding(
        () => value,
        (newValue) => { value = newValue; }
      );
      expect(binding.value).toBe(0);
    });
  });

  describe('value property', () => {
    it('should get value through getter', () => {
      const binding = new Binding(() => 42, () => {});
      expect(binding.value).toBe(42);
    });

    it('should set value through setter', () => {
      let value = 0;
      const binding = new Binding(
        () => value,
        (newValue) => { value = newValue; }
      );
      binding.value = 100;
      expect(value).toBe(100);
    });
  });

  describe('wrappedValue property', () => {
    it('should be an alias for value getter', () => {
      const binding = new Binding(() => 'test', () => {});
      expect(binding.wrappedValue).toBe('test');
    });

    it('should be an alias for value setter', () => {
      let value = '';
      const binding = new Binding(
        () => value,
        (newValue) => { value = newValue; }
      );
      binding.wrappedValue = 'hello';
      expect(value).toBe('hello');
    });
  });

  describe('transform()', () => {
    it('should transform value on read', () => {
      const state = new State(5);
      const doubled = state.binding.transform((x) => x * 2);
      expect(doubled.value).toBe(10);
    });

    it('should reverse transform on write', () => {
      const state = new State(10);
      const doubled = state.binding.transform(
        (x) => x * 2,
        (x) => x / 2
      );
      doubled.value = 20;
      expect(state.value).toBe(10);
    });

    it('should work without reverse transform', () => {
      const state = new State(5);
      const stringified = state.binding.transform((x) => String(x));
      expect(stringified.value).toBe('5');
    });
  });

  describe('property()', () => {
    it('should create binding to object property', () => {
      const state = new State({ name: 'John', age: 30 });
      const nameBinding = state.binding.property('name');
      expect(nameBinding.value).toBe('John');
    });

    it('should update object property', () => {
      const state = new State({ name: 'John', age: 30 });
      const nameBinding = state.binding.property('name');
      nameBinding.value = 'Jane';
      expect(state.value.name).toBe('Jane');
      expect(state.value.age).toBe(30); // Other properties preserved
    });

    it('should handle null/undefined gracefully', () => {
      const state = new State(null);
      const binding = state.binding.property('name');
      expect(binding.value).toBeUndefined();
    });
  });

  describe('index()', () => {
    it('should create binding to array element', () => {
      const state = new State(['a', 'b', 'c']);
      const firstBinding = state.binding.index(0);
      expect(firstBinding.value).toBe('a');
    });

    it('should update array element', () => {
      const state = new State([1, 2, 3]);
      const secondBinding = state.binding.index(1);
      secondBinding.value = 20;
      expect(state.value).toEqual([1, 20, 3]);
    });

    it('should handle non-array gracefully', () => {
      const state = new State('not an array');
      const binding = state.binding.index(0);
      expect(binding.value).toBeUndefined();
    });
  });

  describe('Binding.constant()', () => {
    it('should create a constant binding', () => {
      const binding = Binding.constant(42);
      expect(binding.value).toBe(42);
    });

    it('should ignore writes', () => {
      const binding = Binding.constant(42);
      binding.value = 100;
      expect(binding.value).toBe(42);
    });

    it('should work with any value type', () => {
      expect(Binding.constant('string').value).toBe('string');
      expect(Binding.constant(true).value).toBe(true);
      expect(Binding.constant(null).value).toBeNull();
    });
  });
});

describe('State and Binding Integration', () => {
  it('should work together for two-way binding', () => {
    // Parent state
    const parentState = new State({ count: 0 });

    // Child binding to the count property
    const countBinding = parentState.binding.property('count');

    // Read through binding
    expect(countBinding.value).toBe(0);

    // Write through binding updates parent
    countBinding.value = 5;
    expect(parentState.value.count).toBe(5);
  });

  it('should trigger parent subscribers when child binding changes', () => {
    const state = new State({ value: 0 });
    let notified = false;
    state.subscribe(() => { notified = true; });

    const binding = state.binding.property('value');
    binding.value = 10;

    flushSync();
    expect(notified).toBe(true);
  });
});
