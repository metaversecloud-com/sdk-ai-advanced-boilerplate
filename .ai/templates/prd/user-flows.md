# User Flows

## Entry Point

<!-- How does the user first encounter and open this app? Topia SDK apps can be triggered in several ways. Select and describe the applicable entry point(s). -->

- **Trigger type**: [CLICK_ASSET | ENTER_ZONE | WEBHOOK | OTHER]
- **Asset/zone name**: [ASSET_OR_ZONE_NAME]
- **What the user sees first**: [INITIAL_VIEW_DESCRIPTION]

<!-- Example:
- **Trigger type**: CLICK_ASSET
- **Asset/zone name**: "Game Station" key asset
- **What the user sees first**: The app iframe opens showing the main game interface
-->

## Primary User Flow

<!-- The main happy-path journey a visitor takes through the app. Number each step. Include what the user sees, what they do, and what happens on the backend. -->

### [FLOW_NAME] (Primary)

| Step | User Action | What They See | Backend Action |
|------|------------|---------------|----------------|
| 1 | [USER_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |
| 2 | [USER_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |
| 3 | [USER_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |
| 4 | [USER_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |
| 5 | [USER_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |

<!-- Example:
| Step | User Action | What They See | Backend Action |
|------|------------|---------------|----------------|
| 1 | Clicks key asset | Loading spinner, then main screen with lunch menu | GET /api/game-state fetches world + visitor data |
| 2 | Selects a lunch item to offer | Item highlights, "Offer" button becomes active | None (client state only) |
| 3 | Clicks "Offer" button | Confirmation modal | POST /api/offer creates offer in world data object |
| 4 | Another visitor accepts offer | "Trade Complete!" screen with animation | POST /api/accept updates both visitors' data objects |
| 5 | Clicks "Done" | App closes | None |
-->

## Secondary User Flows

<!-- Additional flows beyond the primary journey. Add as many sections as needed. -->

### [SECONDARY_FLOW_NAME]

| Step | User Action | What They See | Backend Action |
|------|------------|---------------|----------------|
| 1 | [USER_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |
| 2 | [USER_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |
| 3 | [USER_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |

## Admin Flow

<!-- If the app has admin-specific features (configuration, reset, moderation), document them here. Admins are identified by `visitor.isAdmin === true`. -->

### Admin Detection

- Admin status is determined by: `visitor.isAdmin` from `Visitor.get()`
- Admin UI elements: [DESCRIBE_ADMIN_ONLY_UI_ELEMENTS]

### Admin Actions

| Step | Admin Action | What They See | Backend Action |
|------|-------------|---------------|----------------|
| 1 | [ADMIN_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |
| 2 | [ADMIN_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |
| 3 | [ADMIN_ACTION] | [UI_DESCRIPTION] | [API_CALL_OR_SDK_METHOD] |

<!-- Example admin actions:
| Step | Admin Action | What They See | Backend Action |
|------|-------------|---------------|----------------|
| 1 | Clicks gear icon | Settings panel with theme selector and reset button | GET /api/admin/config |
| 2 | Changes theme | Theme preview updates | PUT /api/admin/config updates world data object |
| 3 | Clicks "Reset Game" | Confirmation dialog | POST /api/admin/reset clears all game data |
-->

## Edge Cases

<!-- Document at least 3 edge cases. For each, describe the scenario, expected behavior, and how the app handles it. -->

### Edge Case 1: [EDGE_CASE_NAME]

- **Scenario**: [DESCRIPTION_OF_WHAT_TRIGGERS_THIS]
- **Expected behavior**: [WHAT_THE_USER_SHOULD_SEE]
- **Handling**: [HOW_THE_CODE_HANDLES_IT]

### Edge Case 2: [EDGE_CASE_NAME]

- **Scenario**: [DESCRIPTION_OF_WHAT_TRIGGERS_THIS]
- **Expected behavior**: [WHAT_THE_USER_SHOULD_SEE]
- **Handling**: [HOW_THE_CODE_HANDLES_IT]

### Edge Case 3: [EDGE_CASE_NAME]

- **Scenario**: [DESCRIPTION_OF_WHAT_TRIGGERS_THIS]
- **Expected behavior**: [WHAT_THE_USER_SHOULD_SEE]
- **Handling**: [HOW_THE_CODE_HANDLES_IT]

<!-- Common edge cases to consider:
- First-time visitor (no data object exists yet)
- Visitor leaves mid-flow (closes iframe, navigates away)
- Concurrent users modifying the same data object
- Network failure during SDK call
- Admin removes key asset while app is in use
- Visitor's session expires (stale interactive nonce)
- Data object has been corrupted or has unexpected shape
-->

## Screen Transitions

<!-- Text-based diagram showing how screens connect. Use arrows to indicate navigation direction. -->

```
[ENTRY_POINT]
    |
    v
[SCREEN_1: SCREEN_NAME]
    |
    +--> [SCREEN_2A: SCREEN_NAME] --> [SCREEN_3: SCREEN_NAME]
    |
    +--> [SCREEN_2B: SCREEN_NAME] --> [SCREEN_3: SCREEN_NAME]
    |
    v
[FINAL_SCREEN: SCREEN_NAME]
```

<!-- Example:
```
[Click Key Asset]
    |
    v
[Loading Screen]
    |
    v
[Main Menu]
    |
    +--> [Browse Items] --> [Item Detail] --> [Offer Modal] --> [Confirmation]
    |                                                               |
    |                                                               v
    +--> [My Offers] --> [Offer Detail] --> [Cancel Modal]    [Success Screen]
    |
    +--> [Admin Settings] (admin only)
            |
            +--> [Theme Config]
            +--> [Reset Game]
```
-->
