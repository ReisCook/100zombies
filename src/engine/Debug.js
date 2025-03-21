// src/engine/Debug.js
export class Debug {
    constructor(engine) {
        this.engine = engine;
        this.enabled = engine.config.debug;
        
        // DOM elements
        this.overlay = document.getElementById('debug-overlay');
        this.statsElement = document.getElementById('debug-stats');
        this.positionElement = document.getElementById('debug-position');
        this.velocityElement = document.getElementById('debug-velocity');
        this.fpsCounter = document.getElementById('fps-counter');
        
        // Performance metrics
        this.fps = 0;
        this.frameTime = 0;
        this.frames = 0;
        this.lastUpdate = 0;
        this.updateInterval = 500; // ms
        
        // Debug options
        this.wireframe = false;
        
        // Initialize button handlers
        this.initButtons();
    }
    
    enable() {
        this.enabled = true;
        this.overlay.classList.remove('hidden');
    }
    
    disable() {
        this.enabled = false;
        this.overlay.classList.add('hidden');
    }
    
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
    
    initButtons() {
        // Wireframe toggle
        document.getElementById('debug-toggle-wireframe')
            .addEventListener('click', () => {
                this.toggleWireframe();
            });
        
        // Physics debug toggle
        document.getElementById('debug-toggle-physics')
            .addEventListener('click', () => {
                this.togglePhysicsDebug();
            });
    }
    
    toggleWireframe() {
        this.wireframe = !this.wireframe;
        
        // Apply wireframe to all materials
        this.engine.renderer.scene.traverse(object => {
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => {
                        mat.wireframe = this.wireframe;
                    });
                } else {
                    object.material.wireframe = this.wireframe;
                }
            }
        });
    }
    
    togglePhysicsDebug() {
        this.engine.physics.debugDraw = !this.engine.physics.debugDraw;
    }
    
    update(deltaTime) {
        // Always update FPS counter, regardless of debug mode
        this.updateFPSCounter(deltaTime);
        
        if (!this.enabled) return;
        
        // Update performance stats
        this.frames++;
        this.frameTime += deltaTime;
        
        const now = performance.now();
        if (now - this.lastUpdate >= this.updateInterval) {
            this.fps = Math.round((this.frames * 1000) / (now - this.lastUpdate));
            this.frameTime = (this.frameTime / this.frames) * 1000; // Convert to ms
            
            this.lastUpdate = now;
            this.frames = 0;
            this.frameTime = 0;
            
            this.updateDebugDisplay();
        }
    }
    
    updateFPSCounter(deltaTime) {
        // More frequent updates for the FPS counter
        this.frames++;
        this.frameTime += deltaTime;
        
        const now = performance.now();
        if (now - this.lastUpdate >= 500) { // Update twice per second
            this.fps = Math.round((this.frames * 1000) / (now - this.lastUpdate));
            
            if (this.fpsCounter) {
                this.fpsCounter.textContent = `${this.fps} FPS`;
            }
            
            this.lastUpdate = now;
            this.frames = 0;
            this.frameTime = 0;
        }
    }
    
    updateDebugDisplay() {
        if (!this.enabled) return;
        
        // Update stats
        this.statsElement.innerHTML = `
            FPS: ${this.fps} <br>
            Frame Time: ${this.frameTime.toFixed(2)}ms <br>
            Objects: ${this.engine.renderer.scene.children.length} <br>
            Physics Bodies: ${this.engine.physics.bodies.length}
        `;
        
        // Update player position
        const pos = this.engine.player.position;
        this.positionElement.innerHTML = `
            Position: <br>
            X: ${pos.x.toFixed(2)} <br>
            Y: ${pos.y.toFixed(2)} <br>
            Z: ${pos.z.toFixed(2)}
        `;
        
        // Update player velocity
        const vel = this.engine.player.velocity;
        this.velocityElement.innerHTML = `
            Velocity: <br>
            X: ${vel.x.toFixed(2)} <br>
            Y: ${vel.y.toFixed(2)} <br>
            Z: ${vel.z.toFixed(2)} <br>
            Speed: ${vel.length().toFixed(2)} <br>
            On Ground: ${this.engine.player.onGround ? 'Yes' : 'No'}
        `;
    }
}