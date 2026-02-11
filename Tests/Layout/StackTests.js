/**
 * Stack Tests
 * Tests for VStack, HStack, and Spacer components (descriptor-based API)
 */

import { describe, it, expect } from '../TestUtils.js';
import { VStack } from '../../src/Layout/Stack/VStack.js';
import { HStack } from '../../src/Layout/Stack/HStack.js';
import { Spacer } from '../../src/Layout/Spacer.js';
import { Alignment } from '../../src/Layout/Alignment.js';
import { Text } from '../../src/View/Text.js';
import { render } from '../../src/Core/Renderer.js';

describe('VStack', () => {
  describe('Factory Function', () => {
    it('should create a descriptor with type VStack', () => {
      const stack = VStack();
      expect(stack.type).toBe('VStack');
    });

    it('should be a frozen object', () => {
      const stack = VStack();
      expect(Object.isFrozen(stack)).toBeTruthy();
    });
  });

  describe('Descriptor Properties', () => {
    it('should accept children without options', () => {
      const stack = VStack(Text('A'), Text('B'));
      expect(stack.children).toHaveLength(2);
    });

    it('should accept options with children', () => {
      const stack = VStack({ spacing: 20 }, Text('A'), Text('B'));
      expect(stack.props.spacing).toBe(20);
      expect(stack.children).toHaveLength(2);
    });

    it('should default alignment to center', () => {
      const stack = VStack();
      expect(stack.props.alignment).toBe('center');
    });

    it('should default spacing to 8', () => {
      const stack = VStack();
      expect(stack.props.spacing).toBe(8);
    });

    it('should accept custom alignment', () => {
      const stack = VStack({ alignment: Alignment.leading });
      expect(stack.props.alignment).toBe('leading');
    });

    it('should accept array of children', () => {
      const children = [Text('A'), Text('B'), Text('C')];
      const stack = VStack(children);
      expect(stack.children).toHaveLength(3);
    });

    it('should filter out null children', () => {
      const stack = VStack(Text('A'), null, Text('B'), undefined);
      expect(stack.children).toHaveLength(2);
    });
  });

  describe('render()', () => {
    it('should create a div element', () => {
      const stack = VStack();
      const element = render(stack);
      expect(element.tagName).toBe('DIV');
    });

    it('should use flexbox column layout', () => {
      const stack = VStack();
      const element = render(stack);
      expect(element.style.display).toBe('flex');
      expect(element.style.flexDirection).toBe('column');
    });

    it('should apply gap for spacing', () => {
      const stack = VStack({ spacing: 16 });
      const element = render(stack);
      expect(element.style.gap).toBe('16px');
    });

    it('should render children', () => {
      const stack = VStack(Text('A'), Text('B'));
      const element = render(stack);
      expect(element.children).toHaveLength(2);
    });

    it('should align items to flex-start for leading', () => {
      const stack = VStack({ alignment: 'leading' });
      const element = render(stack);
      expect(element.style.alignItems).toBe('flex-start');
    });

    it('should align items to center for center', () => {
      const stack = VStack({ alignment: 'center' });
      const element = render(stack);
      expect(element.style.alignItems).toBe('center');
    });

    it('should align items to flex-end for trailing', () => {
      const stack = VStack({ alignment: 'trailing' });
      const element = render(stack);
      expect(element.style.alignItems).toBe('flex-end');
    });
  });

  describe('Modifier Chaining', () => {
    it('should support padding modifier', () => {
      const stack = VStack(Text('A')).padding(20);
      const element = render(stack);
      expect(element.style.padding).toBe('20px');
    });

    it('should support background modifier', () => {
      const stack = VStack(Text('A')).background('white');
      const element = render(stack);
      expect(element.style.backgroundColor).toBe('white');
    });

    it('should support cornerRadius modifier', () => {
      const stack = VStack(Text('A')).cornerRadius(8);
      const element = render(stack);
      expect(element.style.borderRadius).toBe('8px');
    });
  });
});

