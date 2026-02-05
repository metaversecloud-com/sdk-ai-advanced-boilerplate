## Topia SDK Styles Guide

This document outlines the approved CSS classes and styling patterns to use when developing with the Topia SDK.

**All client-side components MUST adhere to these rules**

### Core Principles

1. **SDK CSS Classes First** - Always use the SDK-provided CSS classes from [https://sdk-style.s3.amazonaws.com/styles-3.0.2.css](https://sdk-style.s3.amazonaws.com/styles-3.0.2.css)
2. **No Tailwind Except When Necessary** - Only use Tailwind when an SDK class doesn't exist
3. **No Inline Styles** - Except for dynamic positioning that cannot be handled via classes
4. **Consistent Component Structure** - Follow the component structure pattern below

### Typography

```tsx
// Headings
<h1 className="h1">Heading 1</h1>
<h2 className="h2">Heading 2</h2>
<h3 className="h3">Heading 3</h3>
<h4 className="h4">Heading 4</h4>

// Body text
<p className="p1">Standard body text</p>
<p className="p2">Medium body text</p>
<p className="p3">Small body text</p>
<p className="p4">XSmall body text</p>

// Text alignment
<p className="text-left">Left aligned text</p>
<p className="text-center">Center aligned text</p>
<p className="text-right">Right aligned text</p>

// Text variants
<p className="p2 text-success">Success text</p>
<p className="p3 text-error">Error text</p>
```

### Buttons

```tsx
// Primary button
<button className="btn">Primary Action</button>

// Secondary button
<button className="btn btn-outline">Secondary Action</button>

// Tertiary/text button
<button className="btn btn-text">Text Button</button>

// Error state
<button className="btn btn-danger">Button with error</button>

// Icon button with SVG icon
<button className="btn btn-icon">
  <img src="https://sdk-style.s3.amazonaws.com/icons/edit.svg" />
</button>

```

### Form Elements

```tsx
// Standard input field
<label className="label">Text Input</label>
<input className="input" type="text" placeholder="placeholder" />

// Input field with character count and helper text
<div className="input-group">
  <label className="label">Text Input with Character Count</label>
  <input className="input" type="text" maxlength="10" />
  <span className="input-char-count">0/10</span>
  <p className="p3">A maximum of 10 characters is allowed.</p>
</div>

// Form element with error state
<label className="label">Error</label>
<input className="input input-error" type="text" value="error" />
<p className="p3 text-error">An error has occurred</p>

// Textarea for multi-line input
<label className="label">Textarea</label>
<textarea className="input" rows="5" maxlength="120"></textarea>

// Checkbox input with label
<label className="label">
  <input className="input-checkbox" type="checkbox" />
  Checkboxes
</label>

// Radio button input with label
<label className="label">
  <input className="input-radio" type="radio" name="radio" />
  Radio Button
</label>
```

### Card Components

```tsx
// Standard card
<div className="card">
  <div className="card-image">
    <img src="image-url.jpg" alt="Description" />
  </div>
  <div className="card-details">
    <h3 className="card-title">Title</h3>
    <p className="card-description p2">Description text</p>
    <div className="card-actions">
      <div className="tooltip">
        <span className="tooltip-content">Edit</span>
        <button className="btn btn-icon">
          <img src="https://sdk-style.s3.amazonaws.com/icons/edit.svg" />
        </button>
      </div>
      <div className="tooltip">
        <span className="tooltip-content">Settings</span>
        <button className="btn btn-icon">
          <img src="https://sdk-style.s3.amazonaws.com/icons/cog.svg" />
        </button>
      </div>
      <div className="tooltip">
        <span className="tooltip-content">Info</span>
        <button className="btn btn-icon">
          <img src="https://sdk-style.s3.amazonaws.com/icons/info.svg" />
        </button>
      </div>
    </div>
  </div>
</div>

// Small card variant
<div className="card small">...</div>

// Horizontal card variant
<div className="card horizontal">...</div>

// Success card variant (for showing success states)
<div className="card success">...</div>

// Error card variant (for showing error states)
<div className="card danger">...</div>
```

### Layout Classes

```tsx
// Flex container for row layout
<div className="flex">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Flex container for column layout
<div className="flex-col">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Flex container with centered items
<div className="flex items-center justify-center">
  <div>Centered content</div>
</div>

// Container with set width
<div className="container">
  <p>Content with standard width</p>
</div>

// Grid layout
<div className="grid gap-4">
  <div>Grid Item 1</div>
  <div>Grid Item 2</div>
</div>
```

### Modals

```tsx
// Modal with hidden state and action buttons
<div id="modalExample" className="modal-container hidden">
  <div className="modal">
    <h4 className="h4">Modal title (h4)</h4>
    <p className="p2">Modal description</p>
    <div className="actions">
      <button className="btn btn-outline">Outline</button>
      <button className="btn" id="close">
        Close
      </button>
    </div>
  </div>
</div>
```

### Available Utility Classes

- Text colors: `text-success`, `text-error`, `text-warning`, `text-muted`
- Text alignment: `text-left`, `text-center`, `text-right`
- Spacing: `mt-1`, `mb-2`, `mx-auto`, `py-3` (m=margin, p=padding, x=horizontal, y=vertical)
- Display: `hidden`, `block`, `inline`, `inline-block`
- Position: `relative`, `absolute`, `fixed`

## Common Mistakes to Avoid

### ❌ Using Tailwind Instead of SDK Classes

```tsx
// ❌ INCORRECT
<button className="px-4 py-2 bg-blue-500 text-white rounded-md">
  Click Me
</button>

// ✅ CORRECT
<button className="btn">
  Click Me
</button>
```

### ❌ Using Inline Styles

```tsx
// ❌ INCORRECT
<div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem' }}>
  Content
</div>

// ✅ CORRECT
<div className="card">
  Content
</div>
```

### ❌ Using Relative Imports

```tsx
// ❌ INCORRECT
import { SomeComponent } from "../../components/SomeComponent";

// ✅ CORRECT
import { SomeComponent } from "@/components";
```

### ❌ Not Using GlobalContext for Errors

```tsx
// ❌ INCORRECT
const [error, setError] = useState<string | null>(null);
try {
  // Some operation
} catch (err) {
  setError("An error occurred");
}

// ✅ CORRECT
const dispatch = useContext(GlobalDispatchContext);
try {
  // Some operation
} catch (err) {
  setErrorMessage(dispatch, err as ErrorType);
}
```

## Component Structure Pattern

All components must follow this structure:

```tsx
// Imports grouped by type
import { useContext, useState } from "react";

// components (using aliased imports)
import { PageContainer } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

// Types defined outside the component
interface ComponentProps {
  // Props definition
}

// Component implementation
export const ComponentName = ({ prop1, prop2 }: ComponentProps) => {
  // Global context access
  const dispatch = useContext(GlobalDispatchContext);

  // Local state
  const [localState, setLocalState] = useState(initialValue);

  // Event handlers
  const handleEvent = () => {
    // Implementation using SDK classes and error handling
  };

  return (
    // JSX using SDK classes
    <div className="container">
      <h2 className="h2">Title</h2>
      <div className="card">{/* Content using SDK classes */}</div>
    </div>
  );
};

export default ComponentName;
```

## Pre-Implementation Checklist

Before starting any implementation:

- [ ] Review this style guide completely
- [ ] Examine the examples in `.ai/examples/` directory
- [ ] Identify all SDK classes needed for your components
- [ ] Plan your component structure following the pattern above
- [ ] Ensure your imports will use aliased paths
- [ ] Plan to use GlobalContext for state and error handling

## Validation Process

After implementation, verify:

- [ ] All UI elements use SDK classes, not Tailwind utilities
- [ ] Buttons use `.btn` classes, not custom styling
- [ ] Typography uses h1-h4, p1-p4 classes
- [ ] Card structure follows SDK pattern
- [ ] Imports use aliased paths
- [ ] Error handling uses GlobalContext
- [ ] No inline styles except for necessary dynamic positioning

Remember to always prefer using the SDK-provided classes rather than creating custom styles or using utility frameworks like Tailwind. The classes documented here are specifically designed to work with the Topia SDK and maintain consistent styling across applications.
