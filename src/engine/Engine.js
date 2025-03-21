// src/engine/Engine.js
import { Time } from './Time.js';
import { Input } from './Input.js';
import { Renderer } from '../renderer/Renderer.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { EntityManager } from '../entities/EntityManager.js';
import { MapLoader } from '../maps/MapLoader.js';
import { AssetManager } from '../assets/AssetManager.js';
import { Player } from '../player/Player.js';
import { PlayerCamera } from '../camera/PlayerCamera.js';
import { Debug } from './Debug.js';
import { EnemyManager } from '../entities/EnemyManager.js';

export class Engine {
    constructor(config = {}) {
        this.config = { 
            targetFPS: 60,
            physicsFPS: 120,
            fov: 95,
            gravity: -20, // Higher gravity for better feel
            debug: false,
            ...config 
        };
        
        this.isRunning = false;
        this.isPaused = false;
        
        // Core systems
        this.time = new Time();
        this.input = new Input();
        this.assetManager = new AssetManager();
        this.renderer = new Renderer(this);
        this.physics = new PhysicsWorld(this);
        this.entityManager = new EntityManager(this);
        this.mapLoader = new MapLoader(this);
        this.debug = new Debug(this);
        this.enemyManager = new EnemyManager(this);
        
        // Player and camera
        this.player = null;
        this.camera = null;
        
        // Current map
        this.currentMap = null;
    }
    
    async init() {
        console.log("Initializing Engine...");
        
        // Initialize all systems
        this.input.init();
        await this.assetManager.init();
        this.renderer.init();
        this.physics.init();
        
        // Initialize enemy manager
        this.enemyManager.init();
        
        // Load enemy assets (including zombie model and animations)
        console.log("Loading enemy assets...");
        await this.enemyManager.loadEnemyAssets();
        
        // Create player and camera
        this.player = new Player(this);
        this.camera = new PlayerCamera(this);
        
        if (this.config.debug) {
            this.debug.enable();
        }
        
        console.log("Engine initialization complete");
    }
    
    /**
     * Wait for loading screen to complete
     * @param {number} minDelay - Minimum delay in milliseconds to show loading screen
     * @returns {Promise<void>}
     */
    async ensureLoadingComplete(minDelay = 500) {
        // Get loading screen element
        const loadingScreen = document.getElementById('loading-screen');
        
        // Make sure loading screen is visible during preloading
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
        
        // Wait for minimum delay
        await new Promise(resolve => setTimeout(resolve, minDelay));
    }
    
    /**
     * Hide loading screen with fade-out effect
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    async loadMap(mapId) {
        // Ensure loading screen is visible
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
        
        // Unload current map if exists
        if (this.currentMap) {
            await this.unloadCurrentMap();
        }
        
        // Load new map
        try {
            console.log(`Loading map: ${mapId}`);
            this.currentMap = await this.mapLoader.load(mapId);
            
            // Ensure map is fully rendered before continuing
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return this.currentMap;
        } catch (error) {
            console.error(`Failed to load map ${mapId}:`, error);
            // Create a default empty map if loading fails
            this.currentMap = {
                name: "Default Map",
                id: "default_map",
                playerSpawn: { x: 0, y: 2, z: 0, rotation: { y: 0 } }
            };
            return this.currentMap;
        }
    }
    
    async unloadCurrentMap() {
        if (!this.currentMap) return;
        
        // Clear entities (except player)
        this.entityManager.clearNonPlayerEntities();
        
        // Clear physics objects
        this.physics.clear();
        
        // Clear enemies
        this.enemyManager.clear();
        
        // Unload map-specific assets
        await this.assetManager.unloadGroup(this.currentMap.id);
        
        this.currentMap = null;
    }
    
    start() {
        if (this.isRunning) return;
        
        console.log("Starting Engine...");
        
        // Hide loading screen now that everything is ready
        this.hideLoadingScreen();
        
        this.isRunning = true;
        this.time.reset();
        
        // Start game loop
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    stop() {
        if (!this.isRunning) return;
        
        console.log("Stopping Engine...");
        cancelAnimationFrame(this.gameLoopId);
        this.isRunning = false;
    }
    
    gameLoop(timestamp) {
        // Calculate delta time with cap to prevent physics issues
        const rawDeltaTime = this.time.update(timestamp);
        const deltaTime = Math.min(rawDeltaTime, 1/30); // Cap to 30fps minimum for stable physics
        
        if (!this.isPaused) {
            // Update player first to ensure responsive controls
            if (this.player) {
                this.player.update(deltaTime);
            }
            
            // Update physics after player input
            this.physics.update(deltaTime);
            
            // Update other entities
            this.entityManager.update(deltaTime);
            
            // Update enemy manager
            this.enemyManager.update(deltaTime);
            
            // Update camera last to follow updated player
            if (this.camera) {
                this.camera.update(deltaTime);
            }
        }
        
        // Always render even when paused
        this.renderer.render();
        
        // Debug
        if (this.config.debug) {
            this.debug.update(deltaTime);
        }
        
        // Process input events
        this.input.update();
        
        // Queue next frame
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    pause() {
        this.isPaused = true;
        console.log("Game paused");
    }
    
    resume() {
        this.isPaused = false;
        console.log("Game resumed");
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        console.log(this.isPaused ? "Game paused" : "Game resumed");
    }
}