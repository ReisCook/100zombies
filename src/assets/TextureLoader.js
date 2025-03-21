// src/assets/TextureLoader.js
import { TextureLoader as ThreeTextureLoader, LinearFilter, NearestFilter } from 'three';

export class TextureLoader {
    constructor() {
        this.loader = new ThreeTextureLoader();
        this.textureCache = new Map();
    }
    
    async load(path, options = {}) {
        // Check if texture is already loaded
        if (this.textureCache.has(path)) {
            return this.textureCache.get(path);
        }
        
        // Set default options
        const config = {
            anisotropy: 4,
            filtering: 'linear', // 'linear' or 'nearest'
            ...options
        };
        
        // Load texture
        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (texture) => {
                    // Configure texture
                    texture.anisotropy = config.anisotropy;
                    
                    // Set filtering
                    if (config.filtering === 'nearest') {
                        texture.minFilter = NearestFilter;
                        texture.magFilter = NearestFilter;
                    } else {
                        texture.minFilter = LinearFilter;
                        texture.magFilter = LinearFilter;
                    }
                    
                    // Cache the texture
                    this.textureCache.set(path, texture);
                    
                    resolve(texture);
                },
                undefined, // onProgress not implemented
                (error) => {
                    console.error(`Error loading texture ${path}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    clear() {
        this.textureCache.forEach(texture => {
            texture.dispose();
        });
        this.textureCache.clear();
    }
}