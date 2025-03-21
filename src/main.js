// src/main.js
import { Engine } from './engine/Engine.js';
import { Vector3 } from 'three';

async function initGame() {
    try {
        console.log("Initializing game...");
        
        // Create game engine
        const engine = new Engine({
            debug: true // Enable debug for development
        });
        
        // Initialize engine
        await engine.init();
        
        // Load example map
        await engine.loadMap('example_map');
        
        // CRITICAL: Preload zombies before starting the game
        console.log("Preloading zombies...");
        await engine.enemyManager.preloadZombies();
        
        // Ensure loading screen displays for minimum time
        await engine.ensureLoadingComplete(500);
        
        // Start the game
        engine.start();
        console.log("Game started successfully");
        
        // Activate initial zombies after a short delay to let the game stabilize
        setTimeout(() => {
            engine.enemyManager.activatePreloadedZombies(20); // Start with 20 active zombies
        }, 2000);
        
        // Make engine accessible from the console for debugging
        window.engine = engine;
    } catch (error) {
        console.error("Failed to initialize game:", error);
    }
}

// Start the game when page is loaded
window.addEventListener('load', initGame);