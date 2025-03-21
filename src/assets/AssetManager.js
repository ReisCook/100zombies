// src/assets/AssetManager.js
import { TextureLoader, AudioLoader, LoadingManager, AnimationClip } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class AssetManager {
    constructor() {
        // Loading manager for tracking progress
        this.loadingManager = new LoadingManager();
        this.setupLoadingManager();
        
        // Asset collections
        this.textures = new Map();
        this.models = new Map();
        this.audio = new Map();
        this.jsonData = new Map();
        this.animations = new Map();
        
        // Active loading promises
        this.loadingPromises = new Map();
        
        // Loaders
        this.textureLoader = new TextureLoader(this.loadingManager);
        this.modelLoader = new GLTFLoader(this.loadingManager);
        this.fbxLoader = new FBXLoader(this.loadingManager);
        this.audioLoader = new AudioLoader(this.loadingManager);
        
        // Asset groups for organized loading/unloading
        this.assetGroups = new Map();
        
        // Loading state
        this.isLoading = false;
        this.loadingProgress = 0;
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }
    
    /**
     * Initialize the asset manager
     */
    async init() {
        // Register event listeners for loading events
        this.setupLoadingManager();
        
        console.log('Asset manager initialized');
        return true;
    }
    
    /**
     * Set up the loading manager
     */
    setupLoadingManager() {
        // Track loading progress
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            this.loadingProgress = itemsLoaded / itemsTotal;
            this.updateLoadingUI();
        };
        
        // Track loading completion
        this.loadingManager.onLoad = () => {
            this.isLoading = false;
            console.log('All assets loaded');
            this.hideLoadingUI();
        };
        
        // Track loading errors
        this.loadingManager.onError = (url) => {
            console.error(`Error loading asset: ${url}`);
        };
    }
    
    /**
     * Update the loading UI
     */
    updateLoadingUI() {
        const progressElement = document.querySelector('.progress');
        const loadingText = document.querySelector('.loading-text');
        
        if (progressElement) {
            progressElement.style.width = `${this.loadingProgress * 100}%`;
        }
        
        if (loadingText) {
            loadingText.textContent = `Loading assets... ${Math.floor(this.loadingProgress * 100)}%`;
        }
    }
    
    /**
     * Hide the loading UI
     */
    hideLoadingUI() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    /**
     * Register assets that belong to a group
     * @param {string} groupId - Group identifier
     * @param {Object} assets - Assets to register with the group
     */
    registerAssetGroup(groupId, assets) {
        if (!this.assetGroups.has(groupId)) {
            this.assetGroups.set(groupId, []);
        }
        
        const group = this.assetGroups.get(groupId);
        
        // Add textures
        if (assets.textures) {
            for (const textureId of assets.textures) {
                group.push({ type: 'texture', id: textureId });
            }
        }
        
        // Add models
        if (assets.models) {
            for (const modelId of assets.models) {
                group.push({ type: 'model', id: modelId });
            }
        }
        
        // Add audio
        if (assets.audio) {
            for (const audioId of assets.audio) {
                group.push({ type: 'audio', id: audioId });
            }
        }
        
        // Add JSON data
        if (assets.json) {
            for (const jsonId of assets.json) {
                group.push({ type: 'json', id: jsonId });
            }
        }
        
        // Add animations
        if (assets.animations) {
            for (const animId of assets.animations) {
                group.push({ type: 'animation', id: animId });
            }
        }
    }
    
    /**
     * Load all assets in a group
     * @param {string} groupId - Group identifier
     * @returns {Promise<boolean>} - Success status
     */
    async loadAssetGroup(groupId) {
        if (!this.assetGroups.has(groupId)) {
            console.warn(`Asset group not found: ${groupId}`);
            return false;
        }
        
        const group = this.assetGroups.get(groupId);
        const loadPromises = [];
        
        this.isLoading = true;
        this.totalAssets = group.length;
        this.loadedAssets = 0;
        
        for (const asset of group) {
            let promise = null;
            
            switch (asset.type) {
                case 'texture':
                    promise = this.loadTexture(asset.id, asset.path);
                    break;
                case 'model':
                    promise = this.loadModel(asset.id, asset.path);
                    break;
                case 'audio':
                    promise = this.loadAudio(asset.id, asset.path);
                    break;
                case 'json':
                    promise = this.loadJSON(asset.id, asset.path);
                    break;
                case 'animation':
                    promise = this.loadAnimation(asset.id, asset.path);
                    break;
            }
            
            if (promise) {
                loadPromises.push(promise);
            }
        }
        
        try {
            await Promise.all(loadPromises);
            return true;
        } catch (error) {
            console.error(`Error loading asset group ${groupId}:`, error);
            return false;
        }
    }
    
    /**
     * Unload assets in a group
     * @param {string} groupId - Group identifier
     */
    async unloadGroup(groupId) {
        if (!this.assetGroups.has(groupId)) {
            return;
        }
        
        const group = this.assetGroups.get(groupId);
        
        for (const asset of group) {
            switch (asset.type) {
                case 'texture':
                    this.unloadTexture(asset.id);
                    break;
                case 'model':
                    this.unloadModel(asset.id);
                    break;
                case 'audio':
                    this.unloadAudio(asset.id);
                    break;
                case 'json':
                    this.unloadJSON(asset.id);
                    break;
                case 'animation':
                    this.unloadAnimation(asset.id);
                    break;
            }
        }
    }
    
    /**
     * Load a texture
     * @param {string} id - Texture identifier
     * @param {string} path - Texture file path
     * @returns {Promise<THREE.Texture>} - Loaded texture
     */
    async loadTexture(id, path) {
        // Check if already loaded
        if (this.textures.has(id)) {
            return this.textures.get(id);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has('texture_' + id)) {
            return this.loadingPromises.get('texture_' + id);
        }
        
        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                (texture) => {
                    this.textures.set(id, texture);
                    this.loadingPromises.delete('texture_' + id);
                    this.loadedAssets++;
                    resolve(texture);
                },
                undefined,
                (error) => {
                    this.loadingPromises.delete('texture_' + id);
                    console.error(`Failed to load texture ${id} from ${path}:`, error);
                    reject(error);
                }
            );
        });
        
        // Store loading promise
        this.loadingPromises.set('texture_' + id, loadPromise);
        
        return loadPromise;
    }
    
    /**
     * Unload a texture
     * @param {string} id - Texture identifier
     */
    unloadTexture(id) {
        const texture = this.textures.get(id);
        if (texture) {
            texture.dispose();
            this.textures.delete(id);
        }
    }
    
    /**
     * Load a 3D model
     * @param {string} id - Model identifier
     * @param {string} path - Model file path
     * @returns {Promise<Object>} - Loaded model
     */
    async loadModel(id, path) {
        // Check if already loaded
        if (this.models.has(id)) {
            return this.models.get(id);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has('model_' + id)) {
            return this.loadingPromises.get('model_' + id);
        }
        
        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            this.modelLoader.load(
                path,
                (gltf) => {
                    this.models.set(id, gltf);
                    this.loadingPromises.delete('model_' + id);
                    this.loadedAssets++;
                    resolve(gltf);
                },
                undefined,
                (error) => {
                    this.loadingPromises.delete('model_' + id);
                    console.error(`Failed to load model ${id} from ${path}:`, error);
                    reject(error);
                }
            );
        });
        
        // Store loading promise
        this.loadingPromises.set('model_' + id, loadPromise);
        
        return loadPromise;
    }
    
    /**
     * Unload a model
     * @param {string} id - Model identifier
     */
    unloadModel(id) {
        const model = this.models.get(id);
        if (model) {
            // Dispose of geometries and materials
            model.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            
            this.models.delete(id);
        }
    }
    
    /**
     * Load an FBX model
     * @param {string} id - Model identifier
     * @param {string} path - Model file path
     * @returns {Promise<Object>} - Loaded model
     */
    async loadFBXModel(id, path) {
        // Check if already loaded
        if (this.models.has(id)) {
            return this.models.get(id);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has('model_' + id)) {
            return this.loadingPromises.get('model_' + id);
        }
        
        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            this.fbxLoader.load(
                path,
                (fbxObject) => {
                    this.models.set(id, fbxObject);
                    this.loadingPromises.delete('model_' + id);
                    this.loadedAssets++;
                    resolve(fbxObject);
                },
                undefined,
                (error) => {
                    this.loadingPromises.delete('model_' + id);
                    console.error(`Failed to load FBX model ${id} from ${path}:`, error);
                    reject(error);
                }
            );
        });
        
        // Store loading promise
        this.loadingPromises.set('model_' + id, loadPromise);
        
        return loadPromise;
    }
    
    /**
     * Load an animation from FBX file
     * @param {string} id - Animation identifier
     * @param {string} path - Animation file path
     * @returns {Promise<AnimationClip>} - Loaded animation clip
     */
    async loadAnimation(id, path) {
        // Check if already loaded
        if (this.animations.has(id)) {
            return this.animations.get(id);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has('animation_' + id)) {
            return this.loadingPromises.get('animation_' + id);
        }
        
        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            this.fbxLoader.load(
                path,
                (fbxObject) => {
                    if (fbxObject.animations && fbxObject.animations.length > 0) {
                        const animation = fbxObject.animations[0];
                        animation.name = id;
                        this.animations.set(id, animation);
                        this.loadingPromises.delete('animation_' + id);
                        this.loadedAssets++;
                        resolve(animation);
                    } else {
                        reject(new Error(`No animations found in ${path}`));
                    }
                },
                undefined,
                (error) => {
                    this.loadingPromises.delete('animation_' + id);
                    console.error(`Failed to load animation ${id} from ${path}:`, error);
                    reject(error);
                }
            );
        });
        
        // Store loading promise
        this.loadingPromises.set('animation_' + id, loadPromise);
        
        return loadPromise;
    }
    
    /**
     * Load an audio file
     * @param {string} id - Audio identifier
     * @param {string} path - Audio file path
     * @returns {Promise<AudioBuffer>} - Loaded audio buffer
     */
    async loadAudio(id, path) {
        // Check if already loaded
        if (this.audio.has(id)) {
            return this.audio.get(id);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has('audio_' + id)) {
            return this.loadingPromises.get('audio_' + id);
        }
        
        // Create loading promise
        const loadPromise = new Promise((resolve, reject) => {
            this.audioLoader.load(
                path,
                (buffer) => {
                    this.audio.set(id, buffer);
                    this.loadingPromises.delete('audio_' + id);
                    this.loadedAssets++;
                    resolve(buffer);
                },
                undefined,
                (error) => {
                    this.loadingPromises.delete('audio_' + id);
                    console.error(`Failed to load audio ${id} from ${path}:`, error);
                    reject(error);
                }
            );
        });
        
        // Store loading promise
        this.loadingPromises.set('audio_' + id, loadPromise);
        
        return loadPromise;
    }
    
    /**
     * Unload an audio buffer
     * @param {string} id - Audio identifier
     */
    unloadAudio(id) {
        // AudioBuffers don't need explicit disposal, just remove the reference
        this.audio.delete(id);
    }
    
    /**
     * Load a JSON data file
     * @param {string} id - JSON identifier
     * @param {string} path - JSON file path
     * @returns {Promise<Object>} - Loaded JSON data
     */
    async loadJSON(id, path) {
        // Check if already loaded
        if (this.jsonData.has(id)) {
            return this.jsonData.get(id);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has('json_' + id)) {
            return this.loadingPromises.get('json_' + id);
        }
        
        // Create loading promise
        const loadPromise = fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.jsonData.set(id, data);
                this.loadingPromises.delete('json_' + id);
                this.loadedAssets++;
                return data;
            })
            .catch(error => {
                this.loadingPromises.delete('json_' + id);
                console.error(`Failed to load JSON ${id} from ${path}:`, error);
                throw error;
            });
        
        // Store loading promise
        this.loadingPromises.set('json_' + id, loadPromise);
        
        return loadPromise;
    }
    
    /**
     * Unload JSON data
     * @param {string} id - JSON identifier
     */
    unloadJSON(id) {
        this.jsonData.delete(id);
    }
    
    /**
     * Unload animation data
     * @param {string} id - Animation identifier
     */
    unloadAnimation(id) {
        this.animations.delete(id);
    }
    
    /**
     * Get a loaded texture by ID
     * @param {string} id - Texture identifier
     * @returns {THREE.Texture|null} - Texture or null if not found
     */
    getTexture(id) {
        return this.textures.get(id) || null;
    }
    
    /**
     * Get a loaded model by ID
     * @param {string} id - Model identifier
     * @returns {Object|null} - Model or null if not found
     */
    getModel(id) {
        return this.models.get(id) || null;
    }
    
    /**
     * Get a loaded audio buffer by ID
     * @param {string} id - Audio identifier
     * @returns {AudioBuffer|null} - Audio buffer or null if not found
     */
    getAudio(id) {
        return this.audio.get(id) || null;
    }
    
    /**
     * Get loaded JSON data by ID
     * @param {string} id - JSON identifier
     * @returns {Object|null} - JSON data or null if not found
     */
    getJSON(id) {
        return this.jsonData.get(id) || null;
    }
    
    /**
     * Get a loaded animation by ID
     * @param {string} id - Animation identifier
     * @returns {AnimationClip|null} - Animation clip or null if not found
     */
    getAnimation(id) {
        return this.animations.get(id) || null;
    }
}