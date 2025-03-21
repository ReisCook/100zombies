// src/weapons/Weapon.js
import { Vector3, Quaternion, Object3D, Raycaster } from 'three';
import { RaycastResult } from '../physics/RaycastResult.js';

export class Weapon {
    constructor(options = {}) {
        this.name = options.name || 'Weapon';
        this.model = null;
        this.worldModel = null;
        this.owner = null;
        this.isEquipped = false;
        
        // Position offsets for first-person view
        this.position = options.position || new Vector3(0.3, -0.3, -0.5);
        this.rotation = options.rotation || new Vector3(0, 0, 0);
        
        // Create holder for weapon model
        this.weaponHolder = new Object3D();
        
        // Shooting properties
        this.damage = options.damage || 10;
        this.fireRate = options.fireRate || 10; // Shots per second
        this.fireInterval = 1 / this.fireRate;
        this.lastFireTime = 0;
        this.isFiring = false;
        
        // Ammo
        this.currentAmmo = options.ammoCapacity || 30;
        this.maxAmmo = options.ammoCapacity || 30;
        this.reserveAmmo = options.reserveAmmo || 90;
        this.isReloading = false;
        this.reloadTime = options.reloadTime || 2.0; // seconds
        this.reloadStartTime = 0;
    }
    
    init(engine) {
        this.engine = engine;
    }
    
    loadModel(modelId) {
        const model = this.engine.assetManager.getModel(modelId);
        if (!model) {
            console.error(`Model not found: ${modelId}`);
            return false;
        }
        
        // Clone the model for first person view
        this.model = model.scene.clone();
        
        // Also create a world model for dropped weapon
        this.worldModel = model.scene.clone();
        
        // Add to weapon holder
        this.weaponHolder.add(this.model);
        
        return true;
    }
    
    equip(owner) {
        this.owner = owner;
        this.isEquipped = true;
        
        // Add weapon to camera
        if (this.engine.camera && this.weaponHolder) {
            this.engine.camera.camera.add(this.weaponHolder);
            
            // Position the weapon holder
            this.weaponHolder.position.copy(this.position);
            this.weaponHolder.rotation.set(
                this.rotation.x,
                this.rotation.y,
                this.rotation.z
            );
        }
        
        // Update UI
        this.updateAmmoUI();
    }
    
    unequip() {
        this.isEquipped = false;
        
        // Remove from camera
        if (this.engine.camera && this.weaponHolder) {
            this.engine.camera.camera.remove(this.weaponHolder);
        }
        
        this.owner = null;
    }
    
    startFire() {
        this.isFiring = true;
    }
    
    stopFire() {
        this.isFiring = false;
    }
    
    update(deltaTime) {
        if (!this.isEquipped) return;
        
        // Handle automatic firing
        if (this.isFiring) {
            this.tryFire();
        }
        
        // Handle reloading
        if (this.isReloading) {
            const currentTime = performance.now() / 1000;
            if (currentTime - this.reloadStartTime >= this.reloadTime) {
                this.completeReload();
            }
        }
    }
    
    tryFire() {
        const currentTime = performance.now() / 1000;
        
        // Check if we can fire based on rate of fire
        if (currentTime - this.lastFireTime < this.fireInterval) {
            return false;
        }
        
        // Check if we're reloading
        if (this.isReloading) {
            return false;
        }
        
        // Check if we have ammo
        if (this.currentAmmo <= 0) {
            this.tryReload();
            return false;
        }
        
        // Fire the weapon
        this.fire();
        this.lastFireTime = currentTime;
        
        return true;
    }
    
    fire() {
        // Reduce ammo
        this.currentAmmo--;
        
        // Update UI
        this.updateAmmoUI();
        
        // Create a raycast from camera center
        const camera = this.engine.camera.camera;
        const raycaster = new Raycaster();
        const rayDirection = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        // Origin is camera position
        raycaster.set(camera.position, rayDirection);
        
        // Perform raycast against scene objects
        const intersects = raycaster.intersectObjects(this.engine.renderer.scene.children, true);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Handle hit effects here if needed
            console.log(`Hit object at distance ${hit.distance}`);
            
            // Check if we hit an entity with health
            // This would be expanded in your game with proper damage handling
        }
    }
    
    tryReload() {
        // Don't reload if we're already reloading
        if (this.isReloading) return false;
        
        // Don't reload if we're full on ammo
        if (this.currentAmmo >= this.maxAmmo) return false;
        
        // Don't reload if we have no reserve ammo
        if (this.reserveAmmo <= 0) return false;
        
        // Start reloading
        this.isReloading = true;
        this.reloadStartTime = performance.now() / 1000;
        
        // Update UI to show reloading
        this.updateAmmoUI();
        
        return true;
    }
    
    completeReload() {
        // Calculate how much ammo to add
        const ammoNeeded = this.maxAmmo - this.currentAmmo;
        const ammoToAdd = Math.min(ammoNeeded, this.reserveAmmo);
        
        // Add ammo from reserves
        this.currentAmmo += ammoToAdd;
        this.reserveAmmo -= ammoToAdd;
        
        // Reset reloading state
        this.isReloading = false;
        
        // Update UI
        this.updateAmmoUI();
    }
    
    async drop() {
        if (!this.isEquipped) return;
        
        // Unequip first
        this.unequip();
        
        // Create weapon pickup entity at player position
        const player = this.engine.player;
        const pickupPosition = player.position.clone();
        
        // Offset slightly forward from player
        const forward = new Vector3(0, 0, -1).applyQuaternion(
            this.engine.camera.camera.quaternion
        );
        pickupPosition.add(forward.multiplyScalar(1.5));
        
        // Create a weapon pickup
        const WeaponPickup = (await import('./WeaponPickup.js')).WeaponPickup;
        const weaponPickup = new WeaponPickup({
            position: pickupPosition,
            weapon: this
        });
        
        // Add to entity manager
        this.engine.entityManager.addEntity(weaponPickup);
    }
    
    updateAmmoUI() {
        // Get UI element
        const ammoCounter = document.getElementById('ammo-counter');
        if (!ammoCounter) return;
        
        // Update text
        if (this.isReloading) {
            ammoCounter.textContent = 'Reloading...';
        } else {
            ammoCounter.textContent = `${this.currentAmmo} / ${this.reserveAmmo}`;
        }
    }
}