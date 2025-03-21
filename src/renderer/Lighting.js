// src/renderer/Lighting.js
import {
    AmbientLight,
    DirectionalLight,
    HemisphereLight,
    PointLight,
    SpotLight,
    Color,
    Vector3
} from 'three';

export class Lighting {
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = renderer.scene;
        this.engine = renderer.engine;
        
        // Store light objects
        this.lights = {
            ambient: null,
            hemisphere: null,
            directional: null,
            points: [],
            spots: []
        };
        
        // Default lighting config
        this.defaultConfig = {
            ambient: {
                color: '#404040',
                intensity: 0.5
            },
            hemisphere: {
                skyColor: '#7095ff',
                groundColor: '#705a3a',
                intensity: 0.6
            },
            directional: {
                color: '#ffffff',
                intensity: 1.0,
                position: { x: 5, y: 10, z: 7.5 },
                castShadow: true,
                shadowMapSize: 2048
            }
        };
    }
    
    /**
     * Initialize default lighting
     */
    init() {
        this.setupDefaultLighting();
    }
    
    /**
     * Set up default lighting configuration
     */
    setupDefaultLighting() {
        this.setLightConfiguration(this.defaultConfig);
    }
    
    /**
     * Set lighting configuration from data
     * @param {Object} config - Lighting configuration
     */
    setLightConfiguration(config) {
        // Clear existing lights
        this.clearLights();
        
        // Apply new configuration
        if (config.ambient) {
            this.setupAmbientLight(config.ambient);
        }
        
        if (config.hemisphere) {
            this.setupHemisphereLight(config.hemisphere);
        }
        
        if (config.directional) {
            this.setupDirectionalLight(config.directional);
        }
        
        if (config.points && Array.isArray(config.points)) {
            config.points.forEach(pointConfig => {
                this.addPointLight(pointConfig);
            });
        }
        
        if (config.spots && Array.isArray(config.spots)) {
            config.spots.forEach(spotConfig => {
                this.addSpotLight(spotConfig);
            });
        }
    }
    
    /**
     * Clear all lights from the scene
     */
    clearLights() {
        // Remove ambient light
        if (this.lights.ambient) {
            this.scene.remove(this.lights.ambient);
            this.lights.ambient = null;
        }
        
        // Remove hemisphere light
        if (this.lights.hemisphere) {
            this.scene.remove(this.lights.hemisphere);
            this.lights.hemisphere = null;
        }
        
        // Remove directional light
        if (this.lights.directional) {
            this.scene.remove(this.lights.directional);
            this.lights.directional = null;
        }
        
        // Remove point lights
        this.lights.points.forEach(light => {
            this.scene.remove(light);
        });
        this.lights.points = [];
        
        // Remove spot lights
        this.lights.spots.forEach(light => {
            this.scene.remove(light);
        });
        this.lights.spots = [];
    }
    
    /**
     * Set up ambient light
     * @param {Object} config - Ambient light configuration
     */
    setupAmbientLight(config) {
        const color = new Color(config.color || '#404040');
        const intensity = config.intensity !== undefined ? config.intensity : 0.5;
        
        this.lights.ambient = new AmbientLight(color, intensity);
        this.scene.add(this.lights.ambient);
    }
    
    /**
     * Set up hemisphere light
     * @param {Object} config - Hemisphere light configuration
     */
    setupHemisphereLight(config) {
        const skyColor = new Color(config.skyColor || '#7095ff');
        const groundColor = new Color(config.groundColor || '#705a3a');
        const intensity = config.intensity !== undefined ? config.intensity : 0.6;
        
        this.lights.hemisphere = new HemisphereLight(skyColor, groundColor, intensity);
        this.scene.add(this.lights.hemisphere);
    }
    
    /**
     * Set up directional light
     * @param {Object} config - Directional light configuration
     */
    setupDirectionalLight(config) {
        const color = new Color(config.color || '#ffffff');
        const intensity = config.intensity !== undefined ? config.intensity : 1.0;
        
        this.lights.directional = new DirectionalLight(color, intensity);
        
        // Set position
        if (config.position) {
            this.lights.directional.position.set(
                config.position.x || 5,
                config.position.y || 10,
                config.position.z || 7.5
            );
        } else {
            this.lights.directional.position.set(5, 10, 7.5);
        }
        
        // Set up shadows if enabled
        if (config.castShadow) {
            this.lights.directional.castShadow = true;
            
            const shadowMapSize = config.shadowMapSize || 2048;
            this.lights.directional.shadow.mapSize.width = shadowMapSize;
            this.lights.directional.shadow.mapSize.height = shadowMapSize;
            
            // Set shadow camera frustum
            const shadowSize = config.shadowSize || 20;
            this.lights.directional.shadow.camera.left = -shadowSize;
            this.lights.directional.shadow.camera.right = shadowSize;
            this.lights.directional.shadow.camera.top = shadowSize;
            this.lights.directional.shadow.camera.bottom = -shadowSize;
            this.lights.directional.shadow.camera.near = 0.5;
            this.lights.directional.shadow.camera.far = 50;
            
            // Shadow bias to prevent shadow acne
            this.lights.directional.shadow.bias = -0.0003;
        }
        
        this.scene.add(this.lights.directional);
    }
    
    /**
     * Add a point light to the scene
     * @param {Object} config - Point light configuration
     * @returns {PointLight} - Created point light
     */
    addPointLight(config) {
        const color = new Color(config.color || '#ffffff');
        const intensity = config.intensity !== undefined ? config.intensity : 1.0;
        const distance = config.distance !== undefined ? config.distance : 0;
        const decay = config.decay !== undefined ? config.decay : 2;
        
        const light = new PointLight(color, intensity, distance, decay);
        
        // Set position
        if (config.position) {
            light.position.set(
                config.position.x || 0,
                config.position.y || 0,
                config.position.z || 0
            );
        }
        
        // Set up shadows if enabled
        if (config.castShadow) {
            light.castShadow = true;
            
            const shadowMapSize = config.shadowMapSize || 512;
            light.shadow.mapSize.width = shadowMapSize;
            light.shadow.mapSize.height = shadowMapSize;
            
            light.shadow.camera.near = config.shadowNear || 0.5;
            light.shadow.camera.far = config.shadowFar || 500;
        }
        
        this.scene.add(light);
        this.lights.points.push(light);
        
        return light;
    }
    
    /**
     * Add a spot light to the scene
     * @param {Object} config - Spot light configuration
     * @returns {SpotLight} - Created spot light
     */
    addSpotLight(config) {
        const color = new Color(config.color || '#ffffff');
        const intensity = config.intensity !== undefined ? config.intensity : 1.0;
        const distance = config.distance !== undefined ? config.distance : 0;
        const angle = config.angle !== undefined ? config.angle : Math.PI / 3;
        const penumbra = config.penumbra !== undefined ? config.penumbra : 0;
        const decay = config.decay !== undefined ? config.decay : 2;
        
        const light = new SpotLight(color, intensity, distance, angle, penumbra, decay);
        
        // Set position
        if (config.position) {
            light.position.set(
                config.position.x || 0,
                config.position.y || 0,
                config.position.z || 0
            );
        }
        
        // Set target
        if (config.target) {
            light.target.position.set(
                config.target.x || 0,
                config.target.y || 0,
                config.target.z || 0
            );
            this.scene.add(light.target);
        }
        
        // Set up shadows if enabled
        if (config.castShadow) {
            light.castShadow = true;
            
            const shadowMapSize = config.shadowMapSize || 512;
            light.shadow.mapSize.width = shadowMapSize;
            light.shadow.mapSize.height = shadowMapSize;
            
            light.shadow.camera.near = config.shadowNear || 0.5;
            light.shadow.camera.far = config.shadowFar || 500;
            light.shadow.camera.fov = config.shadowFov || 30;
        }
        
        this.scene.add(light);
        this.lights.spots.push(light);
        
        return light;
    }
    
    /**
     * Update lighting (for animations or time-of-day effects)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Could implement day/night cycle, flickering effects, etc.
    }
}