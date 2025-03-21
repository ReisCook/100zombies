// src/renderer/Skybox.js
import {
    CubeTextureLoader,
    BackSide,
    MeshBasicMaterial,
    BoxGeometry,
    Mesh,
    ShaderMaterial,
    Color
} from 'three';

export class Skybox {
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = renderer.scene;
        this.engine = renderer.engine;
        
        this.skyboxMesh = null;
    }
    
    async set(skyboxData) {
        // Remove existing skybox if any
        this.clear();
        
        if (!skyboxData) return;
        
        const { type } = skyboxData;
        
        if (type === 'cubemap') {
            await this.setCubemap(skyboxData);
        } else if (type === 'gradient') {
            this.setGradient(skyboxData);
        } else {
            console.warn(`Unknown skybox type: ${type}`);
        }
    }
    
    async setCubemap(skyboxData) {
        const { textures } = skyboxData;
        
        // Get textures from asset manager
        const textureObjects = textures.map(id => 
            this.engine.assetManager.getTexture(id)
        );
        
        if (textureObjects.some(tex => !tex)) {
            console.error('Missing skybox textures');
            return;
        }
        
        // Create cube texture loader
        const loader = new CubeTextureLoader();
        const cubeTexture = loader.load(textureObjects.map(tex => tex.source.data.src));
        
        // Create skybox material
        const material = new MeshBasicMaterial({
            envMap: cubeTexture,
            side: BackSide,
            fog: false
        });
        
        // Create skybox mesh
        const geometry = new BoxGeometry(1000, 1000, 1000);
        this.skyboxMesh = new Mesh(geometry, material);
        
        // Add to scene
        this.scene.add(this.skyboxMesh);
    }
    
    setGradient(gradientData) {
        const { topColor, bottomColor } = gradientData;
        
        // Create shader material with gradient
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(0.0, h)), 1.0);
            }
        `;
        
        const material = new ShaderMaterial({
            uniforms: {
                topColor: { value: new Color(topColor || 0x0077ff) },
                bottomColor: { value: new Color(bottomColor || 0xffffff) }
            },
            vertexShader,
            fragmentShader,
            side: BackSide
        });
        
        // Create skybox mesh
        const geometry = new BoxGeometry(1000, 1000, 1000);
        this.skyboxMesh = new Mesh(geometry, material);
        
        // Add to scene
        this.scene.add(this.skyboxMesh);
    }
    
    clear() {
        if (this.skyboxMesh) {
            this.scene.remove(this.skyboxMesh);
            
            if (this.skyboxMesh.geometry) {
                this.skyboxMesh.geometry.dispose();
            }
            
            if (this.skyboxMesh.material) {
                if (Array.isArray(this.skyboxMesh.material)) {
                    this.skyboxMesh.material.forEach(m => m.dispose());
                } else {
                    this.skyboxMesh.material.dispose();
                }
            }
            
            this.skyboxMesh = null;
        }
    }
}