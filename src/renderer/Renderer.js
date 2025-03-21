// src/renderer/Renderer.js
import {
    WebGLRenderer,
    Scene,
    PCFSoftShadowMap,
    FogExp2,
    Color,
    PlaneGeometry,
    MeshStandardMaterial,
    Mesh,
    BoxGeometry,
    RepeatWrapping,
    Vector2,
    Vector3
} from 'three';
import { Lighting } from './Lighting.js';
import { Skybox } from './Skybox.js';
import { GroundPlane, BoxObstacle } from '../physics/PhysicsBody.js';

export class Renderer {
    constructor(engine) {
        this.engine = engine;
        
        // Create renderer and scene
        this.renderer = null;
        this.scene = new Scene();
        
        // Scene objects
        this.mapObjects = [];
        
        // Subsystems
        this.lighting = null;
        this.skybox = null;
    }
    
    init() {
        // Create Three.js renderer
        this.renderer = new WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        
        // Add to DOM
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Initialize subsystems
        this.lighting = new Lighting(this);
        this.skybox = new Skybox(this);
        
        // Add fog to scene
        this.scene.fog = new FogExp2(0x88aadd, 0.015);
        
        // Handle window resize
        window.addEventListener('resize', this.onResize.bind(this));
        
        console.log('Renderer initialized');
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.renderer.setSize(width, height);
    }
    
    render() {
        if (!this.engine.camera || !this.scene) return;
        
        // Render the scene
        this.renderer.render(this.scene, this.engine.camera.camera);
    }
    
    createTerrain(terrainData) {
        const { size, texture } = terrainData;
        
        // Create ground plane
        const geometry = new PlaneGeometry(size.x, size.z, 32, 32);
        geometry.rotateX(-Math.PI / 2); // Rotate to horizontal
        
        // Get texture from asset manager
        const textureObj = this.engine.assetManager.getTexture(texture);
        if (!textureObj) {
            console.error(`Terrain texture not found: ${texture}`);
            return null;
        }
        
        // Configure texture
        textureObj.wrapS = RepeatWrapping;
        textureObj.wrapT = RepeatWrapping;
        textureObj.repeat.set(size.x / 10, size.z / 10);
        
        // Create material
        const material = new MeshStandardMaterial({
            map: textureObj,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Create mesh
        const terrain = new Mesh(geometry, material);
        terrain.receiveShadow = true;
        terrain.position.y = 0;
        
        // Add to scene
        this.scene.add(terrain);
        this.mapObjects.push(terrain);
        
        // Create physics ground plane
        const groundPlane = new GroundPlane({
            position: new Vector3(0, 0, 0),
            normal: new Vector3(0, 1, 0),
            restitution: 0.3,
            friction: 0.8
        });
        
        // Add to physics world
        this.engine.physics.addBody(groundPlane);
        
        return {
            mesh: terrain,
            physicsBody: groundPlane
        };
    }
    
    createStructure(structureData) {
        const { type, position, scale, texture, rotation } = structureData;
        
        let mesh = null;
        let physicsBody = null;
        
        // Create mesh based on type
        if (type === 'box') {
            // Create box geometry
            const geometry = new BoxGeometry(scale.x, scale.y, scale.z);
            
            // Get texture
            const textureObj = this.engine.assetManager.getTexture(texture);
            if (!textureObj) {
                console.error(`Structure texture not found: ${texture}`);
                return null;
            }
            
            // Create material
            const material = new MeshStandardMaterial({
                map: textureObj,
                roughness: 0.7,
                metalness: 0.3
            });
            
            // Create mesh
            mesh = new Mesh(geometry, material);
            
            // Apply position and rotation
            mesh.position.set(position.x, position.y, position.z);
            
            if (rotation) {
                mesh.rotation.set(
                    rotation.x || 0,
                    rotation.y || 0,
                    rotation.z || 0
                );
            }
            
            // Setup shadows
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            // Add to scene
            this.scene.add(mesh);
            this.mapObjects.push(mesh);
            
            // Create physics body for box
            physicsBody = new BoxObstacle({
                position: new Vector3(position.x, position.y, position.z),
                halfExtents: new Vector3(scale.x / 2, scale.y / 2, scale.z / 2),
                restitution: 0.2,
                friction: 0.5
            });
            
            // Add to physics world
            this.engine.physics.addBody(physicsBody);
        } 
        // Other structure types would be handled here
        
        if (!mesh) {
            return null;
        }
        
        return {
            mesh: mesh,
            physicsBody: physicsBody
        };
    }
    
    clearMapObjects() {
        // Remove all map objects from scene
        for (const object of this.mapObjects) {
            this.scene.remove(object);
            
            // Dispose geometry and materials
            if (object.geometry) {
                object.geometry.dispose();
            }
            
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
        
        this.mapObjects = [];
    }
    
    async setSkybox(skyboxData) {
        await this.skybox.set(skyboxData);
    }
}