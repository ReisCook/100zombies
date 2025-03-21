// src/engine/Config.js
/**
 * Default engine configuration
 */
export const DefaultConfig = {
    // Display settings
    width: window.innerWidth,
    height: window.innerHeight,
    fov: 95,
    pixelRatio: window.devicePixelRatio,
    
    // Performance settings
    targetFPS: 60,
    physicsFPS: 120,
    maxFrameTime: 0.1, // Prevents death spiral with slow frames
    
    // Physics settings
    gravity: -20, // Higher for arcadey feel
    airDrag: 0.003,
    
    // Player settings
    walkSpeed: 5.0,
    runSpeed: 8.0,
    jumpForce: 6.0,
    airControl: 0.8,
    mouseSpeed: 0.002,
    eyeHeight: 1.7,
    
    // Camera effects
    enableHeadBob: true,
    bobFrequency: 2.0,
    bobAmplitude: 0.07,
    enableFovChange: true,
    sprintFovMultiplier: 1.1,
    
    // Debug settings
    debug: false,
    showFPS: true,
    
    // Rendering settings
    shadows: true,
    ambientOcclusion: false,
    antialiasing: true,
    
    // Game settings
    maxJumps: 2, // For double jump
};

/**
 * Configuration class for the engine
 */
export class Config {
    /**
     * Create a new configuration object
     * @param {Object} options - Custom configuration options
     */
    constructor(options = {}) {
        // Merge default config with provided options
        Object.assign(this, DefaultConfig, options);
    }
    
    /**
     * Update specific configuration values
     * @param {Object} options - Configuration options to update
     */
    update(options) {
        Object.assign(this, options);
    }
}