// src/physics/PhysicsBody.js
import { Vector3 } from 'three';
import { SphereCollider, BoxCollider } from './Collider.js';

export class PhysicsBody {
    /**
     * Create a new physics body
     * @param {Object} options - Physics body options
     */
    constructor(options = {}) {
        // Position and orientation
        this.position = options.position ? options.position.clone() : new Vector3();
        this.rotation = options.rotation ? options.rotation.clone() : new Vector3();
        
        // Linear properties
        this.velocity = options.velocity ? options.velocity.clone() : new Vector3();
        this.acceleration = options.acceleration ? options.acceleration.clone() : new Vector3();
        this.forces = new Vector3();
        
        // Mass properties
        this.mass = options.mass !== undefined ? options.mass : 1.0;
        this.invMass = this.mass > 0 ? 1.0 / this.mass : 0;
        this.isStatic = options.isStatic !== undefined ? options.isStatic : false;
        
        if (this.isStatic) {
            this.mass = 0;
            this.invMass = 0;
        }
        
        // Material properties
        this.restitution = options.restitution !== undefined ? options.restitution : 0.1; // Lower default restitution
        this.friction = options.friction !== undefined ? options.friction : 0.1; // Lower default friction
        
        // Collision state
        this.onGround = false;
        this.usesGravity = options.usesGravity !== undefined ? options.usesGravity : true;
        
        // Terminal velocity prevention
        this.maxFallSpeed = 30.0; // Maximum fall speed to prevent excessive velocity
        
        // Stabilization settings
        this.stabilizeThreshold = 0.01; // Higher threshold to prevent lingering motion
        
        // Collider
        if (options.radius !== undefined) {
            // Sphere collider
            this.radius = options.radius;
            this.collider = new SphereCollider(this.position, this.radius);
        } else if (options.halfExtents !== undefined) {
            // Box collider
            this.halfExtents = options.halfExtents.clone();
            this.collider = new BoxCollider(this.position, this.halfExtents);
        } else {
            // Default to sphere with radius 1
            this.radius = 1.0;
            this.collider = new SphereCollider(this.position, this.radius);
        }
    }
    
    /**
     * Apply a force to the body
     * @param {Vector3} force - Force vector
     */
    applyForce(force) {
        // Skip if static
        if (this.isStatic) return;
        
        this.forces.add(force);
    }
    
    /**
     * Apply an impulse to the body
     * @param {Vector3} impulse - Impulse vector
     */
    applyImpulse(impulse) {
        // Skip if static
        if (this.isStatic) return;
        
        // Update velocity directly (F = ma => dv = F/m)
        this.velocity.add(impulse.clone().multiplyScalar(this.invMass));
    }
    
    /**
     * Integrate forces to update acceleration and velocity
     * @param {number} timeStep - Physics time step
     */
    integrateForces(timeStep) {
        // Skip if static
        if (this.isStatic) return;
        
        // Calculate acceleration from forces (F = ma => a = F/m)
        this.acceleration.copy(this.forces).multiplyScalar(this.invMass);
        
        // Update velocity from acceleration
        this.velocity.add(this.acceleration.clone().multiplyScalar(timeStep));
        
        // Limit fall speed to prevent excessive velocity
        if (this.velocity.y < -this.maxFallSpeed) {
            this.velocity.y = -this.maxFallSpeed;
        }
        
        // Reset forces for next frame
        this.forces.set(0, 0, 0);
    }
    
    /**
     * Apply anti-jitter measures and stop lingering movement
     * Higher threshold to match Apex Legends feel
     */
    stabilize() {
        // Use higher threshold to prevent lingering movements
        if (Math.abs(this.velocity.x) < this.stabilizeThreshold) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < this.stabilizeThreshold) this.velocity.y = 0;
        if (Math.abs(this.velocity.z) < this.stabilizeThreshold) this.velocity.z = 0;
        
        // Additional stabilization to prevent small oscillations on sloped surfaces
        if (this.onGround) {
            const horizontalSpeed = Math.sqrt(
                this.velocity.x * this.velocity.x + 
                this.velocity.z * this.velocity.z
            );
            
            // If barely moving horizontally while on ground, stop completely
            if (horizontalSpeed < this.stabilizeThreshold * 2) {
                this.velocity.x = 0;
                this.velocity.z = 0;
            }
        }
    }
    
    /**
     * Integrate velocity to update position
     * @param {number} timeStep - Physics time step
     */
    integrateVelocity(timeStep) {
        // Skip if static
        if (this.isStatic) return;
        
        // Update position from velocity
        this.position.add(this.velocity.clone().multiplyScalar(timeStep));
        
        // Apply stabilization
        this.stabilize();
        
        // Update collider position
        this.collider.updatePosition(this.position);
    }
    
    /**
     * Check collision with another body
     * @param {PhysicsBody} other - Other body to check collision with
     * @returns {Object|null} - Collision info or null if no collision
     */
    checkCollision(other) {
        return this.collider ? this.collider.getCollisionInfo(other.collider) : null;
    }
}

/**
 * Static physics body that doesn't move
 */
export class StaticBody extends PhysicsBody {
    /**
     * Create a new static physics body
     * @param {Object} options - Physics body options
     */
    constructor(options = {}) {
        // Force static flag
        options.isStatic = true;
        options.mass = 0;
        options.usesGravity = false;
        
        super(options);
    }
}

/**
 * A ground plane for simple floor collision
 */
export class GroundPlane extends StaticBody {
    /**
     * Create a ground plane
     * @param {Object} options - Ground plane options
     */
    constructor(options = {}) {
        super(options);
        
        this.normal = options.normal ? options.normal.clone() : new Vector3(0, 1, 0);
        this.offset = options.offset !== undefined ? options.offset : 0;
    }
    
    /**
     * Check collision with another body
     * @param {PhysicsBody} other - Other body to check
     * @returns {Object|null} - Collision info or null
     */
    checkCollision(other) {
        // Simple plane vs sphere collision
        if (other.radius !== undefined) {
            // Calculate distance from sphere center to plane
            const distance = other.position.dot(this.normal) - this.offset;
            
            // If distance is less than radius, we have collision
            if (distance < other.radius) {
                return {
                    normal: this.normal.clone(),
                    depth: other.radius - distance,
                    point: other.position.clone().sub(
                        this.normal.clone().multiplyScalar(distance)
                    )
                };
            }
        }
        
        return null;
    }
}

/**
 * A box-shaped static obstacle
 */
export class BoxObstacle extends StaticBody {
    /**
     * Create a box obstacle
     * @param {Object} options - Box options
     */
    constructor(options = {}) {
        // Ensure we have half extents
        if (!options.halfExtents) {
            options.halfExtents = new Vector3(1, 1, 1);
        }
        
        super(options);
    }
}
