/**
 * Mobile device detection and touch capability utilities
 * Used to determine when to show touch controls for online multiplayer
 */

export function isMobileDevice(): boolean {
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check user agent for mobile devices
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUA = mobileRegex.test(navigator.userAgent);
    
    // Check for small screen size (mobile-like)
    const isSmallScreen = window.innerWidth <= 768 && window.innerHeight <= 1024;
    
    // Device is considered mobile if it has touch AND (mobile user agent OR small screen)
    return hasTouch && (isMobileUA || isSmallScreen);
}

export function isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getScreenOrientation(): 'portrait' | 'landscape' {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

export function isTablet(): boolean {
    const isMobile = isMobileDevice();
    const isLargeScreen = window.innerWidth >= 768;
    return isMobile && isLargeScreen;
}

/**
 * Determine if touch controls should be shown for online games
 */
export function shouldShowTouchControls(): boolean {
    const hasMobile = isMobileDevice();
    const hasTouch = isTouchDevice();
    
    // Check for debug mode to force touch controls
    const forceTouch = (window as any).FORCE_TOUCH_CONTROLS || 
                      localStorage.getItem('debug-touch-controls') === 'true' ||
                      new URLSearchParams(window.location.search).has('touch');
    
    return hasMobile || hasTouch || forceTouch;
}

/**
 * Get optimal touch zone dimensions based on screen size
 */
export function getTouchZoneDimensions(): {
    width: number;
    height: number;
    padding: number;
} {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Make touch zones larger on tablets, smaller on phones
    const isTabletDevice = isTablet();
    
    if (isTabletDevice) {
        return {
            width: Math.min(200, screenWidth * 0.25),
            height: Math.min(150, screenHeight * 0.3),
            padding: 20
        };
    } else {
        return {
            width: Math.min(120, screenWidth * 0.35),
            height: Math.min(100, screenHeight * 0.25),
            padding: 15
        };
    }
}
