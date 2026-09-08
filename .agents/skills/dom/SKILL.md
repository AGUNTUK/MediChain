---
name: dom
description: >-
  Expert guide and toolset for DOM inspection, React Virtual DOM debugging, layout performance,
  accessibility (a11y), event listener leak detection, and automated browser DOM testing.
  Use when analyzing DOM trees, resolving layout thrashing/CLS, inspecting detached DOM nodes,
  optimizing React re-renders, or writing robust browser/Playwright DOM selectors.
---

# DOM Engineering, Inspection & Performance Optimization Skill

This skill equips Antigravity with specialized protocols for DOM (Document Object Model) analysis, Virtual DOM reconciliation in React 19, web performance diagnostics, event memory management, and automated DOM testing.

---

## 1. Core Principles of DOM Performance

### Avoid Layout Thrashing (Forced Synchronous Layouts)
Layout thrashing occurs when JavaScript repeatedly reads layout geometric properties (e.g. `offsetHeight`, `scrollTop`, `getBoundingClientRect()`) followed by DOM style mutations in the same animation frame.

**Anti-Pattern (Thrashing):**
```javascript
// BAD: Forces browser to recalculate layout on every loop iteration
elements.forEach(el => {
  const width = el.offsetWidth; // READ (forces reflow)
  el.style.width = (width + 10) + 'px'; // WRITE (invalidates layout)
});
```

**Optimized Pattern (Batching):**
```javascript
// GOOD: Batch all reads first, then batch all writes (or use requestAnimationFrame)
const widths = elements.map(el => el.offsetWidth); // Batch READ
requestAnimationFrame(() => {
  elements.forEach((el, i) => {
    el.style.width = (widths[i] + 10) + 'px'; // Batch WRITE
  });
});
```

### Cumulative Layout Shift (CLS) Prevention
1. **Explicit Dimensions**: Always specify `width` and `height` (or `aspect-ratio`) on `<img>`, `<video>`, and SVG elements.
2. **Skeleton Screens**: Reserve exact DOM container space for asynchronously loaded cards, catalogs, and dynamic feeds.
3. **Dynamic Font Loading**: Use `font-display: swap` or `optional` to prevent Flash of Unstyled Text (FOUT) shifting headers.
4. **Transform/Opacity Animations**: Animate only GPU-accelerated composited properties (`transform`, `opacity`). Never animate `height`, `width`, `top`, or `margin`.

---

## 2. React 19 Virtual DOM & Reconciliation Pitfalls

### Key Stability & Sibling Reordering
* Never use array indices as `key` (`key={index}`) when items can be filtered, sorted, inserted, or removed.
* In MediChain, always use persistent domain entity IDs: `key={product.id}` or `key={order.id}`.
* Mismatched keys cause React to destroy and re-create DOM nodes rather than updating attributes, destroying input focus, scroll positions, and CSS transitions.

### Detached DOM Memory Leaks in React
Detached DOM nodes occur when an element is removed from the DOM tree, but a JavaScript closure, interval, or global event listener still holds a reference to it.
```javascript
// BAD: Leak when component unmounts
useEffect(() => {
  const handleScroll = () => { /* reads element */ };
  window.addEventListener("scroll", handleScroll);
  // Missing cleanup: window holds reference to handleScroll closure!
}, []);

// GOOD: Explicit cleanup
useEffect(() => {
  const handleScroll = () => { /* ... */ };
  window.addEventListener("scroll", handleScroll, { passive: true });
  return () => window.removeEventListener("scroll", handleScroll);
}, []);
```

### Passive Event Listeners
For high-frequency scroll, touch, and wheel events, always pass `{ passive: true }` to allow the browser compositor thread to scroll immediately without waiting for JavaScript execution:
```javascript
window.addEventListener("touchstart", onTouchStart, { passive: true });
window.addEventListener("scroll", onScroll, { passive: true });
```

---

## 3. DOM Inspection & Memory Leak Diagnostic Scripts

Run these diagnostic snippets in the browser developer console or Playwright evaluation context to detect DOM health issues:

### 1. Count Total DOM Nodes & Depth
```javascript
(() => {
  const totalNodes = document.querySelectorAll('*').length;
  let maxDepth = 0;
  const findDepth = (node, depth = 1) => {
    if (depth > maxDepth) maxDepth = depth;
    for (const child of node.children) findDepth(child, depth + 1);
  };
  findDepth(document.body);
  console.log(`%c[DOM Health] Total Nodes: ${totalNodes} (Recommended: < 1500), Max Depth: ${maxDepth} (Recommended: < 32)`,
    totalNodes > 1500 ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold');
})();
```

### 2. Find Duplicate IDs in DOM
```javascript
(() => {
  const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    console.error('[DOM Bug] Duplicate IDs detected in DOM:', [...new Set(duplicates)]);
  } else {
    console.log('%c[DOM OK] Zero duplicate IDs found.', 'color: green');
  }
})();
```

### 3. Check for Hidden Overlays Blocking Pointer Events
```javascript
(() => {
  const fixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const style = window.getComputedStyle(el);
    return (style.position === 'fixed' || style.position === 'absolute') && 
           parseInt(style.zIndex, 10) > 40;
  });
  console.table(fixedElements.map(el => ({
    tag: el.tagName,
    id: el.id,
    className: el.className.slice ? el.className.slice(0, 30) : '',
    zIndex: window.getComputedStyle(el).zIndex,
    pointerEvents: window.getComputedStyle(el).pointerEvents
  })));
})();
```

---

## 4. Accessibility (a11y) & Semantic DOM Guidelines

1. **Touch Target Size**: Interactive elements (buttons, inputs, category chips) must have a touch target of at least `44x44px` (or `48x48px` on mobile) to accommodate fingers.
2. **Live Regions for Notifications**:
   Use `aria-live="polite"` or `role="status"` for asynchronous notifications, banners, and cart counters so screen readers announce changes without interrupting the user.
3. **Modal Focus Trapping**:
   When opening modals (Cart Drawer, Invoice Preview, SmartOrder Scanner), ensure:
   - `aria-modal="true"`
   - `role="dialog"`
   - Focus is trapped inside the modal until dismissed.
   - Escape key listener cleanly dismisses the modal and restores focus to the trigger button.

---

## 5. Playwright / Browser Subagent DOM Testing Protocols

When using `browser_subagent` or Playwright to inspect, click, or test the MediChain web application:
- Prefer semantic locators: `page.getByRole('button', { name: 'ক্যাটালগ দেখুন' })` or `page.getByTestId('cart-drawer')`.
- Avoid brittle text substring matching on frequently translated strings; use unambiguous CSS IDs or `data-testid` tags.
- Verify elements are attached, visible, and stable before dispatching clicks:
  ```javascript
  await expect(page.locator('#medichain-printable-invoice-wrapper')).toBeVisible({ timeout: 5000 });
  ```
