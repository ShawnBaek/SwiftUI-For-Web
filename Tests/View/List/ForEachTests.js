/**
 * ForEach Tests
 * Tests for the ForEach list iteration component (descriptor-based API)
 */

import { describe, it, expect } from '../../TestUtils.js';
import { ForEach, Range } from '../../../src/View/List/ForEach.js';
import { Text } from '../../../src/View/Text.js';
import { VStack } from '../../../src/Layout/Stack/VStack.js';
import { render } from '../../../src/Core/Renderer.js';

describe('ForEach', () => {
  describe('Factory Function', () => {
    it('should create a descriptor with type ForEach', () => {
      const forEach = ForEach(['a', 'b'], item => Text(item));
      expect(forEach.type).toBe('ForEach');
    });

    it('should be a frozen object', () => {
      const forEach = ForEach(['a', 'b'], item => Text(item));
      expect(Object.isFrozen(forEach)).toBeTruthy();
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
      const forEach = ForEach(items, (item, index) => Text(`${index}: ${item}`));
      expect(forEach.children).toHaveLength(3);
      expect(forEach.children[0].props.content).toBe('0: a');
      expect(forEach.children[1].props.content).toBe('1: b');
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
      expect(children[0].key).toBe('a');
      expect(children[1].key).toBe('b');
    });

    it('should use index as fallback when no id specified', () => {
      const items = ['Apple', 'Banana'];
      const forEach = ForEach(items, item => Text(item));
      const children = forEach.children;
      expect(children[0].key).toBe(0);
      expect(children[1].key).toBe(1);
    });

    it('should support function as id', () => {
      const items = [
        { uuid: 'uuid-1', name: 'Apple' },
        { uuid: 'uuid-2', name: 'Banana' }
      ];
      const forEach = ForEach(items, { id: item => item.uuid }, item => Text(item.name));
      const children = forEach.children;
      expect(children[0].key).toBe('uuid-1');
      expect(children[1].key).toBe('uuid-2');
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

  describe('render()', () => {
    it('should render container div', () => {
      const forEach = ForEach(['a', 'b'], item => Text(item));
      const element = render(forEach);
      expect(element.tagName).toBe('DIV');
    });

    it('should use display: contents', () => {
      const forEach = ForEach(['a', 'b'], item => Text(item));
      const element = render(forEach);
      expect(element.style.display).toBe('contents');
    });

    it('should render child elements', () => {
      const forEach = ForEach(['a', 'b', 'c'], item => Text(item));
      const element = render(forEach);
      expect(element.children.length).toBe(3);
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
      const element = render(stack);
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
      const element = render(forEach);
      expect(element.children.length).toBe(2);
      // Children are VStacks (flex column divs)
      expect(element.children[0].style.flexDirection).toBe('column');
    });
  });

  describe('Modifier Support', () => {
    it('should support padding modifier', () => {
      const forEach = ForEach(['a'], item => Text(item)).padding(10);
      const element = render(forEach);
      expect(element.style.padding).toBe('10px');
    });

    it('should support background modifier', () => {
      const forEach = ForEach(['a'], item => Text(item)).background('red');
      const element = render(forEach);
      expect(element.style.backgroundColor).toBe('red');
    });
  });
});
