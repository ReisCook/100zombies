// src/entities/Zombie.js
import { 
    Vector3, AnimationMixer, Clock, Euler, Quaternion,
    MeshStandardMaterial, Color, BoxGeometry, Mesh, Group,
    SkeletonHelper, AnimationClip
} from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { PhysicsBody } from '../physics/PhysicsBody.js';

// Import Three.js constants for animation
const LoopOnce = 2200; // THREE.LoopOnce
const LoopRepeat = 2201; // THREE.LoopRepeat

export class Zombie {
// src/entities/Zombie.js (modified constructor to accept properties)
    constructor(engine, position = new Vector3(0, 0, 0), properties = {}) {
        // Core properties
        this.engine = engine;
        this.type = 'zombie';
        this.zombieType = properties.type || 'standard';
        this.id = null; // Will be assigned by EntityManager
        this.position = position.clone();
        this.rotation = new Euler(0, 0, 0);
        this.quaternion = new Quaternion();
        this.enabled = true;
        this.isAlive = true;
        
        // Physics body implementation
        this.physicsBody = new PhysicsBody({
            position: this.position.clone(),
            mass: 70,
            radius: 0.5,
            restitution: 0.2,
            friction: 0.5
        });
        
        // State management for chasing
        this.state = 'idle';
        this.lastStateChangeTime = 0;
        this.timeInCurrentState = 0;
        this.timeSinceSpawn = 0;
        
        // Movement properties - can be overridden by properties
        this.speed = { 
            walk: properties.speed ? properties.speed * 0.6 : 2.0, 
            run: properties.speed || 3.0 
        };
        this.currentSpeed = 0;
        this.moveDirection = new Vector3();
        this.turnSpeed = 4.0;
        
        // Player tracking
        this.canSeePlayer = false;
        this.detectionRange = properties.detectionRange || 15;
        this.updatePerceptionTime = 0;
        this.perceptionUpdateRate = 0.2;
        this.lastKnownPlayerPosition = null;
        
        // Combat properties
        this.health = properties.health || 100;
        this.maxHealth = properties.health || 100;
        this.attackRange = 1.8;
        this.attackCooldown = 1.2;
        this.attackDamage = properties.damage || 20;
        this.lastAttackTime = 0;
        
        // Animation properties
        this.object = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        this.animationSpeed = 1.0;
        this.skeletonHelper = null;
        
        // Performance optimization properties
        this.updatePriority = 'high'; 
        this.skipAnimationWhenFar = false;
        this.farDistance = 50;
        this.skipPhysicsWhenVeryFar = false;
        this.veryFarDistance = 80;
        this.useLOD = false;
        
        // Bone references
        this.bones = {};
        
        // Debug properties
        this.debugMode = false;
        
        console.log(`${this.zombieType} zombie created at`, position.x, position.y, position.z);
    }
    
    async init(engine) {
        // Store engine reference if passed
        if (engine) this.engine = engine;
        
        console.log("Zombie: Initializing...");
        
        // Add physics body to world
        if (this.engine.physics) {
            this.engine.physics.addBody(this.physicsBody);
        }
        
        // Load zombie model and animations
        await this.loadModel();
        
        // Apply performance optimizations
        this.optimizeForLargeNumbers();
        
        // Initial state
        this.changeState('idle');
        
        return this;
    }
    
    /**
     * Optimize zombie for performance in large numbers
     */
    optimizeForLargeNumbers() {
        // Reduce update frequency based on distance from player
        this.updatePriority = 'low'; // Can be 'high', 'medium', 'low'
        
        // Skip animation updates when far from player
        this.skipAnimationWhenFar = true;
        this.farDistance = 50; // Units of distance to consider "far"
        
        // Skip physics updates when very far
        this.skipPhysicsWhenVeryFar = true;
        this.veryFarDistance = 80;
        
        // Define level of detail (LOD) for rendering
        this.useLOD = true;
    }
    
    async loadModel() {
        try {
            // Get zombie model from asset manager
            const zombieModel = this.engine.assetManager.getModel('zombie');
            
            if (!zombieModel) {
                console.error("Zombie model not found!");
                this.createDebugMesh();
                return;
            }
            
            // Clone model with skeleton
            this.object = skeletonClone(zombieModel);
            
            // Set scale and position
            this.object.scale.set(0.01, 0.01, 0.01);
            this.object.position.copy(this.position);
            
            // Setup animation mixer
            this.mixer = new AnimationMixer(this.object);
            
            // Map animations from asset manager
            this.mapAnimations();
            
            // Find and cache bone references
            this.findBones();
            
            // Create skeleton helper if in debug mode
            if (this.debugMode) {
                this.skeletonHelper = new SkeletonHelper(this.object);
                this.engine.renderer.scene.add(this.skeletonHelper);
            }
            
            // Add to scene
            this.engine.renderer.scene.add(this.object);
            
        } catch (error) {
            console.error("Failed to load zombie model:", error);
            this.createDebugMesh();
        }
    }
    
