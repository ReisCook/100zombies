// src/engine/Time.js
export class Time {
    constructor() {
        this.deltaTime = 0;
        this.lastTime = 0;
        this.elapsedTime = 0;
        this.frameCount = 0;
        this.maxDeltaTime = 0.1; // Prevent extreme delta times
    }
    
    /**
     * Reset the timer
     */
    reset() {
        this.lastTime = performance.now() / 1000;
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.frameCount = 0;
    }
    
    /**
     * Update time values based on current timestamp
     * @param {number} timestamp - Current time in milliseconds
     * @returns {number} - Delta time in seconds
     */
    update(timestamp) {
        // Convert milliseconds to seconds
        const currentTime = timestamp / 1000;
        
        // On first update, just set lastTime
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            return 0;
        }
        
        // Calculate delta time
        this.deltaTime = currentTime - this.lastTime;
        
        // Clamp delta time to prevent physics issues
        if (this.deltaTime > this.maxDeltaTime) {
            this.deltaTime = this.maxDeltaTime;
        }
        
        // Update last time
        this.lastTime = currentTime;
        
        // Update elapsed time and frame count
        this.elapsedTime += this.deltaTime;
        this.frameCount++;
        
        return this.deltaTime;
    }
    
    /**
     * Get the current time in seconds since timer started
     * @returns {number} - Time in seconds
     */
    getElapsedTime() {
        return this.elapsedTime;
    }
    
    /**
     * Get the current frames per second
     * @returns {number} - FPS value
     */
    getFPS() {
        if (this.elapsedTime === 0) return 0;
        return this.frameCount / this.elapsedTime;
    }
}