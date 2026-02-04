/**
 * ObservableObject Tests
 * Tests for the ObservableObject state management class
 */

import { describe, it, expect } from '../TestUtils.js';
import { ObservableObject, Published, createObservable } from '../../src/Data/ObservableObject.js';
import { Binding } from '../../src/Data/Binding.js';

describe('ObservableObject', () => {
  describe('Constructor', () => {
    it('should create an instance', () => {
      const observable = new ObservableObject();
      expect(observable).toBeInstanceOf(ObservableObject);
    });

    it('should initialize with empty subscribers', () => {
      const observable = new ObservableObject();
      expect(observable._subscribers.size).toBe(0);
    });
  });

  describe('published()', () => {
    it('should define a property with initial value', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);
      expect(observable.count).toBe(0);
    });

    it('should allow setting the property', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);
      observable.count = 5;
      expect(observable.count).toBe(5);
    });

    it('should return this for chaining', () => {
      const observable = new ObservableObject();
      const result = observable.published('count', 0);
      expect(result).toBe(observable);
    });

    it('should support multiple properties', () => {
      const observable = new ObservableObject();
      observable.published('name', 'John');
      observable.published('age', 30);
      expect(observable.name).toBe('John');
      expect(observable.age).toBe(30);
    });
  });

  describe('subscribe()', () => {
    it('should notify subscribers when property changes', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);

      let notified = false;
      observable.subscribe(() => { notified = true; });
      observable.count = 1;

      expect(notified).toBe(true);
    });

    it('should pass the observable to callback', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);

      let received = null;
      observable.subscribe((obj) => { received = obj; });
      observable.count = 1;

      expect(received).toBe(observable);
    });

    it('should not notify if value unchanged', () => {
      const observable = new ObservableObject();
      observable.published('count', 5);

      let notifications = 0;
      observable.subscribe(() => { notifications++; });
      observable.count = 5;

      expect(notifications).toBe(0);
    });

    it('should return unsubscribe function', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);

      let notifications = 0;
      const unsubscribe = observable.subscribe(() => { notifications++; });

      observable.count = 1;
      expect(notifications).toBe(1);

      unsubscribe();
      observable.count = 2;
      expect(notifications).toBe(1);
    });
  });

  describe('subscribeToProperty()', () => {
    it('should notify only for specific property', () => {
      const observable = new ObservableObject();
      observable.published('name', 'John');
      observable.published('age', 30);

      let nameChanges = 0;
      observable.subscribeToProperty('name', () => { nameChanges++; });

      observable.name = 'Jane';
      observable.age = 31;

      expect(nameChanges).toBe(1);
    });

    it('should pass new and old values', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);

      let receivedNew = null;
      let receivedOld = null;
      observable.subscribeToProperty('count', (newVal, oldVal) => {
        receivedNew = newVal;
        receivedOld = oldVal;
      });
      observable.count = 5;

      expect(receivedNew).toBe(5);
      expect(receivedOld).toBe(0);
    });

    it('should return unsubscribe function', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);

      let notifications = 0;
      const unsubscribe = observable.subscribeToProperty('count', () => { notifications++; });

      observable.count = 1;
      unsubscribe();
      observable.count = 2;

      expect(notifications).toBe(1);
    });
  });

  describe('binding()', () => {
    it('should return a Binding instance', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);
      const binding = observable.binding('count');
      expect(binding).toBeInstanceOf(Binding);
    });

    it('should read the property value', () => {
      const observable = new ObservableObject();
      observable.published('count', 42);
      const binding = observable.binding('count');
      expect(binding.value).toBe(42);
    });

    it('should write to the property', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);
      const binding = observable.binding('count');
      binding.value = 100;
      expect(observable.count).toBe(100);
    });

    it('should cache bindings', () => {
      const observable = new ObservableObject();
      observable.published('count', 0);
      const binding1 = observable.binding('count');
      const binding2 = observable.binding('count');
      expect(binding1).toBe(binding2);
    });
  });

  describe('batch()', () => {
    it('should batch multiple updates into single notification', () => {
      const observable = new ObservableObject();
      observable.published('a', 0);
      observable.published('b', 0);

      let notifications = 0;
      observable.subscribe(() => { notifications++; });

      observable.batch(() => {
        observable.a = 1;
        observable.b = 2;
      });

      expect(notifications).toBe(1);
    });

    it('should still update all values', () => {
      const observable = new ObservableObject();
      observable.published('a', 0);
      observable.published('b', 0);

      observable.batch(() => {
        observable.a = 10;
        observable.b = 20;
      });

      expect(observable.a).toBe(10);
      expect(observable.b).toBe(20);
    });
  });

  describe('snapshot() and restore()', () => {
    it('should create a snapshot of properties', () => {
      const observable = new ObservableObject();
      observable.published('name', 'John');
      observable.published('age', 30);

      const snapshot = observable.snapshot();

      expect(snapshot.name).toBe('John');
      expect(snapshot.age).toBe(30);
    });

    it('should restore from snapshot', () => {
      const observable = new ObservableObject();
      observable.published('name', 'John');
      observable.published('age', 30);

      const snapshot = observable.snapshot();

      observable.name = 'Jane';
      observable.age = 25;

      observable.restore(snapshot);

      expect(observable.name).toBe('John');
      expect(observable.age).toBe(30);
    });
  });

  describe('publishedPropertyNames', () => {
    it('should return array of property names', () => {
      const observable = new ObservableObject();
      observable.published('name', 'John');
      observable.published('age', 30);

      const names = observable.publishedPropertyNames;

      expect(names).toContain('name');
      expect(names).toContain('age');
      expect(names).toHaveLength(2);
    });
  });
});

describe('Published()', () => {
  it('should add published property to observable', () => {
    const observable = new ObservableObject();
    Published(observable, 'count', 0);
    expect(observable.count).toBe(0);
  });

  it('should throw if target is not ObservableObject', () => {
    expect(() => {
      Published({}, 'count', 0);
    }).toThrow();
  });
});

describe('createObservable()', () => {
  it('should create ObservableObject with properties', () => {
    const observable = createObservable({
      name: 'John',
      age: 30
    });

    expect(observable).toBeInstanceOf(ObservableObject);
    expect(observable.name).toBe('John');
    expect(observable.age).toBe(30);
  });

  it('should make properties reactive', () => {
    const observable = createObservable({ count: 0 });

    let notified = false;
    observable.subscribe(() => { notified = true; });
    observable.count = 1;

    expect(notified).toBe(true);
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running ObservableObject tests...');
}