    mapAnimations() {
        // Animation mapping
        const animationMap = {
            'idle': 'idle',
            'walk': 'walk',
            'run': 'run',
            'attack': 'attack',
            'death': 'death',
            'scream': 'scream'
        };
        
        // Get animations from asset manager
        for (const [animId, animName] of Object.entries(animationMap)) {
            const anim = this.engine.assetManager.getAnimation(animId);
            if (anim) {
                this.animations[animName] = anim;
            }
        }
    }
    
    findBones() {
        this.bones = {};
        
        // Find important bones by name
        this.object.traverse(node => {
            if (node.isBone || node.type === 'Bone') {
                const name = node.name.toLowerCase();
                
                // Store all bones by name
                this.bones[node.name] = node;
                
                // Also categorize key bones
                if (name.includes('head')) {
                    this.bones.head = node;
                } else if (name.includes('spine')) {
                    this.bones.spine = node;
                } else if (name.includes('left') && name.includes('arm')) {
                    this.bones.leftArm = node;
                } else if (name.includes('right') && name.includes('arm')) {
                    this.bones.rightArm = node;
                } else if (name.includes('left') && name.includes('leg')) {
                    this.bones.leftLeg = node;
                } else if (name.includes('right') && name.includes('leg')) {
                    this.bones.rightLeg = node;
                }
            }
        });
    }
    
    createDebugMesh() {
        // Create simple colored mesh as fallback
        const bodyGeo = new BoxGeometry(0.5, 1.0, 0.3);
        const headGeo = new BoxGeometry(0.3, 0.3, 0.3);
        const limbGeo = new BoxGeometry(0.15, 0.5, 0.15);
        
        const material = new MeshStandardMaterial({ color: new Color(0x00aa00) });
        
        this.object = new Group();
        this.object.position.copy(this.position);
        
        // Body parts
        const body = new Mesh(bodyGeo, material);
        body.position.y = 0.5;
        this.object.add(body);
        
        const head = new Mesh(headGeo, material);
        head.position.y = 1.15;
        this.object.add(head);
        
        const leftArm = new Mesh(limbGeo, material);
        leftArm.position.set(-0.325, 0.5, 0);
        this.object.add(leftArm);
        
        const rightArm = new Mesh(limbGeo, material);
        rightArm.position.set(0.325, 0.5, 0);
        this.object.add(rightArm);
        
        const leftLeg = new Mesh(limbGeo, material);
        leftLeg.position.set(-0.2, -0.25, 0);
        this.object.add(leftLeg);
        
        const rightLeg = new Mesh(limbGeo, material);
        rightLeg.position.set(0.2, -0.25, 0);
        this.object.add(rightLeg);
        
        // Add to scene and create dummy mixer
        this.engine.renderer.scene.add(this.object);
        this.mixer = new AnimationMixer(this.object);
    }
    
    playAnimation(name, loop = true, speedFactor = 1.0) {
        // Skip if no mixer
        if (!this.mixer) return;
        
        // Process animation name
        let actualName = name;
        
        // Handle missing animations with fallbacks
        if (name === 'idle' && !this.animations['idle']) {
            actualName = 'walk';
            speedFactor = 0.25;
        }
        else if (name === 'chase' && !this.animations['chase']) {
            actualName = 'walk';
            speedFactor = 1.2;
        }
        else if (name === 'run' && !this.animations['run']) {
            actualName = 'walk';
            speedFactor = 1.5;
        }
        
        let clip = this.animations[actualName];
        
        // Try walk as fallback
        if (!clip) {
            actualName = 'walk';
            clip = this.animations['walk'];
            
            if (!clip) return;
        }
        
        // Stop current animation
        if (this.currentAnimation) {
            this.currentAnimation.fadeOut(0.2);
        }
        
        // Create and play new animation
        const action = this.mixer.clipAction(clip);
        action.reset();
        action.loop = loop ? LoopRepeat : LoopOnce;
        action.clampWhenFinished = !loop;
        action.timeScale = speedFactor;
        action.fadeIn(0.2);
        action.play();
        
        this.currentAnimation = action;
    }
    
