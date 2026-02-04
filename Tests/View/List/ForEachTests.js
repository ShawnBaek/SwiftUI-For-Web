/**
 * ForEach Tests
 * Tests for the ForEach list iteration component
 */

import { describe, it, expect } from '../../TestUtils.js';
import { ForEach, ForEachView, Range } from '../../../src/View/List/ForEach.js';
import { View } from '../../../src/Core/View.js';
import { Text } from '../../../src/View/Text.js';
import { VStack } from '../../../src/Layout/Stack/VStack.js';

describe('ForEach', () => {
  describe('Factory Function', () => {
    it('should create a ForEachView instance', () => {
      const forEach = ForEach(['a', 'b'], item => Text(item));
      expect(forEach).toBeInstanceOf(ForEachView);
    });

    it('should create a View instance', () => {
      const forEach = ForEach(['a', 'b'], item => Text(item));
      expect(forEach).toBeInstanceOf(View);
    });
  });

  describe('Basic Iteration', () => {
    it('should iterate over array of strings', () => {
      const items = ['Apple', 'Banana', 'Cherry'];
      const forEach = ForEach(items, item => Text(item));
      expect(forEach.children).toHaveLength(3);
    });

    it('should iterate over array of numbers', () => {
      const items = [1, 2, 3, 4, 5];
      const forEach = ForEach(items, num => Text(String(num)));
      expect(forEach.children).toHaveLength(5);
    });

    it('should iterate over array of objects', () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];
      const forEach = ForEach(items, item => Text(item.name));
      expect(forEach.children).toHaveLength(2);
    });

    it('should pass index as second parameter', () => {
      const items = ['a', 'b', 'c'];
      const indices = [];
      ForEach(items, (item, index) => {
        indices.push(index);
        return Text(item);
      });
      // Access children to trigger iteration
      const forEach = ForEach(items, (item, index) => Text(`${index}: ${item}`));
      expect(forEach.children).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const forEach = ForEach([], item => Text(item));
      expect(forEach.children).toHaveLength(0);
    });

    it('should filter null/undefined results', () => {
      const items = [1, 2, 3];
      const forEach = ForEach(items, item => {
        if (item === 2) return null;
        return Text(String(item));
      });
      expect(forEach.children).toHaveLength(2);
    });
  });

  describe('ID Parameter', () => {
    it('should use id property for identity', () => {
      const items = [
        { id: 'a', name: 'Apple' },
        { id: 'b', name: 'Banana' }
      ];
      const forEach = ForEach(items, { id: 'id' }, item => Text(item.name));
      const children = forEach.children;
      expect(children[0]._forEachKey).toBe('a');
      expect(children[1]._forEachKey).toBe('b');
    });

    it('should use index as fallback when no id specified', () => {
      const items = ['Apple', 'Banana'];
      const forEach = ForEach(items, item => Text(item));
      const children = forEach.children;
      expect(children[0]._forEachKey).toBe('0');
      expect(children[1]._forEachKey).toBe('1');
    });

    it('should support function as id', () => {
      const items = [
        { uuid: 'uuid-1', name: 'Apple' },
        { uuid: 'uuid-2', name: 'Banana' }
      ];
      const forEach = ForEach(items, { id: item => item.uuid }, item => Text(item.name));
      const children = forEach.children;
      expect(children[0]._forEachKey).toBe('uuid-1');
      expect(children[1]._forEachKey).toBe('uuid-2');
    });
  });

  describe('Range Support', () => {
    it('should support Range object', () => {
      const range = new Range(0, 5);
      const forEach = ForEach(range, i => Text(String(i)));
      expect(forEach.children).toHaveLength(5);
    });

    it('should support Range with non-zero start', () => {
      const range = new Range(5, 10);
      const forEach = ForEach(range, i => Text(String(i)));
      expect(forEach.children).toHaveLength(5);
    });

    it('should convert Range to array correctly', () => {
      const range = new Range(0, 3);
      expect(range.toArray()).toEqual([0, 1, 2]);
    });
  });

  describe('_render()', () => {
    it('should render container div with data-view', () => {
      const forEach = ForEach(['a', 'b'], item => Text(item));
      const element = forEach._render();
      expect(element.tagName).toBe('DIV');
      expect(element.dataset.view).toBe('ForEach');
    });

    it('should use display: contents', () => {
      const forEach = ForEach(['a', 'b'], item => Text(item));
      const element = forEach._render();
      expect(element.style.display).toBe('contents');
    });

    it('should render child elements', () => {
      const forEach = ForEach(['a', 'b', 'c'], item => Text(item));
      const element = forEach._render();
      expect(element.children.length).toBe(3);
    });

    it('should set data-for-each-key on children', () => {
      const items = [{ id: 'x' }, { id: 'y' }];
      const forEach = ForEach(items, { id: 'id' }, item => Text(item.id));
      const element = forEach._render();
      expect(element.children[0].dataset.forEachKey).toBe('x');
      expect(element.children[1].dataset.forEachKey).toBe('y');
    });
  });

  describe('Composition', () => {
    it('should work inside VStack', () => {
      const items = ['a', 'b', 'c'];
      const stack = VStack(
        Text('Header'),
        ForEach(items, item => Text(item)),
        Text('Footer')
      );
      const element = stack._render();
      // VStack should have 3 children: Header, ForEach container, Footer
      expect(element.children.length).toBe(3);
    });

    it('should work with complex child views', () => {
      const items = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
      const forEach = ForEach(items, { id: 'id' }, item =>
        VStack(
          Text(item.title),
          Text(`ID: ${item.id}`)
        )
      );
      const element = forEach._render();
      expect(element.children.length).toBe(2);
      expect(element.children[0].dataset.view).toBe('VStack');
    });
  });

  describe('Modifier Support', () => {
    it('should support padding modifier', () => {
      const forEach = ForEach(['a'], item => Text(item)).padding(10);
      const element = forEach._render();
      expect(element.style.padding).toBe('10px');
    });

    it('should support background modifier', () => {
      const forEach = ForEach(['a'], item => Text(item)).background('red');
      const element = forEach._render();
      expect(element.style.backgroundColor).toBe('red');
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running ForEach tests...');
}
