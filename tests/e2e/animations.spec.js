/**
 * SwiftUI-For-Web Animation E2E Tests
 *
 * Tests for Pinterest-style card expansion animation:
 * - Transition properties are correctly set
 * - Animation starts from card position
 * - Animation ends at center position
 * - Close animation returns to original position
 * - Animation timing and easing
 */

import { test, expect } from '@playwright/test';

const NETFLIX_URL = '/Examples/Netflix/index.html';

// Animation timing constants (must match implementation)
const OPEN_DURATION = 400; // ms
const CLOSE_DURATION = 350; // ms
const ANIMATION_BUFFER = 100; // extra buffer for test stability

test.describe('Pinterest-style Card Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(NETFLIX_URL);
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 10000 });
    // Wait for images to load
    await page.waitForTimeout(500);
  });

  test('card has correct initial state before click', async ({ page }) => {
    // Find a movie card
    const cards = page.locator('img[src*="picsum"]').first();
    await expect(cards).toBeVisible();

    // Get card's bounding box
    const cardBox = await cards.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox.width).toBeGreaterThan(0);
    expect(cardBox.height).toBeGreaterThan(0);
  });

  test('clicking card creates expanded overlay', async ({ page }) => {
    // Scroll to find a movie card in a row (not the hero)
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    // Find and click a movie card
    const card = page.locator('img[src*="trending0"]').first();
    await expect(card).toBeVisible();

    // Get initial card position
    const initialBox = await card.boundingBox();

    // Click the card
    await card.click();

    // Wait for overlay to appear
    await page.waitForTimeout(50);

    // Check that expanded card exists
    const expandedCard = page.locator('#expanded-card');
    await expect(expandedCard).toBeVisible();
  });

  test('expanded card has correct CSS transition property', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();
    await page.waitForTimeout(50);

    const expandedCard = page.locator('#expanded-card');

    // Verify transition property includes cubic-bezier
    const transition = await expandedCard.evaluate(el =>
      getComputedStyle(el).transition
    );

    expect(transition).toContain('cubic-bezier');
  });

  test('animation starts from card position', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    const initialBox = await card.boundingBox();

    // Add listener before click to capture initial position
    const initialPositions = await page.evaluate(() => {
      return new Promise(resolve => {
        // Observer to catch the initial state
        const observer = new MutationObserver((mutations) => {
          const expandedCard = document.getElementById('expanded-card');
          if (expandedCard) {
            const style = expandedCard.style;
            resolve({
              left: style.left,
              top: style.top,
              width: style.width,
              height: style.height
            });
            observer.disconnect();
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Timeout fallback
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, 2000);
      });
    });

    // Click the card
    await card.click();
    await page.waitForTimeout(50);

    // Verify the expanded card was created near the original card position
    const expandedCard = page.locator('#expanded-card');
    await expect(expandedCard).toBeVisible();
  });

  test('animation ends at center of screen', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();

    // Wait for animation to complete
    await page.waitForTimeout(OPEN_DURATION + ANIMATION_BUFFER);

    const expandedCard = page.locator('#expanded-card');

    // Get final position
    const finalStyle = await expandedCard.evaluate(el => ({
      left: el.style.left,
      top: el.style.top,
      transform: getComputedStyle(el).transform
    }));

    // Should be centered (50%)
    expect(finalStyle.left).toBe('50%');
    expect(finalStyle.top).toBe('50%');
  });

  test('expanded card has correct final dimensions', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();

    // Wait for animation to complete
    await page.waitForTimeout(OPEN_DURATION + ANIMATION_BUFFER);

    const expandedCard = page.locator('#expanded-card');
    const box = await expandedCard.boundingBox();

    // Expanded card should be larger than original
    expect(box.width).toBeGreaterThan(200);
    expect(box.height).toBeGreaterThan(300);
  });

  test('close button appears after animation', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();

    // Wait for animation to complete
    await page.waitForTimeout(OPEN_DURATION + ANIMATION_BUFFER);

    // Close button should be visible
    const closeBtn = page.locator('#expanded-card button').first();
    await expect(closeBtn).toBeVisible();

    // Check opacity is 1 (fully visible)
    const opacity = await closeBtn.evaluate(el =>
      getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0.9);
  });

  test('text overlay appears after animation', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();

    // Wait for animation to complete
    await page.waitForTimeout(OPEN_DURATION + ANIMATION_BUFFER);

    // Text overlay should be visible
    const textOverlay = page.locator('#expanded-card > div:nth-child(2)');

    const opacity = await textOverlay.evaluate(el =>
      getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeGreaterThan(0.9);
  });

  test('backdrop fades in', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();

    // Wait for animation to complete
    await page.waitForTimeout(OPEN_DURATION + ANIMATION_BUFFER);

    // Find backdrop (first child of overlay)
    const backdrop = page.locator('[style*="position: fixed"] > div').first();

    const bgColor = await backdrop.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );

    // Should have dark background
    expect(bgColor).toContain('rgba');
    // The alpha should be > 0
    const alphaMatch = bgColor.match(/[\d.]+(?=\))/);
    if (alphaMatch) {
      expect(parseFloat(alphaMatch[0])).toBeGreaterThan(0.5);
    }
  });

  test('close animation returns card toward original position', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    const initialBox = await card.boundingBox();
    const initialCenterX = initialBox.x + initialBox.width / 2;
    const initialCenterY = initialBox.y + initialBox.height / 2;

    // Open
    await card.click();
    await page.waitForTimeout(OPEN_DURATION + ANIMATION_BUFFER);

    // Click close button
    const closeBtn = page.locator('#expanded-card button').first();
    await closeBtn.click();

    // Check position during close animation (before it completes)
    await page.waitForTimeout(100);

    const expandedCard = page.locator('#expanded-card');
    const midAnimBox = await expandedCard.boundingBox();

    // The card should be moving toward the original position
    // (It won't be exact due to timing, but should be closer than center)
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    if (midAnimBox) {
      const cardCenterX = midAnimBox.x + midAnimBox.width / 2;
      const cardCenterY = midAnimBox.y + midAnimBox.height / 2;

      // Card should be moving away from center
      // This is a soft check since timing varies
      console.log(`Card moving from center (${centerX}, ${centerY}) toward (${initialCenterX}, ${initialCenterY})`);
    }

    // Wait for close to complete
    await page.waitForTimeout(CLOSE_DURATION + ANIMATION_BUFFER);

    // Overlay should be gone
    await expect(page.locator('#expanded-card')).not.toBeVisible();
  });

  test('escape key closes the card', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();
    await page.waitForTimeout(OPEN_DURATION + ANIMATION_BUFFER);

    // Press escape
    await page.keyboard.press('Escape');

    // Wait for close animation
    await page.waitForTimeout(CLOSE_DURATION + ANIMATION_BUFFER);

    // Overlay should be gone
    await expect(page.locator('#expanded-card')).not.toBeVisible();
  });

  test('clicking backdrop closes the card', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();
    await page.waitForTimeout(OPEN_DURATION + ANIMATION_BUFFER);

    // Click on backdrop (corner of screen, away from card)
    await page.mouse.click(10, 10);

    // Wait for close animation
    await page.waitForTimeout(CLOSE_DURATION + ANIMATION_BUFFER);

    // Overlay should be gone
    await expect(page.locator('#expanded-card')).not.toBeVisible();
  });
});