    update(deltaTime) {
        if (!this.enabled || !this.isAlive) return;
        
        // Update timers
        this.timeSinceSpawn += deltaTime;
        this.timeInCurrentState += deltaTime;
        
        // Get distance to player for optimization
        const player = this.engine.player;
        const distanceToPlayer = player ? this.position.distanceTo(player.position) : Infinity;
        
        // Performance optimization for far zombies
        if (this.skipAnimationWhenFar && distanceToPlayer > this.farDistance) {
            // Skip animation updates for distant zombies
            // But still update state machine at reduced frequency
            if (this.timeSinceSpawn % 3 < 0.1) { // Only update every ~3 seconds
                this.updatePerception(deltaTime);
                this.processStateMachine(deltaTime);
            }
        } else {
            // Normal updates for nearby zombies
            // Update animations
            if (this.mixer) {
                this.mixer.update(deltaTime * this.animationSpeed);
            }
            
            // Update perception (can see player, etc)
            this.updatePerception(deltaTime);
            
            // State machine processing
            this.processStateMachine(deltaTime);
        }
        
        // Skip physics for very distant zombies
        if (this.skipPhysicsWhenVeryFar && distanceToPlayer > this.veryFarDistance) {
            // No physics updates for very distant zombies
        } else {
            // Update position from physics
            if (this.physicsBody) {
                this.position.copy(this.physicsBody.position);
            }
        }
        
        // Always update visual position
        if (this.object) {
            this.object.position.copy(this.position);
            this.object.rotation.y = this.rotation.y;
        }
    }
    
    processStateMachine(deltaTime) {
        // State transitions - can see player should trigger chase
        if (this.state === 'idle' && this.canSeePlayer) {
            this.changeState('chase');
        }
        
        // Process current state
        switch (this.state) {
            case 'idle':
                this.processIdleState(deltaTime);
                break;
                
            case 'chase':
                this.processChaseState(deltaTime);
                break;
                
            case 'attack':
                this.processAttackState(deltaTime);
                break;
                
            case 'death':
                // No movement in death state
                break;
        }
    }
    
    processIdleState(deltaTime) {
        // Simple idle behavior - slight movement/looking around
        if (Math.random() < 0.01) {
            // Random small rotation
            this.rotation.y += (Math.random() - 0.5) * 0.5;
        }
        
        // Play idle animation
        if (!this.currentAnimation || this.currentAnimation._clip.name !== 'idle') {
            this.playAnimation('idle');
        }
    }
    
    processChaseState(deltaTime) {
        // Get player position
        const player = this.engine.player;
        if (!player) return;
        
        // Store last known position when visible
        if (this.canSeePlayer) {
            this.lastKnownPlayerPosition = player.position.clone();
        }
        
        // Move toward player
        if (this.lastKnownPlayerPosition) {
            // Check if close enough to attack
            const distanceToPlayer = this.position.distanceTo(player.position);
            
            if (distanceToPlayer <= this.attackRange) {
                this.changeState('attack');
                return;
            }
            
            // Calculate move direction
            const moveDirection = new Vector3()
                .subVectors(player.position, this.position)
                .normalize();
                
            // Calculate target rotation (only Y axis)
            const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
            
            // Smooth rotation toward player
            let currentRotation = this.rotation.y;
            while (currentRotation > Math.PI) currentRotation -= Math.PI * 2;
            while (currentRotation < -Math.PI) currentRotation += Math.PI * 2;
            
            let targetRotNormalized = targetRotation;
            while (targetRotNormalized > Math.PI) targetRotNormalized -= Math.PI * 2;
            while (targetRotNormalized < -Math.PI) targetRotNormalized += Math.PI * 2;
            
            // Calculate shortest rotation direction
            let rotDiff = targetRotNormalized - currentRotation;
            if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            
            // Apply rotation with turn speed
            this.rotation.y += rotDiff * Math.min(this.turnSpeed * deltaTime, 1.0);
            
            // Get forward vector based on current rotation
            const forward = new Vector3(
                Math.sin(this.rotation.y),
                0,
                Math.cos(this.rotation.y)
            );
            
            // Set velocity to move forward
            const chaseSpeed = 3.0; // Adjust speed as needed
            
            if (this.physicsBody) {
                this.physicsBody.velocity.x = forward.x * chaseSpeed;
                this.physicsBody.velocity.z = forward.z * chaseSpeed;
            }
            
            // Play walk/run animation
            if (!this.currentAnimation || 
                (this.currentAnimation._clip.name !== 'walk' && 
                 this.currentAnimation._clip.name !== 'run')) {
                this.playAnimation('walk', true, 1.2);
            }
        }
        
        // If lost track of player for too long, go back to idle
        if (!this.canSeePlayer && this.timeInCurrentState > 8.0) {
            this.changeState('idle');
        }
    }
    
