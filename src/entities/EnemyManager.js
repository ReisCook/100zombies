// src/entities/EnemyManager.js
import { Vector3 } from 'three';
import { Zombie } from './Zombie.js';

export class EnemyManager {
    constructor(engine) {
        this.engine = engine;
        this.enemies = [];
        
        // Default configuration
        this.config = {
            maxEnemies: 100,
            preloadAtStart: true,
            initialActiveCount: 20,
            activationRate: 2,
            activationInterval: 1000
        };
        
        // Enemy type definitions
        this.enemyTypes = new Map();
        
        // Spawn areas
        this.spawnAreas = [];
        this.totalSpawnWeight = 0;
        
        this.spawnCooldown = 5; // Seconds between spawns
        this.lastSpawnTime = 0;
        this.enabled = true;
        this.preloadComplete = false;
        this.preloadedZombies = [];
        this.preloadProgress = 0;
    }
    
    init() {
        // Register default enemy types
        this.registerDefaultEnemyTypes();
        console.log("Enemy manager initialized");
    }
    
    /**
     * Register default enemy types if none defined in map
     */
    registerDefaultEnemyTypes() {
        // Standard zombie (default type)
        this.enemyTypes.set('standard', {
            id: 'standard',
            weight: 1.0,
            health: 100,
            speed: 3.0,
            damage: 20,
            detectionRange: 15
        });
    }
    
    /**
     * Configure the enemy manager with map-defined settings
     * @param {Object} config - Configuration options
     */
    configure(config) {
        // Merge with default config
        this.config = {
            ...this.config,
            ...config
        };
        
        console.log("Enemy manager configured:", this.config);
        
        // Process enemy types if provided
        if (config.enemyTypes && config.enemyTypes.length > 0) {
            // Clear default types
            this.enemyTypes.clear();
            
            // Register all types from map data
            for (const typeData of config.enemyTypes) {
                this.enemyTypes.set(typeData.id, {
                    id: typeData.id,
                    weight: typeData.weight || 1.0,
                    health: typeData.health || 100,
                    speed: typeData.speed || 3.0,
                    damage: typeData.damage || 20,
                    detectionRange: typeData.detectionRange || 15
                });
            }
        }
    }
    
