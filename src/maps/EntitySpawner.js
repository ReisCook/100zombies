// src/maps/EntitySpawner.js
import { Vector3 } from 'three';

export class EntitySpawner {
    constructor(engine) {
        this.engine = engine;
        
        // Registry of entity types and their constructors
        this.entityRegistry = new Map();
        
        // Register built-in entity types
        this.registerDefaultEntities();
    }
    
    /**
     * Register an entity type with its constructor
     * @param {string} type - Entity type name
     * @param {Function} constructor - Entity constructor
     */
    registerEntity(type, constructor) {
        this.entityRegistry.set(type, constructor);
    }
    
    /**
     * Register default entity types
     */
    async registerDefaultEntities() {
        // Target entity example
        this.registerEntity('target', (data) => {
            return {
                position: new Vector3(data.position.x, data.position.y, data.position.z),
                properties: data.properties || {},
                update: (deltaTime) => {
                    // Target update logic would go here
                },
                destroy: () => {
                    // Clean up resources
                }
            };
        });
        
        // Register weapon pickup entity
        try {
            const { Weapon } = await import('../weapons/Weapon.js');
            const { WeaponPickup } = await import('../weapons/WeaponPickup.js');
            
            this.registerEntity('weapon', async (data) => {
                const weaponPosition = new Vector3(
                    data.position.x || 0,
                    data.position.y || 0,
                    data.position.z || 0
                );
                
                // Get properties with defaults
                const props = data.properties || {};
                
                // Create the weapon with properties from map
                const weapon = new Weapon({
                    name: props.name || data.weaponType,
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
                
                // Initialize the weapon
                weapon.init(this.engine);
                
                // Load the weapon model
                if (this.engine.assetManager.getModel(data.weaponType)) {
                    weapon.loadModel(data.weaponType);
                }
                
                // Create and return the pickup
                return new WeaponPickup({
                    position: weaponPosition,
                    weapon: weapon
                });
            });
        } catch (error) {
            console.error("Error registering weapon entity:", error);
        }
    }
    
    /**
     * Spawn entities from map data
     * @param {Array} entitiesData - Array of entity data objects
     */
    spawnEntities(entitiesData) {
        if (!entitiesData || !Array.isArray(entitiesData)) {
            console.warn('No valid entities data provided');
            return;
        }
        
        for (const entityData of entitiesData) {
            this.spawnEntity(entityData);
        }
    }
    
    /**
     * Spawn a single entity
     * @param {Object} entityData - Entity data
     * @returns {Promise<Object|null>} - Created entity or null if failed
     */
    async spawnEntity(entityData) {
        const { type } = entityData;
        
        if (!type) {
            console.error('Entity missing type:', entityData);
            return null;
        }
        
        // Get entity constructor
        const constructor = this.entityRegistry.get(type);
        
        if (!constructor) {
            console.error(`Unknown entity type: ${type}`);
            return null;
        }
        
        try {
            // Create entity - handle both sync and async constructors
            const entity = await Promise.resolve(constructor(entityData));
            
            // Add to entity manager
            this.engine.entityManager.addEntity(entity);
            
            return entity;
        } catch (error) {
            console.error(`Error spawning entity of type ${type}:`, error);
            return null;
        }
    }
}