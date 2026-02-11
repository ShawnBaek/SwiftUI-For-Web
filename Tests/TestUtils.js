/**
 * SwiftUI-For-Web Test Utilities
 * Simple, zero-dependency testing framework for browser-based tests
 */

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  suites: []
};

let currentSuite = null;

// Stack of beforeEach/afterEach hooks for nested describe blocks
const hookStack = [];

/**
 * Register a function to run before each test in the current describe block
 * @param {Function} fn - Setup function
 */
export function beforeEach(fn) {
  if (hookStack.length > 0) {
    hookStack[hookStack.length - 1].beforeEach.push(fn);
  }
}

/**
 * Register a function to run after each test in the current describe block
 * @param {Function} fn - Teardown function
 */
export function afterEach(fn) {
  if (hookStack.length > 0) {
    hookStack[hookStack.length - 1].afterEach.push(fn);
  }
}

/**
 * Describe a test suite
 * @param {string} name - Suite name
 * @param {Function} fn - Suite function containing tests
 */
export function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    passed: 0,
    failed: 0
  };

  const previousSuite = currentSuite;
  currentSuite = suite;
  hookStack.push({ beforeEach: [], afterEach: [] });
  console.group(`%c${name}`, 'font-weight: bold; color: #007AFF;');

  try {
    fn();
  } catch (e) {
    console.error(`Suite error: ${e.message}`);
  }

  console.groupEnd();
  hookStack.pop();
  testResults.suites.push(suite);
  currentSuite = previousSuite;
}

/**
 * Collect all beforeEach/afterEach hooks from the entire hook stack (outer to inner)
 */
function collectHooks(type) {
  const hooks = [];
  for (const frame of hookStack) {
    for (const fn of frame[type]) {
      hooks.push(fn);
    }
  }
  return hooks;
}

/**
 * Define a test case
 * @param {string} name - Test name
 * @param {Function} fn - Test function
 */
export function it(name, fn) {
  testResults.total++;

  try {
    // Run all beforeEach hooks (outer to inner)
    for (const hook of collectHooks('beforeEach')) {
      hook();
    }

    fn();

    // Run all afterEach hooks (outer to inner)
    for (const hook of collectHooks('afterEach')) {
      hook();
    }

    testResults.passed++;
    if (currentSuite) {
      currentSuite.passed++;
      currentSuite.tests.push({ name, passed: true });
    }
    console.log(`  %c\u2713 ${name}`, 'color: #34C759;');
  } catch (e) {
    testResults.failed++;
    if (currentSuite) {
      currentSuite.failed++;
      currentSuite.tests.push({ name, passed: false, error: e.message });
    }
    console.log(`  %c\u2717 ${name}`, 'color: #FF3B30;');
    console.error(`    ${e.message}`);
  }
}

/**
 * Alias for it()
 */
export const test = it;

/**
 * Create an expectation for a value
 * @param {*} actual - The actual value
 * @returns {Object} Expectation object with matchers
 */
