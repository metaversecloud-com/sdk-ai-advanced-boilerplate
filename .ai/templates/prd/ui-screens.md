# UI Screens

<!--
All screens render inside the Topia iframe via the PageContainer component.
Use SDK CSS classes from: https://sdk-style.s3.amazonaws.com/styles-3.0.2.css
Reference the style guide at .ai/style-guide.md for the full class inventory.

Key rules:
- SDK classes first, Tailwind only when no SDK class exists
- No inline styles except for dynamic positioning
- All API calls go through backendAPI.ts (DO NOT modify)
- Use GlobalContext for state management
-->

## Screen Inventory

<!-- List every distinct screen/view in the app. Copy the block below for each screen. -->

### Screen: [SCREEN_NAME]

- **Route**: [CLIENT_ROUTE_OR_DEFAULT_VIEW]
- **When shown**: [CONDITION_FOR_SHOWING_THIS_SCREEN]
- **Components used**: [LIST_OF_REACT_COMPONENTS]
- **Data requirements**:
  - On mount: [API_CALLS_ON_MOUNT]
  - Cached from: [DATA_ALREADY_IN_CONTEXT]
- **User actions**:
  - [ACTION_1]: [WHAT_HAPPENS]
  - [ACTION_2]: [WHAT_HAPPENS]
- **SDK CSS classes**:
  - Layout: [CLASSES]
  - Typography: [CLASSES]
  - Buttons: [CLASSES]
  - Cards: [CLASSES]
  - Forms: [CLASSES]

<!-- Example:
### Screen: Main Menu

- **Route**: `/` (default view)
- **When shown**: After initial data loads successfully
- **Components used**: `MainMenu`, `OfferCard`, `ActionBar`
- **Data requirements**:
  - On mount: `GET /api/game-state` (fetches world config + visitor data)
  - Cached from: `GlobalContext.gameState`
- **User actions**:
  - Click "Browse Offers": Navigate to Browse screen
  - Click "My Offers": Navigate to My Offers screen
  - Click settings icon (admin only): Navigate to Admin Settings
- **SDK CSS classes**:
  - Layout: `container`
  - Typography: `h2`, `p1`, `p2`
  - Buttons: `btn`, `btn-outline`
  - Cards: `card`, `card-details`, `card-title`, `card-description`
-->

---

### Screen: [SCREEN_NAME]

- **Route**: [CLIENT_ROUTE_OR_DEFAULT_VIEW]
- **When shown**: [CONDITION_FOR_SHOWING_THIS_SCREEN]
- **Components used**: [LIST_OF_REACT_COMPONENTS]
- **Data requirements**:
  - On mount: [API_CALLS_ON_MOUNT]
  - Cached from: [DATA_ALREADY_IN_CONTEXT]
- **User actions**:
  - [ACTION_1]: [WHAT_HAPPENS]
  - [ACTION_2]: [WHAT_HAPPENS]
- **SDK CSS classes**:
  - Layout: [CLASSES]
  - Typography: [CLASSES]
  - Buttons: [CLASSES]

---

### Screen: [SCREEN_NAME]

- **Route**: [CLIENT_ROUTE_OR_DEFAULT_VIEW]
- **When shown**: [CONDITION_FOR_SHOWING_THIS_SCREEN]
- **Components used**: [LIST_OF_REACT_COMPONENTS]
- **Data requirements**:
  - On mount: [API_CALLS_ON_MOUNT]
  - Cached from: [DATA_ALREADY_IN_CONTEXT]
- **User actions**:
  - [ACTION_1]: [WHAT_HAPPENS]
  - [ACTION_2]: [WHAT_HAPPENS]
- **SDK CSS classes**:
  - Layout: [CLASSES]
  - Typography: [CLASSES]
  - Buttons: [CLASSES]

---

<!-- Add more screen blocks as needed. -->

## Admin Screens

<!-- Screens only visible to users where `visitor.isAdmin === true`. -->

### Screen: [ADMIN_SCREEN_NAME]

- **Route**: [CLIENT_ROUTE]
- **When shown**: [ADMIN_CONDITION]
- **Components used**: [LIST_OF_REACT_COMPONENTS]
- **Data requirements**:
  - On mount: [API_CALLS_ON_MOUNT]
- **Admin actions**:
  - [ACTION_1]: [WHAT_HAPPENS]
  - [ACTION_2]: [WHAT_HAPPENS]
- **SDK CSS classes**:
  - Layout: [CLASSES]
  - Typography: [CLASSES]
  - Buttons: [CLASSES]
  - Forms: [CLASSES]

<!-- Example:
### Screen: Admin Settings

- **Route**: Conditionally rendered when `isAdmin && showSettings`
- **When shown**: Admin clicks gear icon on Main Menu
- **Components used**: `AdminSettings`, `ThemeSelector`, `ResetButton`
- **Data requirements**:
  - On mount: `GET /api/admin/config`
- **Admin actions**:
  - Change theme: `PUT /api/admin/config` with `{ theme: selectedTheme }`
  - Reset game: `POST /api/admin/reset` with confirmation dialog
- **SDK CSS classes**:
  - Layout: `container`
  - Typography: `h2`, `label`
  - Buttons: `btn`, `btn-danger`
  - Forms: `input`, `input-checkbox`
