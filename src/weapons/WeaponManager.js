// src/player/WeaponManager.js
export class WeaponManager {
    constructor(player) {
        this.player = player;
        this.engine = player.engine;
        
        this.currentWeapon = null;
        this.weapons = [];
        
        // Setup input bindings
        this.setupInputBindings();
    }
    
    setupInputBindings() {
        const input = this.engine.input;
        
        // Fire weapon
        input.onMouseDown('MouseLeft', () => {
            if (this.currentWeapon) {
                this.currentWeapon.startFire();
            }
        });
        
        input.onMouseUp('MouseLeft', () => {
            if (this.currentWeapon) {
                this.currentWeapon.stopFire();
            }
        });
        
        // Reload weapon
        input.onKeyDown('KeyR', () => {
            if (this.currentWeapon) {
                this.currentWeapon.tryReload();
            }
        });
        
        // Drop weapon
        input.onKeyDown('KeyG', () => {
            this.dropCurrentWeapon();
        });
    }
    
    addWeapon(weapon) {
        this.weapons.push(weapon);
        weapon.init(this.engine);
        
        // If it's our first weapon, equip it
        if (this.weapons.length === 1 && !this.currentWeapon) {
            this.equipWeapon(weapon);
        }
    }
    
    equipWeapon(weapon) {
        // Unequip current weapon if any
        if (this.currentWeapon) {
            this.currentWeapon.unequip();
        }
        
        // Equip new weapon
        this.currentWeapon = weapon;
        weapon.equip(this.player);
    }
    
    dropCurrentWeapon() {
        if (!this.currentWeapon) return;
        
        // Create a copy of the reference
        const weapon = this.currentWeapon;
        
        // Remove from weapons array
        const index = this.weapons.indexOf(weapon);
        if (index !== -1) {
            this.weapons.splice(index, 1);
        }
        
        // Drop the weapon
        weapon.drop();
        
        // Clear current weapon
        this.currentWeapon = null;
        
        // Equip next weapon if available
        if (this.weapons.length > 0) {
            this.equipWeapon(this.weapons[0]);
        }
    }
    
    update(deltaTime) {
        // Update current weapon
        if (this.currentWeapon) {
            this.currentWeapon.update(deltaTime);
        }
    }
}