export function expect(actual) {
  return {
    /**
     * Check strict equality
     */
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },

    /**
     * Check deep equality
     */
    toEqual(expected) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
      }
    },

    /**
     * Check if value is truthy
     */
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
      }
    },

    /**
     * Check if value is falsy
     */
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
      }
    },

    /**
     * Check if value is null
     */
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
      }
    },

    /**
     * Check if value is undefined
     */
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
      }
    },

    /**
     * Check if value is defined (not undefined)
     */
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected defined value, got undefined`);
      }
    },

    /**
     * Check if value is an instance of a class
     */
    toBeInstanceOf(expected) {
      if (!(actual instanceof expected)) {
        throw new Error(`Expected instance of ${expected.name}, got ${actual?.constructor?.name || typeof actual}`);
      }
    },

    /**
     * Check if array/string contains a value
     */
    toContain(expected) {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
        }
      } else if (typeof actual === 'string') {
        if (!actual.includes(expected)) {
          throw new Error(`Expected string to contain "${expected}"`);
        }
      } else {
        throw new Error(`toContain() requires array or string, got ${typeof actual}`);
      }
    },

    /**
     * Check if value has a length
     */
    toHaveLength(expected) {
      if (actual?.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${actual?.length}`);
      }
    },

    /**
     * Check if number is greater than expected
     */
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },

    /**
     * Check if number is less than expected
     */
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },

    /**
     * Check if function throws an error
     */
    toThrow(expectedMessage) {
      if (typeof actual !== 'function') {
        throw new Error(`toThrow() requires a function`);
      }
      let threw = false;
      let error = null;
      try {
        actual();
      } catch (e) {
        threw = true;
        error = e;
      }
      if (!threw) {
        throw new Error(`Expected function to throw`);
      }
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
      }
    },

    /**
     * Negation - returns new expect with negated matchers
     */
    get not() {
      const self = this;
      return {
        toBe(expected) {
          if (actual === expected) {
            throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
          }
        },
        toEqual(expected) {
          const actualStr = JSON.stringify(actual);
          const expectedStr = JSON.stringify(expected);
          if (actualStr === expectedStr) {
            throw new Error(`Expected ${actualStr} not to equal ${expectedStr}`);
          }
        },
        toBeTruthy() {
          if (actual) {
            throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
          }
        },
        toBeFalsy() {
          if (!actual) {
            throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
          }
        },
        toBeNull() {
          if (actual === null) {
            throw new Error(`Expected value not to be null`);
          }
        },
        toContain(expected) {
          if (Array.isArray(actual) && actual.includes(expected)) {
            throw new Error(`Expected array not to contain ${JSON.stringify(expected)}`);
          } else if (typeof actual === 'string' && actual.includes(expected)) {
            throw new Error(`Expected string not to contain "${expected}"`);
          }
        }
      };
    }
  };
}

/**
 * Get test results summary
 * @returns {Object} Test results
 */
export function getResults() {
  return { ...testResults };
}

/**
 * Print test summary to console
 */
export function printSummary() {
  console.log('\n%c--- Test Summary ---', 'font-weight: bold;');
  console.log(`Total: ${testResults.total}`);
  console.log(`%cPassed: ${testResults.passed}`, 'color: #34C759;');
  console.log(`%cFailed: ${testResults.failed}`, testResults.failed > 0 ? 'color: #FF3B30;' : '');

  if (testResults.failed === 0) {
    console.log('%c\nAll tests passed!', 'color: #34C759; font-weight: bold;');
  }
}

/**
 * Render test results to DOM
 * @param {string} selector - DOM selector to render results into
 */
export function renderResults(selector = '#test-output') {
  const container = document.querySelector(selector);
  if (!container) return;

  const html = `
    <style>
      .test-results { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
      .test-suite { margin-bottom: 20px; }
      .test-suite-name { font-weight: bold; font-size: 18px; color: #007AFF; margin-bottom: 10px; }
      .test-case { padding: 5px 0 5px 20px; }
      .test-pass { color: #34C759; }
      .test-fail { color: #FF3B30; }
      .test-summary { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ccc; }
      .test-error { color: #FF3B30; font-size: 12px; margin-left: 25px; }
    </style>
    <div class="test-results">
      <h1>Test Results</h1>
      ${testResults.suites.map(suite => `
        <div class="test-suite">
          <div class="test-suite-name">${suite.name}</div>
          ${suite.tests.map(test => `
            <div class="test-case ${test.passed ? 'test-pass' : 'test-fail'}">
              ${test.passed ? '\u2713' : '\u2717'} ${test.name}
              ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
      <div class="test-summary">
        <strong>Total:</strong> ${testResults.total} |
        <span class="test-pass"><strong>Passed:</strong> ${testResults.passed}</span> |
        <span class="${testResults.failed > 0 ? 'test-fail' : ''}"><strong>Failed:</strong> ${testResults.failed}</span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Reset test results (useful for re-running tests)
 */
export function resetResults() {
  testResults.passed = 0;
  testResults.failed = 0;
  testResults.total = 0;
  testResults.suites = [];
}
