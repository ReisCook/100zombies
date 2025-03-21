// src/entities/EnemyManager.js
import { Vector3 } from 'three';
import { Zombie } from './Zombie.js';

export class EnemyManager {
    constructor(engine) {
        this.engine = engine;
        this.enemies = [];
        this.maxEnemies = 100; // Increased from 5 to 100
        this.spawnCooldown = 5; // Seconds between spawns
        this.lastSpawnTime = 0;
        this.spawnPoints = []; // Will be populated from map data
        this.enabled = true;
        this.preloadComplete = false;
        this.zombiesToPreload = 100;
        this.preloadedZombies = [];
        this.preloadProgress = 0;
    }
    
    init() {
        console.log("Enemy manager initialized");
    }
    
    async loadEnemyAssets() {
        try {
            // Dynamically import the ZombieAssetLoader
            const { ZombieAssetLoader } = await import('../assets/ZombieAssetLoader.js');
            const loader = new ZombieAssetLoader(this.engine.assetManager);
            
            // Load all zombie assets
            const success = await loader.loadZombieAssets();
            if (!success) {
                console.error("Failed to load zombie assets");
            }
            return success;
        } catch (error) {
            console.error("Error loading enemy assets:", error);
            return false;
        }
    }
    
    update(deltaTime) {
        if (!this.enabled) return;
        
        // Only handle cooldown-based spawning if not using preloading
        if (!this.preloadComplete) return;
        
        // Clean up dead enemies
        this.enemies = this.enemies.filter(enemy => enemy.isAlive);
    }
    
    /**
     * Preloads all zombies before game starts to prevent FPS drops
     * @returns {Promise<boolean>} Success status
     */
    async preloadZombies() {
        console.log("Preloading", this.zombiesToPreload, "zombies...");
        
        // Update loading UI
        const progressElement = document.querySelector('.progress');
        const loadingText = document.querySelector('.loading-text');
        
        if (loadingText) {
            loadingText.textContent = `Preparing zombies... 0%`;
        }
        
        // Get player position
        const player = this.engine.player;
        if (!player) return false;
        
        // Create zombies but keep them disabled
        for (let i = 0; i < this.zombiesToPreload; i++) {
            // Update progress
            this.preloadProgress = (i / this.zombiesToPreload) * 100;
            
            if (progressElement) {
                progressElement.style.width = `${this.preloadProgress}%`;
            }
            
            if (loadingText && i % 5 === 0) { // Update text every 5 zombies to avoid excessive DOM updates
                loadingText.textContent = `Preparing zombies... ${Math.floor(this.preloadProgress)}%`;
            }
            
            // Find spawn point far from player (at least 30 units away)
            const spawnPoint = this.getSpawnPointAwayFromPlayer(player.position, 30, 100);
            
            // Create and initialize zombie
            const zombie = new Zombie(this.engine, spawnPoint);
            await zombie.init(this.engine);
            
            // Important: Disable the zombie initially to improve performance
            zombie.enabled = false;
            
            // Store reference without adding to engine yet
            this.preloadedZombies.push(zombie);
            
            // Allow UI to update by yielding execution for a moment
            if (i % 10 === 0) { // Every 10 zombies
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // Update final status
        if (loadingText) {
            loadingText.textContent = `Zombies ready! Starting game...`;
        }
        
        console.log("Preloaded", this.zombiesToPreload, "zombies successfully");
        this.preloadComplete = true;
        return true;
    }
    
    /**
     * Activate preloaded zombies and add them to the game world
     * @param {number} initialActiveCount - How many zombies to activate initially
     */
    activatePreloadedZombies(initialActiveCount = 20) {
        console.log("Activating zombies...");
        
        // Activate initial batch
        for (let i = 0; i < Math.min(initialActiveCount, this.preloadedZombies.length); i++) {
            const zombie = this.preloadedZombies[i];
            
            // Enable and add to the game world
            zombie.enabled = true;
            this.engine.entityManager.addEntity(zombie);
            this.enemies.push(zombie);
        }
        
        // Schedule the rest to be activated gradually
        this.scheduleRemainingZombies(initialActiveCount);
    }
    
    /**
     * Schedule remaining zombies to activate gradually
     * @param {number} startIndex - Index to start from
     */
    scheduleRemainingZombies(startIndex) {
        let index = startIndex;
        
        // Activate remaining zombies over time
        const interval = setInterval(() => {
            if (index >= this.preloadedZombies.length) {
                clearInterval(interval);
                return;
            }
            
            // Activate next 2 zombies
            for (let i = 0; i < 2 && index < this.preloadedZombies.length; i++, index++) {
                const zombie = this.preloadedZombies[index];
                zombie.enabled = true;
                this.engine.entityManager.addEntity(zombie);
                this.enemies.push(zombie);
            }
        }, 1000); // Add 2 new zombies every second
    }
    
    /**
     * Find a spawn point far away from player
     * @param {Vector3} playerPosition - Player's position
     * @param {number} minDistance - Minimum distance from player
     * @param {number} maxDistance - Maximum distance from player
     * @returns {Vector3} Spawn position
     */
    getSpawnPointAwayFromPlayer(playerPosition, minDistance = 30, maxDistance = 100) {
        // If we have predefined spawn points, use those
        if (this.spawnPoints.length > 0) {
            // Filter spawn points that are far enough from player
            const validSpawnPoints = this.spawnPoints.filter(point => 
                point.distanceTo(playerPosition) > minDistance &&
                point.distanceTo(playerPosition) < maxDistance
            );
            
            if (validSpawnPoints.length > 0) {
                // Return a random valid spawn point
                return validSpawnPoints[Math.floor(Math.random() * validSpawnPoints.length)];
            }
        }
        
        // Fallback: generate a random position around the player but far enough away
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        return new Vector3(
            playerPosition.x + Math.cos(angle) * distance,
            playerPosition.y,
            playerPosition.z + Math.sin(angle) * distance
        );
    }
    
    async spawnZombie(position) {
        try {
            // Create zombie
            const zombie = new Zombie(this.engine, position);
            
            // Initialize zombie
            await zombie.init(this.engine);
            
            // Add to entity manager and enemies list
            this.engine.entityManager.addEntity(zombie);
            this.enemies.push(zombie);
            
            console.log(`Spawned zombie at ${position.x}, ${position.y}, ${position.z}`);
            return zombie;
        } catch (error) {
            console.error("Failed to spawn zombie:", error);
            return null;
        }
    }
    
    setSpawnPoints(points) {
        this.spawnPoints = points;
    }
    
    clear() {
        // Remove all enemies
        for (const enemy of this.enemies) {
            this.engine.entityManager.removeEntity(enemy);
        }
        this.enemies = [];
        this.preloadedZombies = [];
        this.preloadComplete = false;
    }
}