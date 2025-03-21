// src/physics/PhysicsWorld.js
import { Vector3 } from 'three';
import { PhysicsBody, StaticBody } from './PhysicsBody.js';

export class PhysicsWorld {
    constructor(engine) {
        this.engine = engine;
        this.bodies = [];
        this.staticBodies = [];  // Separate array for static bodies
        this.gravity = new Vector3(0, engine.config.gravity, 0);
        this.accumulator = 0;
        this.fixedTimeStep = 1 / engine.config.physicsFPS;
        
        // Ground detection settings
        this.groundThreshold = 0.15; // Higher threshold for ground detection
        this.groundRayDistance = 0.2; // Distance to check for ground
        
        // Debug
        this.debugDraw = false;
    }
    
    init() {
        console.log('Physics world initialized');
    }
    
    /**
     * Add a physics body to the world
     * @param {PhysicsBody} body - Physics body to add
     * @returns {PhysicsBody} - Added body
     */
    addBody(body) {
        if (!(body instanceof PhysicsBody)) {
            console.error('Trying to add a non-PhysicsBody object to the physics world');
            return null;
        }
        
        // Add to appropriate array based on static status
        if (body.isStatic) {
            this.staticBodies.push(body);
        } else {
            this.bodies.push(body);
        }
        
        return body;
    }
    
    /**
     * Remove a physics body from the world
     * @param {PhysicsBody} body - Body to remove
     */
    removeBody(body) {
        if (body.isStatic) {
            const index = this.staticBodies.indexOf(body);
            if (index !== -1) {
                this.staticBodies.splice(index, 1);
            }
        } else {
            const index = this.bodies.indexOf(body);
            if (index !== -1) {
                this.bodies.splice(index, 1);
            }
        }
    }
    
    /**
     * Clear all bodies except player
     */
    clear() {
        // Keep player body
        const playerBody = this.engine.player?.physicsBody;
        
        if (playerBody) {
            this.bodies = playerBody.isStatic ? [] : [playerBody];
            this.staticBodies = playerBody.isStatic ? [playerBody] : [];
        } else {
            this.bodies = [];
            this.staticBodies = [];
        }
    }
    
    /**
     * Update physics world
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Fixed timestep physics
        this.accumulator += deltaTime;
        
        while (this.accumulator >= this.fixedTimeStep) {
            this.fixedUpdate(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }
    }
    
    /**
     * Fixed timestep update
     * @param {number} timeStep - Fixed physics timestep
     */
    fixedUpdate(timeStep) {
        // Apply gravity and integrate forces for dynamic bodies
        for (const body of this.bodies) {
            if (body.usesGravity) {
                body.applyForce(this.gravity.clone().multiplyScalar(body.mass));
            }
            body.integrateForces(timeStep);
        }
        
        // Detect and resolve collisions
        this.detectCollisions();
        
        // Update positions of dynamic bodies
        for (const body of this.bodies) {
            body.integrateVelocity(timeStep);
        }
    }
    
    /**
     * Detect and resolve all collisions
     */
    detectCollisions() {
        // Dynamic vs dynamic collisions
        for (let i = 0; i < this.bodies.length; i++) {
            const bodyA = this.bodies[i];
            
            // Check world bounds (ground collision)
            this.checkWorldBounds(bodyA);
            
            // Check against other dynamic bodies
            for (let j = i + 1; j < this.bodies.length; j++) {
                const bodyB = this.bodies[j];
                
                if (this.checkCollision(bodyA, bodyB)) {
                    this.resolveCollision(bodyA, bodyB);
                }
            }
            
            // Check against static bodies
            for (const staticBody of this.staticBodies) {
                if (this.checkCollision(bodyA, staticBody)) {
                    this.resolveCollision(bodyA, staticBody);
                }
            }
        }
    }
    
    /**
     * Check if a body is out of world bounds
     * @param {PhysicsBody} body - Body to check
     */
    checkWorldBounds(body) {
        // Improved ground detection - only considers the player on ground if they're close
        // Prevents getting stuck but still allows jumping
        if (body.position.y < this.groundThreshold) {
            // Position correction - more height to avoid sticking
            if (body.position.y < 0) {
                body.position.y = 0.05; // Slightly more lift to avoid sticking
            }
            
            // Determine if ground state needs to be updated
            // Only mark as on ground if velocity is low or downward
            if (body.velocity.y <= 0.1) {
                // Set on ground
                body.onGround = true;
                
                // Reduce downward velocity to zero
                if (body.velocity.y < 0) {
                    body.velocity.y = 0;
                }
            }
        } else {
            // Definitely in the air
            body.onGround = false;
        }
    }
    
    /**
     * Check collision between two bodies
     * @param {PhysicsBody} bodyA - First body
     * @param {PhysicsBody} bodyB - Second body
     * @returns {boolean} - True if collision detected
     */
    checkCollision(bodyA, bodyB) {
        // Use the collider's intersection test if available
        if (bodyA.collider && bodyB.collider) {
            return bodyA.collider.intersects(bodyB.collider);
        }
        
        // Otherwise use a simple sphere test
        const minDist = (bodyA.radius || 0) + (bodyB.radius || 0);
        if (minDist <= 0) return false;
        
        const dist = bodyA.position.distanceTo(bodyB.position);
        return dist < minDist;
    }
    
