// src/weapons/WeaponPickup.js
import { Vector3, BoxGeometry, MeshBasicMaterial, Mesh } from 'three';
import { PhysicsBody } from '../physics/PhysicsBody.js';

export class WeaponPickup {
    constructor(options = {}) {
        this.type = 'weaponPickup';
        this.position = options.position || new Vector3();
        this.weapon = options.weapon;
        this.interactable = true;
        this.interactionDistance = 2.5; // How close player needs to be
        
        // Create visual representation
        this.object = null;
        if (this.weapon && this.weapon.worldModel) {
            this.object = this.weapon.worldModel.clone();
            this.object.position.copy(this.position);
        } else {
            // Fallback if no model exists
            const geometry = new BoxGeometry(0.4, 0.2, 1);
            const material = new MeshBasicMaterial({ color: 0x555555 });
            this.object = new Mesh(geometry, material);
            this.object.position.copy(this.position);
        }
        
        // Create physics body
        this.physicsBody = new PhysicsBody({
            position: this.position,
            mass: 5,
            halfExtents: new Vector3(0.2, 0.1, 0.5),
            restitution: 0.3,
            friction: 0.8
        });
    }
    
    init(engine) {
        this.engine = engine;
        
        // Add physics body to world
        this.engine.physics.addBody(this.physicsBody);
        
        // Add object to scene
        this.engine.renderer.scene.add(this.object);
    }
    
    update(deltaTime) {
        // Update visual position from physics
        this.object.position.copy(this.physicsBody.position);
        
        // Add some rotation to make it more visible
        this.object.rotation.y += deltaTime * 1.0;
    }
    
    interact(player) {
        // Give the weapon to the player
        if (this.weapon) {
            player.equipWeapon(this.weapon);
            
            // Remove pickup from world
            this.engine.entityManager.removeEntity(this);
        }
    }
    
    destroy() {
        // Remove physics body
        if (this.physicsBody) {
            this.engine.physics.removeBody(this.physicsBody);
        }
        
        // Object removal is handled by entity manager
    }
}