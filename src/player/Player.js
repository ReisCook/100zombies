// src/player/Player.js
import { Vector3, Euler } from 'three';
import { Movement } from './Movement.js';
import { PhysicsBody } from '../physics/PhysicsBody.js';
import { WeaponManager } from '../weapons/WeaponManager.js';
import { InteractionSystem } from './InteractionSystem.js';

export class Player {
    constructor(engine) {
        this.engine = engine;
        
        // Player state
        this.position = new Vector3(0, 2, 0);
        this.velocity = new Vector3();
        this.viewRotation = new Euler(0, 0, 0, 'YXZ'); // YXZ for FPS
        this.moveInput = new Vector3(); // Desired movement direction
        this.isJumping = false;
        this.isSprinting = false;
        this.jumpCount = 0;
        this.maxJumps = engine.config.maxJumps || 2; // For double jump
        this.onGround = false;
        this.lastJumpTime = 0; // Track jump cooldown
        this.jumpRequested = false; // Flag for jump button press
        this.jumpBufferTime = 0; // Time when jump was requested
        this.jumpBufferWindow = 200; // Jump buffer window in ms
        this.coyoteTime = 150; // Coyote time in ms
        this.lastGroundedTime = 0; // Last time player was on ground
        
        // Health system
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        this.lastDamageTime = 0;
        this.invulnerabilityDuration = 500; // ms of invulnerability after damage
        
        // Mark as player entity for entity manager
        this.isPlayer = true;
        
        // Player physics body
        this.physicsBody = new PhysicsBody({
            position: this.position.clone(),
            mass: 75, // kg
            radius: 0.5, // Collision radius
            restitution: 0.0, // No bounce 
            friction: 0.1, // Low friction for smooth movement
            usesGravity: true
        });
        
        // Add physics body to world
        this.engine.physics.addBody(this.physicsBody);
        
        // Create movement controller
        this.movement = new Movement(this);
        
        // Create weapon manager
        this.weaponManager = new WeaponManager(this);
        
        // Create interaction system
        this.interactionSystem = new InteractionSystem(this);
        
        // Mouse sensitivity
        this.mouseSensitivity = this.engine.config.mouseSpeed || 0.002;
        
        // Setup input bindings
        this.setupInputBindings();
    }
    
    setupInputBindings() {
        const input = this.engine.input;
        
        // Mouse movement for camera
        input.onMouseMove((dx, dy) => {
            this.rotate(dx, dy);
        });
        
        // WASD movement - Responsive key handling
        input.onKeyDown('KeyW', () => { this.moveInput.z = -1; });
        input.onKeyUp('KeyW', () => { this.moveInput.z = 0; });
        
        input.onKeyDown('KeyS', () => { this.moveInput.z = 1; });
        input.onKeyUp('KeyS', () => { this.moveInput.z = 0; });
        
        input.onKeyDown('KeyA', () => { this.moveInput.x = -1; });
        input.onKeyUp('KeyA', () => { this.moveInput.x = 0; });
        
        input.onKeyDown('KeyD', () => { this.moveInput.x = 1; });
        input.onKeyUp('KeyD', () => { this.moveInput.x = 0; });
        
        // Jump - sets a flag and records time for buffer
        input.onKeyDown('Space', () => { 
            this.jumpRequested = true;
            this.jumpBufferTime = performance.now();
        });
        
        // Sprint
        input.onKeyDown('ShiftLeft', () => { this.isSprinting = true; });
        input.onKeyUp('ShiftLeft', () => { this.isSprinting = false; });
        
        // Toggle debug mode
        input.onKeyDown('F3', () => { this.engine.debug.toggle(); });
    }
    
    rotate(dx, dy) {
        // Update camera rotation with mouse input
        this.viewRotation.y -= dx * this.mouseSensitivity;
        this.viewRotation.x -= dy * this.mouseSensitivity;
        
        // Clamp vertical rotation to prevent over-rotation
        this.viewRotation.x = Math.max(
            -Math.PI / 2 + 0.01, 
            Math.min(Math.PI / 2 - 0.01, this.viewRotation.x)
        );
    }
    