    /**
     * Resolve collision between two bodies
     * @param {PhysicsBody} bodyA - First body
     * @param {PhysicsBody} bodyB - Second body
     */
    resolveCollision(bodyA, bodyB) {
        // Get collision info
        let collisionInfo = null;
        
        // Try to get collision info from either body
        if (bodyA.checkCollision && typeof bodyA.checkCollision === 'function') {
            collisionInfo = bodyA.checkCollision(bodyB);
        }
        
        if (!collisionInfo && bodyB.checkCollision && typeof bodyB.checkCollision === 'function') {
            collisionInfo = bodyB.checkCollision(bodyA);
            // Invert normal if we get info from bodyB
            if (collisionInfo) {
                collisionInfo.normal.multiplyScalar(-1);
            }
        }
        
        // If we have explicit collision info, use it
        if (collisionInfo) {
            const { normal, depth } = collisionInfo;
            
            // Calculate relative velocity
            const relativeVelocity = new Vector3();
            relativeVelocity.copy(bodyA.velocity || new Vector3());
            if (bodyB.velocity) {
                relativeVelocity.sub(bodyB.velocity);
            }
            
            // Calculate velocity along normal
            const velAlongNormal = relativeVelocity.dot(normal);
            
            // Only resolve if objects are moving toward each other
            if (velAlongNormal > 0) return;
            
            // Calculate restitution
            const restitution = Math.min(
                bodyA.restitution || 0,
                bodyB.restitution || 0
            );
            
            // Calculate impulse scalar
            let j = -(1 + restitution) * velAlongNormal;
            const invMassA = bodyA.invMass || 0;
            const invMassB = bodyB.invMass || 0;
            const invMassSum = invMassA + invMassB;
            
            if (invMassSum === 0) return; // Both static - should not happen
            
            j /= invMassSum;
            const impulse = normal.clone().multiplyScalar(j);
            
            // Apply impulse
            if (bodyA.velocity && invMassA > 0) {
                bodyA.velocity.add(impulse.clone().multiplyScalar(invMassA));
            }
            
            if (bodyB.velocity && invMassB > 0) {
                bodyB.velocity.sub(impulse.clone().multiplyScalar(invMassB));
            }
            
            // Correct position (prevent sinking) - Increase position correction
            if (depth > 0) {
                // More aggressive correction to prevent sticking
                const correction = normal.clone().multiplyScalar(depth * 1.0);
                
                if (invMassA > 0) {
                    bodyA.position.add(correction.clone().multiplyScalar(invMassA / invMassSum));
                }
                
                if (invMassB > 0) {
                    bodyB.position.sub(correction.clone().multiplyScalar(invMassB / invMassSum));
                }
                
                // Update colliders
                if (bodyA.collider) {
                    bodyA.collider.updatePosition(bodyA.position);
                }
                
                if (bodyB.collider) {
                    bodyB.collider.updatePosition(bodyB.position);
                }
            }
            
            // Update ground state if collision normal points mostly upward
            if (normal.y > 0.7 && bodyA === this.engine.player?.physicsBody) {
                bodyA.onGround = true;
            }
            return;
        }
        
        // Fallback to simple sphere collision
        const normal = bodyA.position.clone().sub(bodyB.position).normalize();
        
        // Calculate relative velocity
        const relativeVelocity = new Vector3();
        relativeVelocity.copy(bodyA.velocity || new Vector3());
        if (bodyB.velocity) {
            relativeVelocity.sub(bodyB.velocity);
        }
        
        const velAlongNormal = relativeVelocity.dot(normal);
        
        // Only resolve if objects are moving toward each other
        if (velAlongNormal > 0) return;
        
        // Calculate impulse scalar
        const e = Math.min(
            bodyA.restitution || 0.3,
            bodyB.restitution || 0.3
        );
        const j = -(1 + e) * velAlongNormal;
        const invMassSum = (bodyA.invMass || 0) + (bodyB.invMass || 0);
        
        if (invMassSum === 0) return; // Both static
        
        const impulse = j / invMassSum;
        const impulseVec = normal.clone().multiplyScalar(impulse);
        
        // Apply impulse
        if (bodyA.velocity && bodyA.invMass > 0) {
            bodyA.velocity.add(impulseVec.clone().multiplyScalar(bodyA.invMass));
        }
        
        if (bodyB.velocity && bodyB.invMass > 0) {
            bodyB.velocity.sub(impulseVec.clone().multiplyScalar(bodyB.invMass));
        }
        
        // Correct position (prevent sinking)
        const minDist = (bodyA.radius || 0.5) + (bodyB.radius || 0.5);
        const dist = bodyA.position.distanceTo(bodyB.position);
        const correction = Math.max(minDist - dist, 0) * 0.8; // More aggressive correction
        
        if (correction > 0) {
            const correctionVec = normal.clone().multiplyScalar(correction);
            const corrA = correctionVec.clone().multiplyScalar(bodyA.invMass / invMassSum);
            const corrB = correctionVec.clone().multiplyScalar(bodyB.invMass / invMassSum);
            
            if (bodyA.invMass > 0) {
                bodyA.position.add(corrA);
                if (bodyA.collider) {
                    bodyA.collider.updatePosition(bodyA.position);
                }
            }
            
            if (bodyB.invMass > 0) {
                bodyB.position.sub(corrB);
                if (bodyB.collider) {
                    bodyB.collider.updatePosition(bodyB.position);
                }
            }
        }
        
        // Update ground state
        if (normal.y > 0.7 && bodyA === this.engine.player?.physicsBody) {
            bodyA.onGround = true;
        }
    }
}