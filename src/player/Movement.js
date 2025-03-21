// src/player/Movement.js
import { Vector3, Quaternion, Euler } from 'three';

export class Movement {
    constructor(player) {
        this.player = player;
        this.engine = player.engine;
        
        // Movement parameters - AAA FPS values
        this.walkSpeed = 6.0; // Base speed
        this.runSpeed = 10.0; // Sprint speed
        this.maxSpeed = 12.0; // Cap for absolute maximum speed
        
        // High initial acceleration for responsive feel
        this.groundAcceleration = 150.0; // Very high for instant response
        this.airAcceleration = 20.0; // Good air control
        
        // Deceleration settings
        this.stopAcceleration = 200.0; // Very high deceleration when no input (Apex-like stop)
        this.groundFriction = 8.0; // Higher friction for quicker stops
        this.airFriction = 0.1; // Minimal air friction
        
        // Directional change handling - reduced momentum retention
        this.momentumRetention = 0.5; // Keep only 50% momentum when changing direction
        this.dirChangeBoostMultiplier = 3.0; // Boost for direction changes
        
        // Jump parameters
        this.jumpForce = 7.5; // Higher jump
        this.jumpBoostForward = 0.2; // Small forward boost when jumping
        
        // Air control - Higher value allows better control while airborne
        this.airControl = 0.9; // Almost full control in air
        
        // Movement vectors
        this.moveDirection = new Vector3();
        this.targetVelocity = new Vector3();
        this.lastMoveInput = new Vector3();
        this.lastDirection = new Vector3();
        this.lastSpeed = 0;
        
        // Movement state tracking
        this.directionChangeTime = 0;
        this.hasChangedDirection = false;
        this.directionChangeThreshold = 0.85; // Cosine of angle threshold for direction change
    }
    
    update(deltaTime) {
        // Get movement input
        const moveInput = this.player.moveInput.clone();
        const hasInput = moveInput.lengthSq() > 0;
        
        if (hasInput) {
            // Handle active movement
            // Normalize input if needed
            if (moveInput.lengthSq() > 1) {
                moveInput.normalize();
            }
            
            // Calculate movement direction in world space
            this.calculateMoveDirection(moveInput);
            
            // Check for significant direction change
            this.detectDirectionChange();
            
            // Calculate target velocity with speed
            const speed = this.player.isSprinting ? this.runSpeed : this.walkSpeed;
            this.targetVelocity.copy(this.moveDirection).multiplyScalar(speed);
            
            // Apply acceleration with momentum preservation
            this.applyAccelerationWithMomentum(deltaTime);
        } else {
            // Apply stronger deceleration when no input - Apex-like quick stop
            this.applyStopForce(deltaTime);
        }
        
        // Save last values for next frame
        this.lastMoveInput.copy(moveInput);
        if (this.moveDirection.lengthSq() > 0) {
            this.lastDirection.copy(this.moveDirection);
        }
        this.lastSpeed = this.player.physicsBody.velocity.length();
    }
    
    calculateMoveDirection(moveInput) {
        // Create rotation quaternion from player view rotation (only Y axis)
        const rotation = new Quaternion().setFromEuler(
            new Euler(0, this.player.viewRotation.y, 0)
        );
        
        // Calculate forward and right vectors
        const forward = new Vector3(0, 0, -1).applyQuaternion(rotation);
        const right = new Vector3(1, 0, 0).applyQuaternion(rotation);
        
        // Zero out Y component and normalize
        forward.y = 0;
        right.y = 0;
        
        if (forward.lengthSq() > 0) forward.normalize();
        if (right.lengthSq() > 0) right.normalize();
        
        // Combine input with movement vectors
        this.moveDirection.set(0, 0, 0);
        this.moveDirection.addScaledVector(forward, -moveInput.z);
        this.moveDirection.addScaledVector(right, moveInput.x);
        
        // Normalize if necessary
        if (this.moveDirection.lengthSq() > 0) {
            this.moveDirection.normalize();
        }
    }
    
    detectDirectionChange() {
        // Skip if we don't have a previous direction
        if (this.lastDirection.lengthSq() === 0) {
            this.hasChangedDirection = false;
            return;
        }
        
        // Dot product to find angle between directions
        const dotProduct = this.lastDirection.dot(this.moveDirection);
        
        // If directions differ significantly (wide angle)
        if (dotProduct < this.directionChangeThreshold) {
            this.hasChangedDirection = true;
            this.directionChangeTime = performance.now();
        } else {
            // Direction change expires after 100ms
            this.hasChangedDirection = this.hasChangedDirection && 
                (performance.now() - this.directionChangeTime < 100);
        }
    }
    
