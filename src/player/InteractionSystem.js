// src/player/InteractionSystem.js
import { Vector3, Raycaster } from 'three';
import { RaycastResult } from '../physics/RaycastResult.js';

export class InteractionSystem {
    constructor(player) {
        this.player = player;
        this.engine = player.engine;
        
        this.interactionDistance = 3.0;
        this.currentInteractable = null;
        
        // Get the interaction prompt element
        this.interactionPrompt = document.getElementById('interaction-prompt');
        
        // Setup interaction binding
        this.setupInputBindings();
    }
    
    setupInputBindings() {
        const input = this.engine.input;
        
        // Interact key
        input.onKeyDown('KeyE', () => {
            this.interact();
        });
    }
    
    update() {
        this.checkForInteractables();
    }
    
    checkForInteractables() {
        const camera = this.engine.camera.camera;
        
        // Create a ray from camera
        const raycaster = new Raycaster();
        const rayDirection = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        raycaster.set(camera.position, rayDirection);
        
        // Get potential interactables from entity manager
        const interactables = this.engine.entityManager.entities.filter(
            entity => entity.interactable
        );
        
        // Find closest interactable in view
        let closestInteractable = null;
        let closestDistance = Infinity;
        
        for (const interactable of interactables) {
            // Check if in range
            const distance = camera.position.distanceTo(interactable.position);
            
            if (distance <= (interactable.interactionDistance || this.interactionDistance)) {
                // Check if it's in view - raycasting against scene
                const intersects = raycaster.intersectObject(interactable.object, true);
                
                if (intersects.length > 0) {
                    const hit = intersects[0];
                    if (hit.distance < closestDistance) {
                        closestInteractable = interactable;
                        closestDistance = hit.distance;
                    }
                }
            }
        }
        
        // Update current interactable
        this.currentInteractable = closestInteractable;
        
        // Update UI prompt
        if (this.currentInteractable) {
            this.showInteractionPrompt("Press E to pick up " + 
                (this.currentInteractable.weapon ? this.currentInteractable.weapon.name : "weapon"));
        } else {
            this.hideInteractionPrompt();
        }
    }
    
    interact() {
        if (this.currentInteractable && typeof this.currentInteractable.interact === 'function') {
            this.currentInteractable.interact(this.player);
            this.currentInteractable = null;
            this.hideInteractionPrompt();
        }
    }
    
    showInteractionPrompt(text) {
        if (this.interactionPrompt) {
            this.interactionPrompt.textContent = text;
            this.interactionPrompt.style.display = 'block';
        }
    }
    
    hideInteractionPrompt() {
        if (this.interactionPrompt) {
            this.interactionPrompt.style.display = 'none';
        }
    }
}