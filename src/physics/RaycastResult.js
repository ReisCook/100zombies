// src/physics/RaycastResult.js
import { Vector3 } from 'three';

export class RaycastResult {
    /**
     * Create a new raycast result
     * @param {Object} options - Result options
     */
    constructor(options = {}) {
        // Did the ray hit anything?
        this.hit = options.hit !== undefined ? options.hit : false;
        
        // Distance from ray origin to hit point
        this.distance = options.distance !== undefined ? options.distance : Infinity;
        
        // Hit position in world space
        this.point = options.point ? options.point.clone() : new Vector3();
        
        // Surface normal at hit point
        this.normal = options.normal ? options.normal.clone() : new Vector3();
        
        // Body that was hit
        this.body = options.body || null;
    }
    
    /**
     * Copy values from another result
     * @param {RaycastResult} other - Result to copy from
     * @returns {RaycastResult} - This result
     */
    copy(other) {
        this.hit = other.hit;
        this.distance = other.distance;
        this.point.copy(other.point);
        this.normal.copy(other.normal);
        this.body = other.body;
        return this;
    }
    
    /**
     * Reset this result to default values
     * @returns {RaycastResult} - This result
     */
    reset() {
        this.hit = false;
        this.distance = Infinity;
        this.point.set(0, 0, 0);
        this.normal.set(0, 1, 0);
        this.body = null;
        return this;
    }
}