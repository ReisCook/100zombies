// src/camera/PlayerCamera.js
import { PerspectiveCamera, Vector3 } from 'three';
import { CameraEffects } from './CameraEffects.js';

export class PlayerCamera {
    constructor(engine) {
        this.engine = engine;
        this.player = engine.player;
        
        // Create Three.js camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new PerspectiveCamera(
            engine.config.fov, 
            aspect, 
            0.1, 
            1000
        );
        
        // Camera height above player position
        this.eyeHeight = 1.7; // meters
        
        // Camera offset from player center
        this.offset = new Vector3(0, this.eyeHeight, 0);
        
        // Create camera effects
        this.effects = new CameraEffects(this);
        
        // Handle window resize
        window.addEventListener('resize', this.onResize.bind(this));
    }
    
    onResize() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }
    
    update(deltaTime) {
        // Update position to follow player
        this.camera.position.copy(this.player.position).add(this.offset);
        
        // Apply player rotation to camera
        this.camera.rotation.copy(this.player.viewRotation);
        
        // Update camera effects
        this.effects.update(deltaTime);
    }
}