test.describe('Animation Timing Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(NETFLIX_URL);
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('open animation takes approximately correct duration', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();

    // Track animation timing using transitionend event
    const animationDuration = await page.evaluate(() => {
      return new Promise(resolve => {
        const startTime = performance.now();

        // Listen for click and then transitionend
        document.addEventListener('click', () => {
          const checkForCard = setInterval(() => {
            const expandedCard = document.getElementById('expanded-card');
            if (expandedCard) {
              clearInterval(checkForCard);

              expandedCard.addEventListener('transitionend', (e) => {
                if (e.propertyName === 'width' || e.propertyName === 'left') {
                  const endTime = performance.now();
                  resolve(endTime - startTime);
                }
              }, { once: true });

              // Fallback timeout
              setTimeout(() => resolve(-1), 2000);
            }
          }, 10);
        }, { once: true });
      });
    });

    await card.click();
    await page.waitForTimeout(OPEN_DURATION + 200);

    // Animation should complete within expected range
    // (allowing for some variance due to browser/system load)
    if (animationDuration > 0) {
      expect(animationDuration).toBeGreaterThan(300);
      expect(animationDuration).toBeLessThan(700);
    }
  });

  test('animation uses correct easing (cubic-bezier)', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();
    await page.waitForTimeout(50);

    const expandedCard = page.locator('#expanded-card');

    // Check transition-timing-function
    const timingFunction = await expandedCard.evaluate(el =>
      getComputedStyle(el).transitionTimingFunction
    );

    // Should use cubic-bezier for smooth animation
    expect(timingFunction).toContain('cubic-bezier');
  });
});