    applyAccelerationWithMomentum(deltaTime) {
        // Current horizontal velocity
        const currentVelocity = new Vector3(
            this.player.physicsBody.velocity.x,
            0,
            this.player.physicsBody.velocity.z
        );
        
        // Current speed on horizontal plane
        const currentSpeed = currentVelocity.length();
        
        // If we're changing direction, preserve some of the momentum
        let newVelocity = new Vector3();
        
        if (this.hasChangedDirection && currentSpeed > 2.0) {
            // Momentum preservation - keep percentage of current velocity
            newVelocity.copy(currentVelocity).multiplyScalar(this.momentumRetention);
            
            // Add some of the target velocity
            const targetContributionFactor = 1.0 - this.momentumRetention;
            newVelocity.addScaledVector(this.targetVelocity, targetContributionFactor);
        } else {
            // Calculate normal acceleration
            let accel = this.player.onGround ? this.groundAcceleration : this.airAcceleration;
            
            // Boost acceleration for initial movement and direction changes
            if (currentSpeed < 2.0 || this.hasChangedDirection) {
                accel *= this.dirChangeBoostMultiplier;
            }
            
            // Air control factor
            if (!this.player.onGround) {
                accel *= this.airControl;
            }
            
            // Calculate velocity delta
            const velocityDelta = new Vector3().subVectors(this.targetVelocity, currentVelocity);
            
            // Apply acceleration with deltaTime
            velocityDelta.multiplyScalar(Math.min(accel * deltaTime, 1.0));
            
            // Add to current velocity
            newVelocity.addVectors(currentVelocity, velocityDelta);
        }
        
        // Limit maximum horizontal speed
        const newSpeed = newVelocity.length();
        if (newSpeed > this.maxSpeed) {
            newVelocity.multiplyScalar(this.maxSpeed / newSpeed);
        }
        
        // Apply to physics body (only X and Z)
        this.player.physicsBody.velocity.x = newVelocity.x;
        this.player.physicsBody.velocity.z = newVelocity.z;
        
        // Add small forward boost when jumping
        if (this.player.isJumping && this.player.jumpCount === 1) {
            const forwardBoost = new Vector3().copy(this.moveDirection)
                .multiplyScalar(this.jumpBoostForward * this.walkSpeed);
            this.player.physicsBody.velocity.x += forwardBoost.x;
            this.player.physicsBody.velocity.z += forwardBoost.z;
            this.player.isJumping = false; // Reset flag after applying boost
        }
    }
    
    /**
     * Applies a strong stopping force when no input is given (Apex-like quick stop)
     */
    applyStopForce(deltaTime) {
        const velocity = this.player.physicsBody.velocity;
        const horizontalVelocity = new Vector3(velocity.x, 0, velocity.z);
        const speed = horizontalVelocity.length();
        
        // If barely moving, just zero out velocity
        if (speed < 0.1) {
            velocity.x = 0;
            velocity.z = 0;
            return;
        }
        
        // Calculate stopping acceleration (stronger on ground than in air)
        const stopAccel = this.player.onGround ? 
            this.stopAcceleration : this.stopAcceleration * 0.2;
        
        // Calculate how much velocity to remove this frame
        // Deceleration formula: min(velocity, decelRate * dt)
        const deceleration = Math.min(speed, stopAccel * deltaTime);
        
        // Calculate normalized velocity direction
        const direction = horizontalVelocity.clone().normalize();
        
        // Apply deceleration in the opposite direction of movement
        velocity.x -= direction.x * deceleration;
        velocity.z -= direction.z * deceleration;
    }
    
    applyFriction(deltaTime) {
        // Only called when there is movement input, so use lower friction
        
        // Skip if not moving
        const velocity = this.player.physicsBody.velocity;
        const horizontalVelocity = new Vector3(velocity.x, 0, velocity.z);
        const speed = horizontalVelocity.length();
        
        if (speed < 0.1) {
            velocity.x = 0;
            velocity.z = 0;
            return;
        }
        
        // Reduced friction when there's intentional movement
        const frictionMultiplier = 0.3; // Only 30% of normal friction
        
        // Calculate appropriate friction
        let friction = this.player.onGround ? 
            this.groundFriction * frictionMultiplier : 
            this.airFriction;
        
        // Apply friction as a damping factor
        const damping = Math.max(0, 1 - friction * deltaTime);
        
        velocity.x *= damping;
        velocity.z *= damping;
    }
    
    // Allow jump to add forward momentum
    applyJumpBoost() {
        if (this.moveDirection.lengthSq() > 0 && this.player.onGround) {
            this.player.isJumping = true;
        }
    }
}