describe('HStack', () => {
  describe('Factory Function', () => {
    it('should create a descriptor with type HStack', () => {
      const stack = HStack();
      expect(stack.type).toBe('HStack');
    });

    it('should be a frozen object', () => {
      const stack = HStack();
      expect(Object.isFrozen(stack)).toBeTruthy();
    });
  });

  describe('Descriptor Properties', () => {
    it('should accept children without options', () => {
      const stack = HStack(Text('A'), Text('B'));
      expect(stack.children).toHaveLength(2);
    });

    it('should accept options with children', () => {
      const stack = HStack({ spacing: 12 }, Text('A'), Text('B'));
      expect(stack.props.spacing).toBe(12);
      expect(stack.children).toHaveLength(2);
    });

    it('should default alignment to center', () => {
      const stack = HStack();
      expect(stack.props.alignment).toBe('center');
    });

    it('should accept custom alignment', () => {
      const stack = HStack({ alignment: Alignment.top });
      expect(stack.props.alignment).toBe('top');
    });
  });

  describe('render()', () => {
    it('should create a div element', () => {
      const stack = HStack();
      const element = render(stack);
      expect(element.tagName).toBe('DIV');
    });

    it('should use flexbox row layout', () => {
      const stack = HStack();
      const element = render(stack);
      expect(element.style.display).toBe('flex');
      expect(element.style.flexDirection).toBe('row');
    });

    it('should apply gap for spacing', () => {
      const stack = HStack({ spacing: 20 });
      const element = render(stack);
      expect(element.style.gap).toBe('20px');
    });

    it('should render children', () => {
      const stack = HStack(Text('A'), Text('B'), Text('C'));
      const element = render(stack);
      expect(element.children).toHaveLength(3);
    });

    it('should align items to flex-start for top', () => {
      const stack = HStack({ alignment: 'top' });
      const element = render(stack);
      expect(element.style.alignItems).toBe('flex-start');
    });

    it('should align items to center for center', () => {
      const stack = HStack({ alignment: 'center' });
      const element = render(stack);
      expect(element.style.alignItems).toBe('center');
    });

    it('should align items to flex-end for bottom', () => {
      const stack = HStack({ alignment: 'bottom' });
      const element = render(stack);
      expect(element.style.alignItems).toBe('flex-end');
    });
  });

  describe('Modifier Chaining', () => {
    it('should support frame modifier', () => {
      const stack = HStack(Text('A')).frame({ width: 200 });
      const element = render(stack);
      expect(element.style.width).toBe('200px');
    });
  });
});

describe('Spacer', () => {
  describe('Factory Function', () => {
    it('should create a descriptor with type Spacer', () => {
      const spacer = Spacer();
      expect(spacer.type).toBe('Spacer');
    });

    it('should be a frozen object', () => {
      const spacer = Spacer();
      expect(Object.isFrozen(spacer)).toBeTruthy();
    });
  });

  describe('Descriptor Properties', () => {
    it('should accept minLength option', () => {
      const spacer = Spacer({ minLength: 20 });
      expect(spacer.props.minLength).toBe(20);
    });

    it('should default minLength to null', () => {
      const spacer = Spacer();
      expect(spacer.props.minLength).toBeNull();
    });
  });

  describe('render()', () => {
    it('should create a div element', () => {
      const spacer = Spacer();
      const element = render(spacer);
      expect(element.tagName).toBe('DIV');
    });

    it('should have flexGrow of 1', () => {
      const spacer = Spacer();
      const element = render(spacer);
      expect(element.style.flexGrow).toBe('1');
    });

    it('should apply minLength as min-width and min-height', () => {
      const spacer = Spacer({ minLength: 16 });
      const element = render(spacer);
      expect(element.style.minWidth).toBe('16px');
      expect(element.style.minHeight).toBe('16px');
    });

    it('should not have min dimensions when minLength is not set', () => {
      const spacer = Spacer();
      const element = render(spacer);
      expect(element.style.minWidth).toBe('');
      expect(element.style.minHeight).toBe('');
    });
  });
});

describe('Stack with Spacer', () => {
  it('should work together in VStack', () => {
    const stack = VStack(
      Text('Top'),
      Spacer(),
      Text('Bottom')
    );
    const element = render(stack);
    expect(element.children).toHaveLength(3);
    expect(element.children[1].style.flexGrow).toBe('1');
  });

  it('should work together in HStack', () => {
    const stack = HStack(
      Text('Left'),
      Spacer(),
      Text('Right')
    );
    const element = render(stack);
    expect(element.children).toHaveLength(3);
    expect(element.children[1].style.flexGrow).toBe('1');
  });
});

describe('Nested Stacks', () => {
  it('should support VStack inside HStack', () => {
    const layout = HStack(
      Text('Left'),
      VStack(
        Text('Top'),
        Text('Bottom')
      )
    );
    const element = render(layout);
    expect(element.children).toHaveLength(2);
    expect(element.children[1].style.flexDirection).toBe('column');
  });

  it('should support HStack inside VStack', () => {
    const layout = VStack(
      Text('Title'),
      HStack(
        Text('A'),
        Text('B')
      )
    );
    const element = render(layout);
    expect(element.children).toHaveLength(2);
    expect(element.children[1].style.flexDirection).toBe('row');
  });

  it('should support deeply nested stacks', () => {
    const layout = VStack(
      HStack(
        VStack(Text('A'), Text('B')),
        VStack(Text('C'), Text('D'))
      )
    );
    const element = render(layout);
    expect(element.children).toHaveLength(1);
    const hstack = element.children[0];
    expect(hstack.children).toHaveLength(2);
  });
});

describe('Alignment', () => {
  it('should export alignment constants', () => {
    expect(Alignment.leading).toBe('leading');
    expect(Alignment.center).toBe('center');
    expect(Alignment.trailing).toBe('trailing');
    expect(Alignment.top).toBe('top');
    expect(Alignment.bottom).toBe('bottom');
  });
});