    /**
     * Configure spawn areas from map data
     * @param {Array} spawnAreaData - Spawn area definitions from map
     */
    configureSpawnAreas(spawnAreaData) {
        this.spawnAreas = [];
        this.totalSpawnWeight = 0;
        
        // Process each spawn area
        for (const areaData of spawnAreaData) {
            const area = {
                id: areaData.id,
                type: areaData.type || 'circle',
                weight: areaData.weight || 1.0,
                minDistance: areaData.minDistance || 30,
                maxDistance: areaData.maxDistance || 80
            };
            
            // Process area based on type
            if (area.type === 'circle') {
                area.center = new Vector3(
                    areaData.center.x || 0,
                    areaData.center.y || 0,
                    areaData.center.z || 0
                );
                area.radius = areaData.radius || 30;
            } else if (area.type === 'rectangle') {
                area.center = new Vector3(
                    areaData.center.x || 0,
                    areaData.center.y || 0,
                    areaData.center.z || 0
                );
                area.size = {
                    x: areaData.size.x || 60,
                    z: areaData.size.z || 60
                };
            }
            
            // Add to spawn areas array
            this.spawnAreas.push(area);
            this.totalSpawnWeight += area.weight;
        }
        
        console.log(`Configured ${this.spawnAreas.length} spawn areas`);
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
        console.log("Preloading", this.config.maxEnemies, "zombies...");
        
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
        for (let i = 0; i < this.config.maxEnemies; i++) {
            // Update progress
            this.preloadProgress = (i / this.config.maxEnemies) * 100;
            
            if (progressElement) {
                progressElement.style.width = `${this.preloadProgress}%`;
            }
            
            if (loadingText && i % 5 === 0) { // Update text every 5 zombies
                loadingText.textContent = `Preparing zombies... ${Math.floor(this.preloadProgress)}%`;
            }
            
            // Get a random enemy type
            const zombieType = this.getRandomEnemyType();
            
            // Get a spawn position from configured areas
            const spawnPoint = this.getSpawnPosition(player.position);
            
            // Create zombie with type-specific properties
            const zombie = new Zombie(this.engine, spawnPoint, {
                health: zombieType.health,
                speed: zombieType.speed,
                damage: zombieType.damage,
                detectionRange: zombieType.detectionRange,
                type: zombieType.id
            });
            
            // Initialize the zombie but keep it disabled
            await zombie.init(this.engine);
            zombie.enabled = false;
            
            // Store reference without adding to engine yet
            this.preloadedZombies.push(zombie);
            
            // Allow UI to update by yielding execution
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // Update final status
        if (loadingText) {
            loadingText.textContent = `Zombies ready! Starting game...`;
        }
        
        console.log("Preloaded", this.config.maxEnemies, "zombies successfully");
        this.preloadComplete = true;
        return true;
    }
    
    /**
     * Activate preloaded zombies and add them to the game world
     */
    activatePreloadedZombies() {
        console.log("Activating zombies...");
        
        // Activate initial batch
        const initialCount = Math.min(
            this.config.initialActiveCount, 
            this.preloadedZombies.length
        );
        
        for (let i = 0; i < initialCount; i++) {
            const zombie = this.preloadedZombies[i];
            
            // Enable and add to the game world
            zombie.enabled = true;
            this.engine.entityManager.addEntity(zombie);
            this.enemies.push(zombie);
        }
        
        // Schedule the rest to be activated gradually
        this.scheduleRemainingZombies(initialCount);
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
            
            // Activate next batch of zombies
            for (let i = 0; i < this.config.activationRate && index < this.preloadedZombies.length; i++, index++) {
                const zombie = this.preloadedZombies[index];
                zombie.enabled = true;
                this.engine.entityManager.addEntity(zombie);
                this.enemies.push(zombie);
            }
        }, this.config.activationInterval);
    }
    
    /**
     * Get a spawn position from configured areas
     * @param {Vector3} playerPosition - Current player position
     * @returns {Vector3} - Spawn position
     */
    getSpawnPosition(playerPosition) {
        // If no spawn areas are configured, use default circle around player
        if (this.spawnAreas.length === 0) {
            return this.getDefaultSpawnPosition(playerPosition);
        }
        
        // Select a spawn area based on weights
        const area = this.selectWeightedSpawnArea();
        
        // Get random position from the area
        return this.getPositionInArea(area, playerPosition);
    }
    
    /**
     * Select a random spawn area based on weights
     * @returns {Object} - Selected spawn area
     */
    selectWeightedSpawnArea() {
        const randomValue = Math.random() * this.totalSpawnWeight;
        let weightSum = 0;
        
        for (const area of this.spawnAreas) {
            weightSum += area.weight;
            if (randomValue <= weightSum) {
                return area;
            }
        }
        
        // Fallback to first area if something goes wrong
        return this.spawnAreas[0];
    }
    
    /**
     * Get a random position within a spawn area
     * @param {Object} area - Spawn area definition
     * @param {Vector3} playerPosition - Current player position
     * @returns {Vector3} - Position within the area
     */
    getPositionInArea(area, playerPosition) {
        if (area.type === 'circle') {
            // Get random position inside circle
            const angle = Math.random() * Math.PI * 2;
            const distanceFromCenter = Math.random() * area.radius;
            
            return new Vector3(
                area.center.x + Math.cos(angle) * distanceFromCenter,
                area.center.y,
                area.center.z + Math.sin(angle) * distanceFromCenter
            );
        } 
        else if (area.type === 'rectangle') {
            // Get random position inside rectangle
            return new Vector3(
                area.center.x + (Math.random() * 2 - 1) * area.size.x / 2,
                area.center.y,
                area.center.z + (Math.random() * 2 - 1) * area.size.z / 2
            );
        }
        
        // Fallback to default position
        return this.getDefaultSpawnPosition(playerPosition);
    }
    
    /**
     * Get default spawn position when no areas are defined
     * @param {Vector3} playerPosition - Current player position
     * @returns {Vector3} - Spawn position
     */
    getDefaultSpawnPosition(playerPosition) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50; // Between 30-80 units away
        
        return new Vector3(
            playerPosition.x + Math.cos(angle) * distance,
            playerPosition.y,
            playerPosition.z + Math.sin(angle) * distance
        );
    }
    
    /**
     * Get a random enemy type based on weights
     * @returns {Object} - Enemy type definition
     */
    getRandomEnemyType() {
        // Get total weight
        let totalWeight = 0;
        for (const type of this.enemyTypes.values()) {
            totalWeight += type.weight;
        }
        
        // Select type based on weight
        const randomValue = Math.random() * totalWeight;
        let currentWeight = 0;
        
        for (const type of this.enemyTypes.values()) {
            currentWeight += type.weight;
            if (randomValue <= currentWeight) {
                return type;
            }
        }
        
        // Fallback to first type
        return this.enemyTypes.values().next().value;
    }
    
    async spawnZombie(position, typeId = 'standard') {
        try {
            // Get type definition
            const typeData = this.enemyTypes.get(typeId) || this.enemyTypes.get('standard');
            
            // Create zombie with type properties
            const zombie = new Zombie(this.engine, position, {
                health: typeData.health,
                speed: typeData.speed,
                damage: typeData.damage,
                detectionRange: typeData.detectionRange,
                type: typeData.id
            });
            
            // Initialize zombie
            await zombie.init(this.engine);
            
            // Add to entity manager and enemies list
            this.engine.entityManager.addEntity(zombie);
            this.enemies.push(zombie);
            
            console.log(`Spawned ${typeData.id} zombie at ${position.x}, ${position.y}, ${position.z}`);
            return zombie;
        } catch (error) {
            console.error("Failed to spawn zombie:", error);
            return null;
        }
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