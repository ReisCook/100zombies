// src/maps/MapLoader.js
import { Vector3 } from 'three';

export class MapLoader {
    constructor(engine) {
        this.engine = engine;
        this.assetManager = engine.assetManager;
    }
    
    /**
     * Load a map by ID
     * @param {string} mapId - Map identifier
     * @returns {Promise<Object>} - Loaded map
     */
    async load(mapId) {
        try {
            // Load map JSON data
            const mapData = await this.loadMapData(mapId);
            
            // Load required assets
            await this.loadMapAssets(mapData);
            
            // Create map objects
            await this.createMapObjects(mapData);
            
            // Set player spawn
            this.setPlayerSpawn(mapData.playerSpawn);
            
            // Spawn weapons defined in the map
            await this.spawnWeapons(mapData.weapons);
            
            console.log(`Map "${mapData.name}" loaded successfully`);
            
            return mapData;
        } catch (error) {
            console.error(`Failed to load map ${mapId}:`, error);
            return null;
        }
    }
    
    /**
     * Load map data from JSON
     * @param {string} mapId - Map identifier
     * @returns {Promise<Object>} - Map data
     */
    async loadMapData(mapId) {
        // For simplicity, we'll just use the data directly
        // In a real implementation, this would load from a file
        
        // Get map data from the AssetManager if it's a JSON asset
        const mapData = this.assetManager.getJSON(mapId);
        
        if (mapData) {
            return mapData;
        }
        
        // Fallback to fetch if not already loaded
        const response = await fetch(`maps/${mapId}.json`);
        
        if (!response.ok) {
            throw new Error(`Failed to load map data: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * Load assets required by the map
     * @param {Object} mapData - Map data
     */
    async loadMapAssets(mapData) {
        const loadPromises = [];
        
        // Load textures
        if (mapData.textures && Array.isArray(mapData.textures)) {
            for (const textureData of mapData.textures) {
                loadPromises.push(
                    this.assetManager.loadTexture(textureData.id, textureData.path)
                );
            }
        }
        
        // Load models
        if (mapData.models && Array.isArray(mapData.models)) {
            for (const modelData of mapData.models) {
                loadPromises.push(
                    this.assetManager.loadModel(modelData.id, modelData.path)
                );
            }
        }
        
        // Load skybox textures if needed
        if (mapData.skybox && mapData.skybox.type === 'cubemap') {
            for (const textureId of mapData.skybox.textures) {
                // These should be defined in the map's texture list
            }
        }
        
        // Wait for all assets to load
        await Promise.all(loadPromises);
    }
    
    /**
     * Create map objects from data
     * @param {Object} mapData - Map data
     */
    async createMapObjects(mapData) {
        // Create terrain
        if (mapData.terrain) {
            this.engine.renderer.createTerrain(mapData.terrain);
        }
        
        // Create structures
        if (mapData.structures && Array.isArray(mapData.structures)) {
            for (const structureData of mapData.structures) {
                this.engine.renderer.createStructure(structureData);
            }
        }
        
        // Set up skybox
        if (mapData.skybox) {
            await this.engine.renderer.setSkybox(mapData.skybox);
        }
        
        // Set up lighting
        if (mapData.lighting) {
            this.engine.renderer.lighting.setLightConfiguration(mapData.lighting);
        }
    }
    
    /**
     * Set player spawn position
     * @param {Object} spawnData - Spawn position data
     */
    setPlayerSpawn(spawnData) {
        if (!spawnData || !this.engine.player) return;
        
        // Set player position
        const spawnPos = new Vector3(
            spawnData.x || 0,
            spawnData.y || 0,
            spawnData.z || 0
        );
        
        this.engine.player.position.copy(spawnPos);
        this.engine.player.physicsBody.position.copy(spawnPos);
        
        // Set player rotation if specified
        if (spawnData.rotation) {
            this.engine.player.viewRotation.y = spawnData.rotation.y || 0;
        }
    }
    
    /**
     * Spawn weapons defined in the map data
     * @param {Array} weaponsList - Array of weapon data
     */
    async spawnWeapons(weaponsList) {
        if (!weaponsList || !Array.isArray(weaponsList) || weaponsList.length === 0) {
            return;
        }
        
        // Import weapon classes
        const { Weapon } = await import('../weapons/Weapon.js');
        const { WeaponPickup } = await import('../weapons/WeaponPickup.js');
            
        // Create each weapon defined in the map
        for (const weaponData of weaponsList) {
            // Create weapon position
            const weaponPosition = new Vector3(
                weaponData.position.x || 0,
                weaponData.position.y || 0,
                weaponData.position.z || 0
            );
            
            // Get properties with defaults
            const props = weaponData.properties || {};
            
            // Create the weapon with properties from map
            const weapon = new Weapon({
                name: props.name || weaponData.type,
                damage: props.damage || 10,
                fireRate: props.fireRate || 5,
                ammoCapacity: props.ammoCapacity || 30,
                reserveAmmo: props.reserveAmmo || 90,
                reloadTime: props.reloadTime || 2.0,
                position: props.viewPosition ? 
                    new Vector3(
                        props.viewPosition.x || 0.3,
                        props.viewPosition.y || -0.3,
                        props.viewPosition.z || -0.5
                    ) : 
                    new Vector3(0.3, -0.3, -0.5)
            });
            
            // Initialize the weapon with the engine
            weapon.init(this.engine);
            
            // Load the weapon model
            if (this.engine.assetManager.getModel(weaponData.type)) {
                weapon.loadModel(weaponData.type);
            } else {
                console.error(`Model for weapon type '${weaponData.type}' not found`);
            }
            
            // Create weapon pickup
            const weaponPickup = new WeaponPickup({
                position: weaponPosition,
                weapon: weapon
            });
            
            // Add to entity manager
            this.engine.entityManager.addEntity(weaponPickup);
        }
    }
}