-->

## Modals & Overlays

<!-- Document any modal dialogs or overlay panels. Copy this block for each modal. -->

### Modal: [MODAL_NAME]

- **Trigger**: [WHAT_OPENS_THIS_MODAL]
- **Content**: [WHAT_THE_MODAL_SHOWS]
- **Actions**:
  - Confirm: [WHAT_CONFIRM_DOES]
  - Cancel: [WHAT_CANCEL_DOES]
- **SDK CSS classes**: [CLASSES]

### Modal: [MODAL_NAME]

- **Trigger**: [WHAT_OPENS_THIS_MODAL]
- **Content**: [WHAT_THE_MODAL_SHOWS]
- **Actions**:
  - Confirm: [WHAT_CONFIRM_DOES]
  - Cancel: [WHAT_CANCEL_DOES]
- **SDK CSS classes**: [CLASSES]

<!-- Example:
### Modal: Confirm Trade

- **Trigger**: User clicks "Accept Offer" on an offer card
- **Content**: Shows offer details (item offered, item wanted, creator name) with confirm/cancel buttons
- **Actions**:
  - Confirm: `POST /api/offer/accept` with `{ offerId }`, then navigate to Success screen
  - Cancel: Close modal, return to previous screen
- **SDK CSS classes**: `btn`, `btn-outline`, `h2`, `p1`

### Modal: Reset Confirmation

- **Trigger**: Admin clicks "Reset Game" button
- **Content**: Warning text explaining that all data will be cleared
- **Actions**:
  - Confirm: `POST /api/admin/reset`, then reload game state
  - Cancel: Close modal
- **SDK CSS classes**: `btn`, `btn-danger`, `p1`
-->

## Loading & Error States

<!-- Document how the app handles loading and error conditions across all screens. -->

### Loading States

| Context | What User Sees | Implementation |
|---------|---------------|----------------|
| Initial app load | [LOADING_UI_DESCRIPTION] | [IMPLEMENTATION_NOTES] |
| API call in progress | [LOADING_UI_DESCRIPTION] | [IMPLEMENTATION_NOTES] |
| [OTHER_LOADING_CONTEXT] | [LOADING_UI_DESCRIPTION] | [IMPLEMENTATION_NOTES] |

<!-- Example:
| Context | What User Sees | Implementation |
|---------|---------------|----------------|
| Initial app load | Centered spinner with "Loading..." text | PageContainer handles via `hasInteractiveParams` check |
| Creating an offer | "Offer" button shows spinner, disabled | Local `isSubmitting` state on button |
| Accepting a trade | Full-screen overlay with "Processing trade..." | Modal content swaps to loading state |
-->

### Error States

| Error Type | What User Sees | Recovery Action |
|-----------|---------------|-----------------|
| Network failure | [ERROR_UI_DESCRIPTION] | [RECOVERY_DESCRIPTION] |
| Invalid credentials | [ERROR_UI_DESCRIPTION] | [RECOVERY_DESCRIPTION] |
| [OTHER_ERROR_TYPE] | [ERROR_UI_DESCRIPTION] | [RECOVERY_DESCRIPTION] |

<!-- Example:
| Error Type | What User Sees | Recovery Action |
|-----------|---------------|-----------------|
| Network failure | Error banner: "Something went wrong. Please try again." | Retry button reloads game state |
| Invalid credentials | "Session expired. Please reopen the app." | User must click key asset again |
| Offer already accepted | "This offer is no longer available." with "Back" button | Navigate to main menu, refresh offers |
-->

### Empty States

| Context | What User Sees | Call to Action |
|---------|---------------|---------------|
| [EMPTY_CONTEXT] | [EMPTY_UI_DESCRIPTION] | [CTA_BUTTON_OR_TEXT] |

<!-- Example:
| Context | What User Sees | Call to Action |
|---------|---------------|---------------|
| No open offers | Illustration + "No offers yet" | "Create the first offer" button |
| No completed trades | "You haven't completed any trades yet" | "Browse offers" button |
-->

## Component Tree

<!-- High-level component hierarchy showing nesting relationships. -->

```
App (DO NOT MODIFY)
  PageContainer (DO NOT MODIFY)
    [TOP_LEVEL_COMPONENT]
      [CHILD_COMPONENT_1]
        [GRANDCHILD_COMPONENT]
      [CHILD_COMPONENT_2]
      [CHILD_COMPONENT_3]
    [ADMIN_COMPONENT] (conditional: isAdmin)
      [ADMIN_CHILD_1]
      [ADMIN_CHILD_2]
    [MODAL_COMPONENT] (conditional: isModalOpen)
```

<!-- Example:
```
App (DO NOT MODIFY)
  PageContainer (DO NOT MODIFY)
    GameView
      MainMenu
        OfferCard (repeated)
        ActionBar
      BrowseOffers
        OfferList
          OfferCard (repeated)
        FilterBar
      MyOffers
        OfferCard (repeated)
      SuccessScreen
    AdminSettings (conditional: isAdmin)
      ThemeSelector
      ResetButton
    ConfirmModal (conditional: isModalOpen)
```
-->
