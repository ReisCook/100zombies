// src/camera/CameraEffects.js
import { Vector3, MathUtils } from 'three';

export class CameraEffects {
    constructor(playerCamera) {
        this.playerCamera = playerCamera;
        this.camera = playerCamera.camera;
        this.player = playerCamera.player;
        
        // Head bob parameters
        this.bobFrequency = 2.0; // Oscillations per second
        this.bobAmplitude = 0.07; // Max height of bobbing
        this.bobXAmount = 0.6; // Horizontal bobbing multiplier
        this.bobPhase = 0; // Current phase of bobbing
        
        // Tilt parameters
        this.tiltAmount = 0.05; // Max tilt in radians
        this.tiltSpeed = 5.0; // Tilt adjustment speed
        this.currentTilt = 0; // Current tilt amount
        
        // FOV parameters
        this.baseFOV = this.camera.fov;
        this.sprintFOVMultiplier = 1.1; // 10% increase when sprinting
        this.fovAdjustSpeed = 5.0; // FOV adjustment speed
        
        // Offsets
        this.bobOffset = new Vector3();
        this.tiltOffset = 0;
    }
    
    update(deltaTime) {
        this.updateHeadBob(deltaTime);
        this.updateTilt(deltaTime);
        this.updateFOV(deltaTime);
        
        // Apply all effects
        this.applyEffects();
    }
    
    updateHeadBob(deltaTime) {
        // Only bob when moving on ground
        const isMoving = this.player.velocity.lengthSq() > 0.5;
        const isGrounded = this.player.onGround;
        
        if (isMoving && isGrounded) {
            // Calculate bob speed factor based on movement speed
            const horizSpeed = new Vector3(
                this.player.velocity.x, 
                0, 
                this.player.velocity.z
            ).length();
            
            const speedFactor = Math.min(horizSpeed / 5.0, 2.0);
            
            // Update bob phase
            this.bobPhase += this.bobFrequency * speedFactor * deltaTime;
            
            // Calculate vertical and horizontal offset
            const yOffset = Math.sin(this.bobPhase * Math.PI * 2) * this.bobAmplitude;
            const xOffset = Math.sin(this.bobPhase * Math.PI * 2 * 0.5) * this.bobAmplitude * this.bobXAmount;
            
            // Apply bob offset
            this.bobOffset.set(xOffset, yOffset, 0);
        } else {
            // Smoothly reset bobbing when not moving or in air
            this.bobOffset.lerp(new Vector3(0, 0, 0), Math.min(deltaTime * 10, 1.0));
            
            // Reset phase when bob is minimal
            if (this.bobOffset.lengthSq() < 0.0001) {
                this.bobPhase = 0;
            }
        }
    }
    
    updateTilt(deltaTime) {
        // Calculate target tilt based on horizontal acceleration
        const lateralAccel = this.player.moveInput.x;
        const targetTilt = -lateralAccel * this.tiltAmount;
        
        // Smoothly adjust current tilt to target
        this.tiltOffset = MathUtils.lerp(
            this.tiltOffset, 
            targetTilt, 
            Math.min(deltaTime * this.tiltSpeed, 1.0)
        );
    }
    
    updateFOV(deltaTime) {
        // Calculate target FOV based on sprint state
        const targetFOV = this.player.isSprinting ? 
            this.baseFOV * this.sprintFOVMultiplier : this.baseFOV;
        
        // Smoothly adjust FOV
        this.camera.fov = MathUtils.lerp(
            this.camera.fov,
            targetFOV,
            Math.min(deltaTime * this.fovAdjustSpeed, 1.0)
        );
        
        // Update projection matrix
        this.camera.updateProjectionMatrix();
    }
    
    applyEffects() {
        // Apply bob offset to camera position
        this.camera.position.add(this.bobOffset);
        
        // Apply tilt (rotation around Z axis)
        this.camera.rotation.z = this.tiltOffset;
    }
}