    processJump() {
        const currentTime = performance.now();
        
        // Check if we're within coyote time (recently left ground)
        const inCoyoteTime = currentTime - this.lastGroundedTime < this.coyoteTime;
        const canFirstJump = this.onGround || inCoyoteTime;
        
        // Don't allow jump spam - small cooldown between jumps
        if (currentTime - this.lastJumpTime < 100) {
            return false;
        }
        
        // Check if we can jump based on ground state and jump count
        if (canFirstJump && this.jumpCount === 0) {
            // First jump - apply force and forward boost
            this.physicsBody.velocity.y = this.movement.jumpForce;
            this.jumpCount = 1;
            this.lastJumpTime = currentTime;
            
            // Apply jump boost via movement
            this.movement.applyJumpBoost();
            return true;
        } 
        else if (!canFirstJump && this.jumpCount < this.maxJumps) {
            // Double jump in air
            this.physicsBody.velocity.y = this.movement.jumpForce * 0.9; // Slightly weaker second jump
            this.jumpCount++;
            this.lastJumpTime = currentTime;
            return true;
        }
        
        return false;
    }
    
    takeDamage(amount) {
        const currentTime = performance.now();
        
        // Check if player is invulnerable
        if (currentTime - this.lastDamageTime < this.invulnerabilityDuration) {
            return;
        }
        
        // Check if player is already dead
        if (this.isDead) return;
        
        // Apply damage
        this.health -= amount;
        this.lastDamageTime = currentTime;
        
        console.log(`Player took ${amount} damage. Health: ${this.health}/${this.maxHealth}`);
        
        // Update UI
        this.updateHealthUI();
        
        // Check if player died
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }
    
    heal(amount) {
        if (this.isDead) return;
        
        this.health = Math.min(this.health + amount, this.maxHealth);
        console.log(`Player healed ${amount}. Health: ${this.health}/${this.maxHealth}`);
        
        // Update UI
        this.updateHealthUI();
    }
    
    updateHealthUI() {
        // You would implement UI updates here
        // For example:
        // const healthBar = document.getElementById('health-bar');
        // if (healthBar) {
        //     healthBar.style.width = `${(this.health / this.maxHealth) * 100}%`;
        // }
    }
    
    die() {
        if (this.isDead) return;
        
        this.isDead = true;
        console.log("Player died!");
        
        // Disable movement
        this.moveInput.set(0, 0, 0);
        
        // Here you would trigger game over screen or respawn logic
        // For now, just respawn after a delay
        setTimeout(() => {
            this.respawn();
        }, 3000);
    }
    
    respawn() {
        // Reset player state
        this.health = this.maxHealth;
        this.isDead = false;
        
        // Move to spawn position (you could get this from map data)
        this.position.set(0, 2, 0);
        this.physicsBody.position.copy(this.position);
        this.physicsBody.velocity.set(0, 0, 0);
        
        // Update UI
        this.updateHealthUI();
        
        console.log("Player respawned");
    }
    
    equipWeapon(weapon) {
        this.weaponManager.addWeapon(weapon);
    }
    
    update(deltaTime) {
        const currentTime = performance.now();
        
        // Don't update if dead
        if (this.isDead) return;
        
        // Update physics state from physics body
        this.position.copy(this.physicsBody.position);
        this.velocity.copy(this.physicsBody.velocity);
        
        // Track ground state for coyote time
        const wasOnGround = this.onGround;
        this.onGround = this.physicsBody.onGround;
        
        // If just landed, record time and reset jump count
        if (this.onGround && !wasOnGround) {
            this.jumpCount = 0;
        }
        
        // If just left ground, record the time for coyote time
        if (!this.onGround && wasOnGround) {
            this.lastGroundedTime = currentTime;
        }
        
        // Process jump with buffer window
        if (this.jumpRequested) {
            const jumpBuffer = (currentTime - this.jumpBufferTime < this.jumpBufferWindow);
            
            if (jumpBuffer) {
                const jumpSucceeded = this.processJump();
                if (jumpSucceeded) {
                    this.jumpRequested = false;
                }
            } else {
                // Jump buffer expired
                this.jumpRequested = false;
            }
        }
        
        // Update movement based on input
        this.movement.update(deltaTime);
        
        // Update weapon manager
        this.weaponManager.update(deltaTime);
        
        // Update interaction system
        this.interactionSystem.update();
    }
}