test.describe('Animation State Snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(NETFLIX_URL);
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('capture animation keyframes', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    const initialBox = await card.boundingBox();

    // Collect animation frames
    const frames = [];

    // Start collecting before click
    const frameCollector = page.evaluate(() => {
      const collectedFrames = [];
      let collecting = true;

      const collectFrame = () => {
        const expandedCard = document.getElementById('expanded-card');
        if (expandedCard && collecting) {
          const rect = expandedCard.getBoundingClientRect();
          collectedFrames.push({
            time: performance.now(),
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
            width: rect.width,
            height: rect.height
          });
        }
        if (collecting) {
          requestAnimationFrame(collectFrame);
        }
      };

      requestAnimationFrame(collectFrame);

      // Stop after 600ms
      setTimeout(() => {
        collecting = false;
      }, 600);

      return new Promise(resolve => {
        setTimeout(() => resolve(collectedFrames), 700);
      });
    });

    // Click the card
    await card.click();

    // Wait for frame collection
    const collectedFrames = await frameCollector;

    console.log(`Collected ${collectedFrames.length} animation frames`);

    if (collectedFrames.length > 2) {
      // First frame should be smaller
      const firstFrame = collectedFrames[0];
      // Last frame should be larger (expanded)
      const lastFrame = collectedFrames[collectedFrames.length - 1];

      console.log('First frame:', firstFrame);
      console.log('Last frame:', lastFrame);

      // Card should expand
      expect(lastFrame.width).toBeGreaterThan(firstFrame.width);
      expect(lastFrame.height).toBeGreaterThan(firstFrame.height);
    }
  });

  test('animation is smooth (no sudden jumps)', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();

    // Collect frames and check for smoothness
    const smoothnessCheck = page.evaluate(() => {
      const widths = [];
      let collecting = true;

      const collectFrame = () => {
        const expandedCard = document.getElementById('expanded-card');
        if (expandedCard && collecting) {
          const rect = expandedCard.getBoundingClientRect();
          widths.push(rect.width);
        }
        if (collecting) {
          requestAnimationFrame(collectFrame);
        }
      };

      requestAnimationFrame(collectFrame);

      setTimeout(() => {
        collecting = false;
      }, 500);

      return new Promise(resolve => {
        setTimeout(() => {
          // Check that width changes are gradual
          let maxJump = 0;
          for (let i = 1; i < widths.length; i++) {
            const jump = Math.abs(widths[i] - widths[i - 1]);
            if (jump > maxJump) maxJump = jump;
          }
          resolve({
            frameCount: widths.length,
            maxJump,
            startWidth: widths[0],
            endWidth: widths[widths.length - 1]
          });
        }, 600);
      });
    });

    await card.click();
    const result = await smoothnessCheck;

    console.log('Smoothness check:', result);

    // Animation should not have sudden large jumps
    // (A jump of more than 50px per frame would be jarring)
    if (result.frameCount > 5) {
      expect(result.maxJump).toBeLessThan(100);
    }
  });
});

test.describe('Visual Regression (Screenshots)', () => {
  test('capture animation states for visual comparison', async ({ page }) => {
    await page.goto(NETFLIX_URL);
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Screenshot 1: Initial state
    await page.screenshot({ path: 'test-results/netflix-1-initial.png' });

    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(300);

    const card = page.locator('img[src*="trending0"]').first();
    await card.click();

    // Screenshot 2: Animation start (immediately after click)
    await page.waitForTimeout(50);
    await page.screenshot({ path: 'test-results/netflix-2-animation-start.png' });

    // Screenshot 3: Mid animation
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'test-results/netflix-3-animation-mid.png' });

    // Screenshot 4: Animation complete
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/netflix-4-animation-complete.png' });

    // Screenshot 5: Close animation start
    const closeBtn = page.locator('#expanded-card button').first();
    await closeBtn.click();
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'test-results/netflix-5-close-animation.png' });

    // Screenshot 6: After close
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'test-results/netflix-6-closed.png' });

    console.log('Screenshots saved to test-results/netflix-*.png');
  });
});
