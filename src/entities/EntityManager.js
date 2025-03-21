// src/entities/EntityManager.js
import { Vector3 } from 'three';

export class EntityManager {
    constructor(engine) {
        this.engine = engine;
        
        // All entities in the scene
        this.entities = [];
        
        // Entities organized by type for faster querying
        this.entitiesByType = new Map();
        
        // Entity ID counter
        this.nextEntityId = 1;
    }
    
    /**
     * Add an entity to the manager
     * @param {Object} entity - Entity to add
     * @returns {Object} - The added entity with assigned ID
     */
    addEntity(entity) {
        // Assign unique ID if not already present
        if (!entity.id) {
            entity.id = this.generateEntityId();
        }
        
        // Add to entities list
        this.entities.push(entity);
        
        // Register by type if specified
        if (entity.type) {
            if (!this.entitiesByType.has(entity.type)) {
                this.entitiesByType.set(entity.type, []);
            }
            this.entitiesByType.get(entity.type).push(entity);
        }
        
        // Initialize entity if it has an init method
        if (typeof entity.init === 'function') {
            entity.init(this.engine);
        }
        
        // Add entity's 3D object to scene if it has one
        if (entity.object) {
            this.engine.renderer.scene.add(entity.object);
        }
        
        return entity;
    }
    
    /**
     * Remove an entity from the manager
     * @param {Object|string} entityOrId - Entity or entity ID to remove
     * @returns {boolean} - True if entity was removed
     */
    removeEntity(entityOrId) {
        const id = typeof entityOrId === 'string' ? entityOrId : entityOrId.id;
        
        // Find entity index
        const index = this.entities.findIndex(e => e.id === id);
        
        if (index === -1) {
            return false;
        }
        
        const entity = this.entities[index];
        
        // Remove from main array
        this.entities.splice(index, 1);
        
        // Remove from type mapping
        if (entity.type && this.entitiesByType.has(entity.type)) {
            const typeArray = this.entitiesByType.get(entity.type);
            const typeIndex = typeArray.findIndex(e => e.id === id);
            
            if (typeIndex !== -1) {
                typeArray.splice(typeIndex, 1);
            }
        }
        
        // Call destroy method if exists
        if (typeof entity.destroy === 'function') {
            entity.destroy();
        }
        
        // Remove 3D object from scene
        if (entity.object) {
            this.engine.renderer.scene.remove(entity.object);
            
            // Dispose resources if available
            if (entity.object.geometry) {
                entity.object.geometry.dispose();
            }
            
            if (entity.object.material) {
                if (Array.isArray(entity.object.material)) {
                    entity.object.material.forEach(m => m.dispose());
                } else {
                    entity.object.material.dispose();
                }
            }
        }
        
        return true;
    }
    
    /**
     * Find an entity by ID
     * @param {string} id - Entity ID
     * @returns {Object|null} - Found entity or null
     */
    getEntityById(id) {
        return this.entities.find(e => e.id === id) || null;
    }
    
    /**
     * Find entities by type
     * @param {string} type - Entity type
     * @returns {Array} - Array of matching entities
     */
    getEntitiesByType(type) {
        return this.entitiesByType.get(type) || [];
    }
    
    /**
     * Find entities in an area
     * @param {Vector3} position - Center position
     * @param {number} radius - Search radius
     * @returns {Array} - Entities within the area
     */
    getEntitiesInRadius(position, radius) {
        return this.entities.filter(entity => {
            if (entity.position) {
                return entity.position.distanceTo(position) <= radius;
            }
            return false;
        });
    }
    
    /**
     * Update all entities
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update each entity if it has an update method
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            
            if (entity.enabled !== false && typeof entity.update === 'function') {
                entity.update(deltaTime);
            }
        }
    }
    
    /**
     * Clear all entities except player
     */
    clearNonPlayerEntities() {
        // Iterate backwards to safely remove during iteration
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            
            // Skip player entity
            if (entity.isPlayer) continue;
            
            this.removeEntity(entity);
        }
    }
    
    /**
     * Clear all entities
     */
    clearAllEntities() {
        // Iterate backwards to safely remove during iteration
        for (let i = this.entities.length - 1; i >= 0; i--) {
            this.removeEntity(this.entities[i]);
        }
    }
    
    /**
     * Generate a unique entity ID
     * @returns {string} - Unique entity ID
     */
    generateEntityId() {
        return `entity_${this.nextEntityId++}`;
    }
}