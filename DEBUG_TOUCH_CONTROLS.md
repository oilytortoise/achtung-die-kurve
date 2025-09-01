# Debug Guide: Mobile Touch Controls

## Quick Testing Steps

### 1. Force Touch Controls (for desktop testing)
Add `?touch` to the URL to force touch controls to appear on desktop:
```
http://localhost:3000?touch
```

Or open browser console and run:
```javascript
localStorage.setItem('debug-touch-controls', 'true');
// Then refresh the page
```

### 2. Check Console Logs
Open browser developer tools (F12) and look for these log messages:

**During page load:**
- `[Mobile] Touch capability check:` - Shows device detection results
- `[OnlineGameManager] Setting up touch controls...` - TouchControlManager initialization
- `[OnlineGameManager] Touch controls initialized successfully` - Successful setup

**During game start:**
- `[TouchControlManager] Enable called` - When controls should appear
- `[TouchControlManager] Creating touch UI` - UI creation process
- `[TouchControlManager] Touch controls enabled successfully` - Success confirmation

### 3. Visual Indicators
If working correctly, you should see:
- Two semi-transparent buttons in bottom corners of game area
- Left button shows "←" arrow
- Right button shows "→" arrow
- Buttons highlight when pressed/touched

## Common Issues & Solutions

### Issue 1: "Touch controls not needed, skipping"
**Cause:** Device not detected as touch-capable
**Solution:** Use `?touch` URL parameter or set localStorage debug flag

### Issue 2: "Could not find game container"
**Cause:** TouchControlManager can't find suitable DOM element
**Check:** Look for game container element in DOM
**Solution:** Touch controls will fallback to document.body

### Issue 3: Touch controls appear but don't respond
**Cause:** Event listeners not properly attached
**Check:** Console for any JavaScript errors
**Test:** Try clicking buttons with mouse (should work like touch)

### Issue 4: Controls appear in wrong position
**Cause:** Game container size/position calculation issues
**Check:** Browser developer tools, inspect touch control elements
**Solution:** Touch zones should auto-calculate based on container size

## Testing on Mobile Devices

### Real Mobile Device Testing
1. Build and serve the app: `npm run build && npm run preview`
2. Access from mobile device on same network
3. Go to online multiplayer mode
4. Start a game - touch controls should appear automatically

### Mobile Browser DevTools
1. Open Chrome DevTools (F12)
2. Click device toolbar icon (mobile view)
3. Select a mobile device (iPhone, Android)
4. Refresh page - should now detect as mobile

## Debug Commands

### Check Device Detection
```javascript
// Run in browser console
console.log('Touch detection:', {
    ontouchstart: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints,
    userAgent: navigator.userAgent,
    windowSize: window.innerWidth + 'x' + window.innerHeight
});
```

### Force Show Touch Controls
```javascript
// Run in browser console
window.FORCE_TOUCH_CONTROLS = true;
// Then go to online game
```

### Check Touch Control Manager
```javascript
// During online game, run in browser console
console.log('Touch controls active:', !!document.querySelector('.touch-controls-overlay'));
console.log('Touch buttons:', document.querySelectorAll('.touch-control-button'));
```

## Expected Behavior

### Desktop (without debug flags)
- Touch controls should NOT appear
- Only keyboard controls work
- Console shows "Touch controls not needed for this device"

### Mobile/Touch Devices
- Touch controls appear automatically in online games
- Two buttons in bottom corners
- Work alongside keyboard controls
- Console shows successful initialization

### Debug Mode (with ?touch or localStorage flag)
- Touch controls appear even on desktop
- Can test with mouse clicks
- Behaves like mobile device

## Troubleshooting Checklist

- [ ] Build completed successfully (`npm run build`)
- [ ] Using online multiplayer mode (not local multiplayer)
- [ ] Game has started (not just lobby screen)
- [ ] Browser console shows touch detection logs
- [ ] No JavaScript errors in console
- [ ] Tried force-enable debug mode
- [ ] Checked DOM for touch control elements

If touch controls still don't appear after trying these steps, check the browser console for any error messages and ensure you're in an online multiplayer game (not local multiplayer).
