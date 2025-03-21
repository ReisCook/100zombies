// src/assets/ZombieAssetLoader.js
import { AnimationClip, Mesh, MeshStandardMaterial, Color, BoxGeometry } from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class ZombieAssetLoader {
    constructor(assetManager) {
        this.assetManager = assetManager;
        this.fbxLoader = new FBXLoader();
    }
    
    async loadZombieAssets() {
        try {
            console.log("Loading zombie assets...");
            
            // Use exact paths to your FBX files
            const modelPath = 'assets/models/zombie/zombie.fbx';
            console.log(`Attempting to load zombie model from: ${modelPath}`);
            
            const animationPaths = {
                'idle': 'assets/models/zombie/idle.fbx',
                'walk': 'assets/models/zombie/walk.fbx',
                'run': 'assets/models/zombie/run.fbx',
                'attack': 'assets/models/zombie/attack.fbx',
                'death': 'assets/models/zombie/death.fbx',
                'dying': 'assets/models/zombie/dying.fbx',
                'biting': 'assets/models/zombie/biting.fbx',
                'biting2': 'assets/models/zombie/biting2.fbx',
                'crawl': 'assets/models/zombie/crawl.fbx',
                'runningcrawl': 'assets/models/zombie/runningcrawl.fbx',
                'neckbite': 'assets/models/zombie/neckbite.fbx',
                'scream': 'assets/models/zombie/scream.fbx'
            };
            
            // Load the zombie model first
            console.log(`Beginning zombie model load from ${modelPath}`);
            const zombieModel = await this.loadFBXModel(modelPath);
            console.log(`Model loaded successfully:`, !!zombieModel);
            
            // CRITICAL: Process the model to ensure proper scale and visibility
            this.processZombieModel(zombieModel);
            
            // Store in asset manager
            this.assetManager.models.set('zombie', zombieModel);
            
            // Load animations
            console.log("Loading zombie animations...");
            
            for (const [animId, animPath] of Object.entries(animationPaths)) {
                await this.loadFBXAnimation(animPath, animId, zombieModel);
            }
            
            console.log("Zombie assets loaded successfully");
            return true;
        } catch (error) {
            console.error("Failed to load zombie assets:", error);
            return false;
        }
    }
    
    processZombieModel(model) {
        // Set proper scale - FBX models tend to be huge
        model.scale.set(0.01, 0.01, 0.01);
        
        // Ensure model is visible and has proper materials
        model.traverse(node => {
            if (node.isMesh) {
                // Enable shadows
                node.castShadow = true;
                node.receiveShadow = true;
                
                // Make sure all materials are visible
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material.forEach(mat => {
                            mat.transparent = false;
                            mat.opacity = 1.0;
                            mat.visible = true;
                            mat.needsUpdate = true;
                        });
                    } else {
                        node.material.transparent = false;
                        node.material.opacity = 1.0;
                        node.material.visible = true;
                        node.material.needsUpdate = true;
                    }
                }
            }
        });
        
        // Add a simple colored material if model has no visible meshes
        let hasMeshes = false;
        model.traverse(node => {
            if (node.isMesh) hasMeshes = true;
        });
        
        if (!hasMeshes) {
            // Create a simple mesh to represent the zombie if no meshes found
            const zombieMesh = new Mesh(
                new BoxGeometry(0.5, 1.5, 0.5),
                new MeshStandardMaterial({ color: new Color(0x00ff00) })
            );
            zombieMesh.position.y = 0.75;
            model.add(zombieMesh);
            console.warn("No meshes found in zombie model - added placeholder");
        }
        
        // Make sure the model is properly positioned
        model.position.set(0, 0, 0);
        
        // Log the model structure for debugging
        console.log("Zombie model structure:", this.getObjectHierarchy(model));
    }
    
    // Helper to visualize the model structure
    getObjectHierarchy(object, level = 0) {
        const indent = '  '.repeat(level);
        let result = `${indent}${object.name || 'unnamed'} (${object.type})`;
        
        if (object.children && object.children.length > 0) {
            result += ' {\n';
            object.children.forEach(child => {
                result += this.getObjectHierarchy(child, level + 1) + '\n';
            });
            result += indent + '}';
        }
        
        return result;
    }
    
    async loadFBXModel(path) {
        return new Promise((resolve, reject) => {
            this.fbxLoader.load(
                path,
                (fbxModel) => {
                    console.log(`FBX model loaded: ${path}`);
                    resolve(fbxModel);
                },
                undefined, // onProgress callback
                (error) => {
                    console.error(`Error loading FBX model ${path}:`, error);
                    reject(error);
                }
            );
        });
    }
    
    async loadFBXAnimation(path, animId) {
        try {
            const fbxData = await new Promise((resolve, reject) => {
                this.fbxLoader.load(path, resolve, undefined, reject);
            });
            
            if (fbxData.animations && fbxData.animations.length > 0) {
                const anim = fbxData.animations[0];
                
                // Set the animation ID as the name
                anim.name = animId;
                
                // Process the animation to ensure compatibility
                // This is critical for proper retargeting
                anim.tracks = anim.tracks.filter(track => {
                    // Keep only valid tracks that match bone naming patterns
                    return track.name.includes('.quaternion') || 
                           track.name.includes('.position') || 
                           track.name.includes('.scale');
                });
                
                // Store in asset manager
                this.assetManager.animations.set(animId, anim);
                console.log(`Animation loaded: ${animId}`);
                
                return anim;
            } else {
                console.warn(`No animations found in ${path}`);
                return null;
            }
        } catch (error) {
            console.error(`Failed to load animation ${animId} from ${path}:`, error);
            return null;
        }
    }
}