    processAttackState(deltaTime) {
        const player = this.engine.player;
        if (!player) return;
        
        // Check distance to player
        const distanceToPlayer = this.position.distanceTo(player.position);
        
        // If player moved away, go back to chase
        if (distanceToPlayer > this.attackRange * 1.2) {
            this.changeState('chase');
            return;
        }
        
        // Face the player
        this.lookAt(player.position);
        
        // Execute attack with cooldown
        if (this.timeSinceSpawn - this.lastAttackTime > this.attackCooldown) {
            // Play attack animation
            this.playAnimation('attack', false);
            
            // Deal damage at appropriate time in animation (after 0.5s)
            setTimeout(() => {
                if (this.state === 'attack' && player.takeDamage && 
                    this.position.distanceTo(player.position) <= this.attackRange) {
                    player.takeDamage(20, this);
                }
            }, 500);
            
            this.lastAttackTime = this.timeSinceSpawn;
            
            // Return to chase after attack completes
            setTimeout(() => {
                if (this.state === 'attack') {
                    this.changeState('chase');
                }
            }, 1200);
        }
    }
    
    // Check if zombie can see player
    updatePerception(deltaTime) {
        // Only update perception periodically
        this.updatePerceptionTime -= deltaTime;
        if (this.updatePerceptionTime <= 0) {
            this.updatePerceptionTime = this.perceptionUpdateRate;
            
            // Reset perception
            const previouslyCouldSeePlayer = this.canSeePlayer;
            this.canSeePlayer = false;
            
            // Get player
            const player = this.engine.player;
            if (!player) return;
            
            // Check distance to player
            const distanceToPlayer = this.position.distanceTo(player.position);
            
            // If within detection range, can see player
            if (distanceToPlayer <= this.detectionRange) {
                // Simple line of sight check (no obstacles for simplicity)
                this.canSeePlayer = true;
                
                // If just spotted player, react
                if (!previouslyCouldSeePlayer && this.state === 'idle') {
                    this.onPlayerSpotted();
                }
            }
        }
    }
    
    onPlayerSpotted() {
        // React to seeing player - change state to chase
        this.changeState('chase');
    }
    
    // Look at a target position
    lookAt(targetPos) {
        // Calculate direction to target (XZ plane only)
        const direction = new Vector3()
            .subVectors(targetPos, this.position)
            .setY(0)
            .normalize();
            
        // Set rotation based on direction
        this.rotation.y = Math.atan2(direction.x, direction.z);
        
        // Update object rotation
        if (this.object) {
            this.object.rotation.y = this.rotation.y;
        }
    }
    
    // Change state with animation transitions
    changeState(newState) {
        if (newState === this.state) return;
        
        const oldState = this.state;
        this.state = newState;
        this.timeInCurrentState = 0;
        
        console.log(`Zombie ${this.id} state: ${oldState} -> ${newState}`);
        
        // State-specific setup
        switch (newState) {
            case 'idle':
                this.playAnimation('idle', true);
                if (this.physicsBody) {
                    this.physicsBody.velocity.set(0, this.physicsBody.velocity.y, 0);
                }
                break;
                
            case 'chase':
                this.playAnimation('walk', true, 1.2);
                break;
                
            case 'attack':
                this.playAnimation('attack', false);
                if (this.physicsBody) {
                    this.physicsBody.velocity.set(0, this.physicsBody.velocity.y, 0);
                }
                break;
                
            case 'death':
                this.playAnimation('death', false);
                this.isAlive = false;
                if (this.physicsBody) {
                    this.physicsBody.velocity.set(0, 0, 0);
                }
                break;
        }
    }
    
    // Handle taking damage
    takeDamage(amount) {
        this.health -= amount;
        
        // Play hit reaction
        if (this.health <= 0 && this.isAlive) {
            this.changeState('death');
        }
    }
    
    // Required method for EntityManager
    destroy() {
        // Remove from scene
        if (this.object) {
            this.engine.renderer.scene.remove(this.object);
        }
        
        if (this.skeletonHelper) {
            this.engine.renderer.scene.remove(this.skeletonHelper);
        }
        
        // Remove physics body
        if (this.physicsBody && this.engine.physics) {
            this.engine.physics.removeBody(this.physicsBody);
        }
        
        // Clear animation data
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
        
        this.animations = {};
        this.currentAnimation = null;
        this.enabled = false;
    }
    
    // For compatibility with EnemyManager
    canSensePlayer() {
        return this.canSeePlayer;
    }
    
    canAttackTarget() {
        if (!this.engine.player) return false;
        
        const distanceToPlayer = this.position.distanceTo(this.engine.player.position);
        return distanceToPlayer <= this.attackRange;
    }
}